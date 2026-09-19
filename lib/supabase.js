import { createClient } from '@supabase/supabase-js'

// Grab these keys from your Supabase Project Settings -> API
const SUPABASE_URL = 'https://gebanropfjvpzwvytxxn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlYmFucm9wZmp2cHp3dnl0eHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MDA5NDcsImV4cCI6MjEwNDk3Njk0N30.ZI1F4WJZDZTP_giHadFaSWph-80QY7VOGxb_bphscqU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)