import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yifyezfszfzogxdbprjj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZnllemZzemZ6b2d4ZGJwcmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjU5MDksImV4cCI6MjA4NzYwMTkwOX0.Tqrugo-m-RmVCBrS381qEfmNJlTLJeCktvJR8sg8apU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storageKey: 'warehouse-app-auth',
        // @ts-ignore - Bypass Navigator LockManager bug completely
        lock: async (name: string, acquire: () => Promise<any>) => {
            return await acquire();
        }
    }
});
export { SUPABASE_URL, SUPABASE_ANON_KEY };
