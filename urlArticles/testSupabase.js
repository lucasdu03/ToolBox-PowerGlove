import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '../key.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const { data, error } = await supabase.from('articlesUrl').select('*').limit(1);
console.log('DATA :', data);
console.log('ERROR :', error);