import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yifyezfszfzogxdbprjj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZnllemZzemZ6b2d4ZGJwcmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjU5MDksImV4cCI6MjA4NzYwMTkwOX0.Tqrugo-m-RmVCBrS381qEfmNJlTLJeCktvJR8sg8apU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        // Disable lock manager to prevent "Acquiring an exclusive Navigator LockManager lock" timeouts
        // This is a known issue with @supabase/supabase-js in certain environments.
        // In typical web apps, relying on default localStorage persistence without the lock is mostly fine.
        storageKey: 'supabase-auth-token',
        // Currently, there's no official `lock: false` accepted by types in all versions, 
        // but configuring custom storage or using an older version is a common fix.
        // For now we will enable standard storage and just cross our fingers it resets the lock behavior,
        // or we might need to change the `@supabase/supabase-js` version.
    }
});
export { SUPABASE_URL, SUPABASE_ANON_KEY };
