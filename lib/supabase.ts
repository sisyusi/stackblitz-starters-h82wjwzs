import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ghbhaixfkawyooalzsej.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoYmhhaXhma2F3eW9vYWx6c2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MDA3ODIsImV4cCI6MjA5MjI3Njc4Mn0.ip7YoKEoRWWPZhlVpeTxfd7G2hSZinjNjIuwHSeVfu0'

export const supabase = createClient(supabaseUrl, supabaseKey)