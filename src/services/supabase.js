import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { printLog } from "../scripts/output/log/log.js";

printLog("[Supabase] Initializing Supabase Client");

const supabase = createClient(
  "https://ajmdlsptdgbzhueadzup.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbWRsc3B0ZGdiemh1ZWFkenVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyNjM2ODIsImV4cCI6MjA4MjgzOTY4Mn0.c_4gpJmdkhWlYekCnxVIWhnMMdZnOH2JV5rPlTuue18"
);

export { supabase };
