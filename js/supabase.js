// js/supabase.js

const SUPABASE_URL = 'https://badovrzzxwbkxjgqkxjg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qI0tAKHoKqgC1hn_oP6XzA_n3F61CbT'; 

// We noemen dit nu 'supabaseClient' in plaats van 'supabase' om conflicten te vermijden
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Supabase client succesvol geladen!');
