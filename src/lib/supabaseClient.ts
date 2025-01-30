import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a client with the service role key for webhook operations
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey!);

// Regular client for user operations
export const supabase = createClient(supabaseUrl, supabaseKey);