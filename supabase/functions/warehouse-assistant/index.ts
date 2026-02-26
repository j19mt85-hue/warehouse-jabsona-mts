const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Log request method for visibility in Supabase logs
  console.log(`Request method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', info: 'ai-chat function is active' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    console.log(`Calling Gemini API for ${contents.length} messages...`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: "შენ ხარ საწყობის მართვის AI ასისტენტი. ეხმარები მომხმარებელს საწყობის მენეჯმენტში, პროდუქციის აღრიცხვაში, გაყიდვებსა და შესყიდვებში. პასუხი გაეცი ქართულად. იყავი მოკლე და ზუსტი." }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Gemini API Error (${response.status}):`, errorData);
      return new Response(JSON.stringify({ error: "Gemini API Error", details: errorData }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("Raw Gemini Response:", JSON.stringify(data));

    if (data.promptFeedback?.blockReason) {
      return new Response(JSON.stringify({ error: `Content blocked: ${data.promptFeedback.blockReason}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "პასუხი ვერ მოიძებნა (Empty Response)";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Internal Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
