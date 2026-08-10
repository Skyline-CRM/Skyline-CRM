import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kzwogkhubvyrqbnqcycp.supabase.co";
const supabaseKey = "sb_publishable_eu6YvqUgHJgzNmtvDWntIg_r0tIm8fV";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

window.supabaseClient = supabase;