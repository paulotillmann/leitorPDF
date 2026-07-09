import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ezdtifldhrmomkltgjvj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZHRpZmxkaHJtb21rbHRnanZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTU2MTIsImV4cCI6MjA5OTEzMTYxMn0.AcSNGgQ9fdFgk6_fzF5XYvWE-rqr0zawrqwh9iOH28E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
