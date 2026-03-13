import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  // In the minimal backend we throw early so misconfiguration is obvious.
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

