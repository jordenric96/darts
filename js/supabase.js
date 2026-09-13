// js/supabase.js

// De base URL uit je Supabase dashboard
const SUPABASE_URL = 'https://badovrzzxwbkxjgqkxjg.supabase.co';

// De volledige publishable API key
const SUPABASE_KEY = 'sb_publishable_qI0tAKHoKqgC1hn_oP6XzA_n3F61CbT'; 

// Initialiseer de Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Supabase client succesvol geladen!');
