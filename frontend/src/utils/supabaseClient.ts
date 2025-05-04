import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "./supabaseConfig";

// Initialize the Supabase client
// We use the Anon key here, which is safe for browser exposure.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Example of how to use the client in components/pages:
// import { supabase } from 'utils/supabaseClient';
// const { data, error } = await supabase.from('your_table').select('*');
