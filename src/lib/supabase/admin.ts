import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  "https://rutyuqukayhxrmmqzftt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dHl1cXVrYXloeHJtbXF6ZnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTAwNjcsImV4cCI6MjA5MDE4NjA2N30.0l7O5n24HjoJUObqmCx1-aX1aLbEYJV5L1wb44oq5Gg"
);