import { supabase, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'LovestoryDB';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';
const SONG_STORE = 'songs';

export interface DBPhoto {
  id: string;
  blob?: Blob;
  caption: string;
  category: 'date' | 'travel' | 'food' | 'selfie';
  src: string;
}

export interface DBSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  blob?: Blob;
  src: string;
}

let dbInstance: IDBDatabase | null = null;

// =========================================================================
// INDEXEDDB LOCAL ENGINE (Fallback tanpa Supabase)
// =========================================================================
export const initDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { dbInstance = request.result; resolve(request.result); };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SONG_STORE)) db.createObjectStore(SONG_STORE, { keyPath: 'id' });
    };
  });
};

const addPhotoLocal = async (blob: Blob, caption: string, category: 'date' | 'travel' | 'food' | 'selfie'): Promise<DBPhoto> => {
  const db = await initDB();
  const id = `custom-photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    const req = tx.objectStore(PHOTO_STORE).add({ id, blob, caption, category });
    req.onsuccess = () => resolve({ id, caption, category, src: URL.createObjectURL(blob) });
    req.onerror = () => reject(req.error);
  });
};

const getPhotosLocal = async (): Promise<DBPhoto[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).map((item: any) => ({ ...item, src: URL.createObjectURL(item.blob) })));
    req.onerror = () => reject(req.error);
  });
};

const addSongLocal = async (blob: Blob, title: string, artist: string, duration: string): Promise<DBSong> => {
  const db = await initDB();
  const id = `custom-song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SONG_STORE, 'readwrite');
    const req = tx.objectStore(SONG_STORE).add({ id, blob, title, artist, duration });
    req.onsuccess = () => resolve({ id, title, artist, duration, src: URL.createObjectURL(blob) });
    req.onerror = () => reject(req.error);
  });
};

const getSongsLocal = async (): Promise<DBSong[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(SONG_STORE, 'readonly').objectStore(SONG_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).map((item: any) => ({ ...item, src: URL.createObjectURL(item.blob) })));
    req.onerror = () => reject(req.error);
  });
};

// =========================================================================
// CURRENT USER HELPER
// =========================================================================
const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

const getCoupleId = async (): Promise<string | null> => {
  if (!supabase) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from('couples')
    .select('id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .not('connected_at', 'is', null)
    .maybeSingle();

  return data?.id ?? null;
};

// =========================================================================
// PUBLIC API - PHOTOS
// =========================================================================
export const addPhoto = async (
  blob: Blob,
  caption: string,
  category: 'date' | 'travel' | 'food' | 'selfie'
): Promise<DBPhoto> => {
  if (!isSupabaseConfigured() || !supabase) {
    return addPhotoLocal(blob, caption, category);
  }

  const coupleId = await getCoupleId();
  if (!coupleId) {
    console.warn('[db] Tidak ada couple_id, fallback ke lokal');
    return addPhotoLocal(blob, caption, category);
  }

  const fileExt = blob.type.split('/')[1] || 'jpg';
  const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fileName = `couples/${coupleId}/photos/${id}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from('media').upload(fileName, blob, {
    contentType: blob.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw new Error(`Gagal upload foto: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await supabase.from('photos').insert([{ id, couple_id: coupleId, url: publicUrl, caption, category }]);
  if (dbError) throw new Error(`Gagal simpan metadata foto: ${dbError.message}`);

  return { id, caption, category, src: publicUrl };
};

export const getPhotos = async (): Promise<DBPhoto[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getPhotosLocal();
  }

  const coupleId = await getCoupleId();
  if (!coupleId) return getPhotosLocal();

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Gagal ambil foto dari Supabase:', error.message);
    return getPhotosLocal();
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    caption: item.caption,
    category: item.category,
    src: item.url,
  }));
};

// =========================================================================
// PUBLIC API - SONGS
// =========================================================================
export const addSong = async (
  blob: Blob,
  title: string,
  artist: string,
  duration: string
): Promise<DBSong> => {
  if (!isSupabaseConfigured() || !supabase) {
    return addSongLocal(blob, title, artist, duration);
  }

  const coupleId = await getCoupleId();
  if (!coupleId) {
    console.warn('[db] Tidak ada couple_id, fallback ke lokal');
    return addSongLocal(blob, title, artist, duration);
  }

  const fileExt = blob.type.split('/')[1] || 'mp3';
  const id = `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fileName = `couples/${coupleId}/songs/${id}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from('media').upload(fileName, blob, {
    contentType: blob.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw new Error(`Gagal upload lagu: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await supabase.from('songs').insert([{ id, couple_id: coupleId, url: publicUrl, title, artist, duration }]);
  if (dbError) throw new Error(`Gagal simpan metadata lagu: ${dbError.message}`);

  return { id, title, artist, duration, src: publicUrl };
};

export const getSongs = async (): Promise<DBSong[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getSongsLocal();
  }

  const coupleId = await getCoupleId();
  if (!coupleId) return getSongsLocal();

  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Gagal ambil lagu dari Supabase:', error.message);
    return getSongsLocal();
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    artist: item.artist,
    duration: item.duration,
    src: item.url,
  }));
};

// =========================================================================
// PUBLIC API - LETTER REPLY
// =========================================================================
export const saveLetterReply = async (replyText: string): Promise<void> => {
  localStorage.setItem('journey-reply-letter', replyText);

  if (!isSupabaseConfigured() || !supabase) return;

  const coupleId = await getCoupleId();
  if (!coupleId) return;

  const { error } = await supabase.from('replies').upsert(
    { id: `reply-${coupleId}`, couple_id: coupleId, reply_text: replyText, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (error) console.error('Gagal sync balasan surat:', error.message);
};

export const getLetterReply = async (): Promise<string> => {
  const local = localStorage.getItem('journey-reply-letter') || '';
  if (!isSupabaseConfigured() || !supabase) return local;

  const coupleId = await getCoupleId();
  if (!coupleId) return local;

  const { data, error } = await supabase
    .from('replies')
    .select('reply_text')
    .eq('couple_id', coupleId)
    .maybeSingle();

  if (error || !data) return local;

  if (data.reply_text) {
    localStorage.setItem('journey-reply-letter', data.reply_text);
    return data.reply_text;
  }
  return local;
};
