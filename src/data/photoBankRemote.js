import { supabase } from '../lib/supabaseClient';

function rowToItem(row) {
  return {
    id: row.id,
    uri: row.uri,
    width: row.width,
    height: row.height,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export async function fetchPhotoBank(coupleId) {
  const { data, error } = await supabase
    .from('photo_bank')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(rowToItem);
}

export async function insertPhotoBankItem(coupleId, { uri, width, height }) {
  const { data, error } = await supabase
    .from('photo_bank')
    .insert({ couple_id: coupleId, uri, width, height })
    .select()
    .single();
  if (error) throw error;
  return rowToItem(data);
}

export async function deletePhotoBankItem(id) {
  const { error } = await supabase.from('photo_bank').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToPhotoBank(coupleId, { onInsert, onDelete }) {
  const channel = supabase
    .channel(`photo_bank:${coupleId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'photo_bank', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') onInsert(rowToItem(payload.new));
        else if (payload.eventType === 'DELETE') onDelete(payload.old.id);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
