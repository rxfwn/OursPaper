import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://ihltsejnntyizztqduor.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FzLJgNxhEvFyAOr_g1UUOw__pKDXsXp';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
