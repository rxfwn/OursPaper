import { supabase } from '../lib/supabaseClient';

export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signInData.session;
}

export async function getMyCoupleId() {
  const { data, error } = await supabase.from('couple_members').select('couple_id').maybeSingle();
  if (error) throw error;
  return data?.couple_id || null;
}

export async function createCouple() {
  const { data, error } = await supabase.rpc('create_couple').single();
  if (error) throw error;
  return { coupleId: data.couple_id, inviteCode: data.invite_code };
}

export async function joinCouple(code) {
  const { data, error } = await supabase.rpc('join_couple', { code });
  if (error) throw error;
  return data;
}

export async function getInviteCode(coupleId) {
  const { data, error } = await supabase.from('couples').select('invite_code').eq('id', coupleId).single();
  if (error) throw error;
  return data.invite_code;
}
