import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

type Message = { role: 'user' | 'assistant'; content: string };

export function AiChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('warehouse-assistant', {
        body: { messages: newMessages },
      });

      if (error) throw error;

      const reply = data?.choices?.[0]?.message?.content || data?.reply || 'პასუხი ვერ მოიძებნა';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      let errorMessage = 'შეცდომა: AI სერვისთან დაკავშირება ვერ მოხერხდა.';

      // Handle Supabase Functions error details
      if (err.context?.status) {
        errorMessage += ` (Status: ${err.context.status})`;
      } else if (err.message) {
        errorMessage += ` (${err.message})`;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="fixed bottom-20 right-5 z-50 w-80 sm:w-96 h-[28rem] flex flex-col shadow-2xl border animate-in slide-in-from-bottom-4 duration-200">
      <div className="p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <h3 className="font-semibold text-sm">AI ასისტენტი</h3>
        <p className="text-xs opacity-80">Gemini — საწყობის დამხმარე</p>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              გამარჯობა! 👋 მე ვარ თქვენი საწყობის AI ასისტენტი. დამისვით ნებისმიერი შეკითხვა.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
                }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="შეკითხვა..."
          disabled={isLoading}
          className="text-sm"
        />
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}
