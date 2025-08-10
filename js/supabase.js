// supabase.js
// Put this file in the same folder as your HTML files and include it AFTER the supabase-js SDK script.
(function () {
  const SUPABASE_URL = "https://zmjhandoqebokmehotxd.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptamhhbmRvcWVib2ttZWhvdHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MTgyMTMsImV4cCI6MjA3MDI5NDIxM30.nx3EA0Chzv-EYPL8AjspxoopKwvBBD8EOQPy7O26l6k";

  try {
    // expose as window.supabaseClient (safe)
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client initialized");
  } catch (e) {
    console.error("Failed to initialize Supabase client", e);
  }
})();