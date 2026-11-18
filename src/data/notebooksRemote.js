import { supabase } from '../lib/supabaseClient';

function rowToNotebook(row) {
  return {
    id: row.id,
    name: row.name,
    coverUri: row.cover_uri,
    coverTransform: row.cover_transform,
    spineUri: row.spine_uri,
    spineTransform: row.spine_transform,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    date: row.trip_date ? new Date(row.trip_date).getTime() : (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
    sortOrder: row.sort_order ?? (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
    lastPageIndex: row.last_page_index,
    pages: row.pages || [],
  };
}

function notebookToRow(notebook) {
  return {
    name: notebook.name,
    cover_uri: notebook.coverUri,
    cover_transform: notebook.coverTransform,
    spine_uri: notebook.spineUri,
    spine_transform: notebook.spineTransform,
    sort_order: notebook.sortOrder,
    trip_date: notebook.date ? new Date(notebook.date).toISOString() : null,
    last_page_index: notebook.lastPageIndex,
    pages: notebook.pages,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchNotebooks(coupleId) {
  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .eq('couple_id', coupleId)
    .order('sort_order', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data.map(rowToNotebook);
}

export async function insertNotebookRemote(coupleId, notebook) {
  const { data, error } = await supabase
    .from('notebooks')
    .insert({ ...notebookToRow(notebook), couple_id: coupleId })
    .select()
    .single();
  if (error) throw error;
  return rowToNotebook(data);
}

export async function updateNotebookRemote(id, notebook) {
  const { error } = await supabase.from('notebooks').update(notebookToRow(notebook)).eq('id', id);
  if (error) throw error;
}

export async function deleteNotebookRemote(id) {
  const { error } = await supabase.from('notebooks').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToNotebooks(coupleId, { onInsert, onUpdate, onDelete }) {
  const channel = supabase
    .channel(`notebooks:${coupleId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notebooks', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') onInsert(rowToNotebook(payload.new));
        else if (payload.eventType === 'UPDATE') onUpdate(rowToNotebook(payload.new));
        else if (payload.eventType === 'DELETE') onDelete(payload.old.id);
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function fetchCoupleSettings(coupleId) {
  const { data, error } = await supabase
    .from('couple_settings')
    .select('*')
    .eq('couple_id', coupleId)
    .maybeSingle();
  if (error) throw error;
  return { bgThemeIndex: data?.bg_theme_index ?? 0 };
}

export async function updateCoupleSettings(coupleId, { bgThemeIndex }) {
  const { error } = await supabase
    .from('couple_settings')
    .update({ bg_theme_index: bgThemeIndex })
    .eq('couple_id', coupleId);
  if (error) throw error;
}

export function subscribeToCoupleSettings(coupleId, onChange) {
  const channel = supabase
    .channel(`settings:${coupleId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'couple_settings', filter: `couple_id=eq.${coupleId}` },
      (payload) => {
        onChange({ bgThemeIndex: payload.new.bg_theme_index });
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
