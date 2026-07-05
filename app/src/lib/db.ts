import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Chapter, DatePlan } from '@/types';

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

// =========================================================================
// PUBLIC API - DYNAMIC CHAPTERS (ADVENTURES)
// =========================================================================
export const getChapters = async (): Promise<Chapter[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const local = localStorage.getItem('local-chapters');
    return local ? JSON.parse(local) : [];
  }

  const coupleId = await getCoupleId();
  if (!coupleId) return [];

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Gagal ambil chapters:', error.message);
    return [];
  }

  return (data || []).map((item: any, index: number) => ({
    id: item.id,
    month: index + 1,
    title: item.title,
    date: item.date,
    description: item.description,
    story: item.story,
    achievement: item.achievement,
    image: item.image_url,
    unlocked: true,
    completed: true,
  }));
};

export const getChapterById = async (id: number): Promise<Chapter | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const list = await getChapters();
    return list.find((c) => c.id === id) || null;
  }

  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;

  // Fetch all chapters to know the month index
  const list = await getChapters();
  const index = list.findIndex((c) => c.id === id);

  return {
    id: data.id,
    month: index !== -1 ? index + 1 : 1,
    title: data.title,
    date: data.date,
    description: data.description,
    story: data.story,
    achievement: data.achievement,
    image: data.image_url,
    unlocked: true,
    completed: true,
  };
};

export const addChapter = async (
  title: string,
  date: string,
  description: string,
  story: string,
  achievement: string,
  imageBlob: Blob
): Promise<Chapter> => {
  if (!isSupabaseConfigured() || !supabase) {
    const list = await getChapters();
    const id = Date.now();
    const newCh: Chapter = {
      id,
      month: list.length + 1,
      title,
      date,
      description,
      story,
      achievement,
      image: URL.createObjectURL(imageBlob),
      unlocked: true,
      completed: true,
    };
    localStorage.setItem('local-chapters', JSON.stringify([...list, newCh]));
    return newCh;
  }

  const coupleId = await getCoupleId();
  if (!coupleId) throw new Error('Couple tidak terhubung.');

  const fileExt = imageBlob.type.split('/')[1] || 'jpg';
  const idStr = `chapter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fileName = `couples/${coupleId}/chapters/${idStr}.${fileExt}`;

  // Upload image to Supabase Storage
  const { error: uploadError } = await supabase.storage.from('media').upload(fileName, imageBlob, {
    contentType: imageBlob.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw new Error(`Gagal upload gambar chapter: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  // Insert database record
  const { data, error: dbError } = await supabase
    .from('chapters')
    .insert([
      {
        couple_id: coupleId,
        title,
        date,
        description,
        story,
        achievement,
        image_url: publicUrl,
      },
    ])
    .select()
    .single();

  if (dbError || !data) throw new Error(`Gagal simpan data chapter: ${dbError?.message}`);

  const list = await getChapters();
  return {
    id: data.id,
    month: list.length,
    title: data.title,
    date: data.date,
    description: data.description,
    story: data.story,
    achievement: data.achievement,
    image: data.image_url,
    unlocked: true,
    completed: true,
  };
};

export const deleteChapter = async (id: number): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    const list = await getChapters();
    const updated = list.filter((c) => c.id !== id);
    localStorage.setItem('local-chapters', JSON.stringify(updated));
    return;
  }

  // Get chapter info first to delete storage file (optional, but good practice)
  const { data: ch } = await supabase.from('chapters').select('image_url').eq('id', id).maybeSingle();
  if (ch?.image_url) {
    const pathParts = ch.image_url.split('/media/');
    if (pathParts.length > 1) {
      const filePath = pathParts[1];
      await supabase.storage.from('media').remove([filePath]);
    }
  }

  const { error } = await supabase.from('chapters').delete().eq('id', id);
  if (error) throw new Error(`Gagal menghapus chapter: ${error.message}`);
};

// =========================================================================
// PUBLIC API - DYNAMIC LOVE LETTERS (DUA ARAH)
// =========================================================================
export const getLoveLetter = async (): Promise<{ myLetter: string; partnerLetter: string }> => {
  const defaultRes = { myLetter: '', partnerLetter: '' };

  if (!isSupabaseConfigured() || !supabase) {
    const local = localStorage.getItem('local-love-letter') || '';
    return { myLetter: local, partnerLetter: 'Fitur partner memerlukan koneksi cloud.' };
  }

  const userId = await getCurrentUserId();
  if (!userId) return defaultRes;

  const { data: couple } = await supabase
    .from('couples')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .maybeSingle();

  if (!couple) return defaultRes;

  const { data: letter } = await supabase
    .from('letters')
    .select('*')
    .eq('couple_id', couple.id)
    .maybeSingle();

  const isUserA = couple.user_a_id === userId;
  const myLetter = letter ? (isUserA ? letter.letter_text_a : letter.letter_text_b) : '';
  const partnerLetter = letter ? (isUserA ? letter.letter_text_b : letter.letter_text_a) : '';

  return {
    myLetter: myLetter || '',
    partnerLetter: partnerLetter || '',
  };
};

export const saveLoveLetter = async (letterText: string): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    localStorage.setItem('local-love-letter', letterText);
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId) return;

  const { data: couple } = await supabase
    .from('couples')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .maybeSingle();

  if (!couple) return;

  const isUserA = couple.user_a_id === userId;
  const updatePayload: any = {
    couple_id: couple.id,
    updated_at: new Date().toISOString(),
  };

  if (isUserA) {
    updatePayload.letter_text_a = letterText;
  } else {
    updatePayload.letter_text_b = letterText;
  }

  const { error } = await supabase
    .from('letters')
    .upsert(updatePayload, { onConflict: 'couple_id' });

  if (error) {
    console.error('Gagal simpan surat cinta:', error.message);
    throw error;
  }
};

// =========================================================================
// PUBLIC API - DATE PLANS & MEMORY TRACKER
// =========================================================================
export const getDatePlans = async (): Promise<DatePlan[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const local = localStorage.getItem('local-date-plans');
    return local ? JSON.parse(local) : [];
  }

  const coupleId = await getCoupleId();
  if (!coupleId) return [];

  const { data, error } = await supabase
    .from('date_plans')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Gagal ambil rencana kencan:', error.message);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    couple_id: item.couple_id,
    title: item.title,
    date_time: item.date_time,
    location: item.location,
    activity: item.activity,
    notes: item.notes,
    status: item.status,
    created_at: item.created_at,
    created_by: item.created_by,
  }));
};

export const addDatePlan = async (
  title: string,
  dateTime: string,
  location: string,
  activity: string,
  notes?: string
): Promise<DatePlan> => {
  if (!isSupabaseConfigured() || !supabase) {
    const list = await getDatePlans();
    const id = Date.now();
    const newPlan: DatePlan = {
      id,
      couple_id: 'local',
      title,
      date_time: dateTime,
      location,
      activity,
      notes,
      status: 'planned',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('local-date-plans', JSON.stringify([newPlan, ...list]));
    return newPlan;
  }

  const coupleId = await getCoupleId();
  if (!coupleId) throw new Error('Couple tidak terhubung.');

  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('date_plans')
    .insert([
      {
        couple_id: coupleId,
        title,
        date_time: dateTime,
        location,
        activity,
        notes,
        status: 'planned',
        created_by: userId,
      },
    ])
    .select()
    .single();

  if (error || !data) throw new Error(`Gagal menyimpan rencana kencan: ${error?.message}`);

  return data as DatePlan;
};

export const updateDatePlanStatus = async (id: number, status: 'planned' | 'completed'): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    const list = await getDatePlans();
    const updated = list.map((p) => (p.id === id ? { ...p, status } : p));
    localStorage.setItem('local-date-plans', JSON.stringify(updated));
    return;
  }

  const { error } = await supabase
    .from('date_plans')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(`Gagal memperbarui status rencana: ${error.message}`);
};

export const deleteDatePlan = async (id: number): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    const list = await getDatePlans();
    const updated = list.filter((p) => p.id !== id);
    localStorage.setItem('local-date-plans', JSON.stringify(updated));
    return;
  }

  const { error } = await supabase
    .from('date_plans')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Gagal menghapus rencana kencan: ${error.message}`);
};

// =========================================================================
// PUBLIC API - REALTIME LOCATION TRACKER & GEOFENCING
// =========================================================================
export const updateLocation = async (latitude: number, longitude: number): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    localStorage.setItem('local-my-location', JSON.stringify({ latitude, longitude, time: new Date().toISOString() }));
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('profiles')
    .update({
      latitude,
      longitude,
      location_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Gagal update lokasi:', error.message);
  }
};

export const getPartnerLocation = async (): Promise<{ name: string; latitude: number; longitude: number; avatar_url: string | null; location_updated_at: string | null } | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const local = localStorage.getItem('local-partner-location');
    return local ? JSON.parse(local) : null;
  }

  const userId = await getCurrentUserId();
  if (!userId) return null;

  // Step 1: Find the couple row to determine partnerId
  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .not('connected_at', 'is', null)
    .maybeSingle();

  if (coupleError || !couple) return null;

  // Step 2: Determine partner's user ID
  const partnerId = couple.user_a_id === userId ? couple.user_b_id : couple.user_a_id;
  if (!partnerId) return null;

  // Step 3: Fetch partner's profile directly by their user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, latitude, longitude, avatar_url, location_updated_at')
    .eq('id', partnerId)
    .maybeSingle();

  if (profileError || !profile) return null;
  if (profile.latitude === null || profile.longitude === null) return null;

  return {
    name: profile.name,
    latitude: profile.latitude,
    longitude: profile.longitude,
    avatar_url: profile.avatar_url,
    location_updated_at: profile.location_updated_at,
  };
};

export const getGeofences = async (): Promise<any[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const local = localStorage.getItem('local-geofences');
    return local ? JSON.parse(local) : [];
  }

  const coupleId = await getCoupleId();
  if (!coupleId) return [];

  const { data, error } = await supabase
    .from('geofences')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Gagal ambil geofences:', error.message);
    return [];
  }

  return data || [];
};

export const addGeofence = async (name: string, latitude: number, longitude: number, radiusMeters = 100): Promise<any> => {
  if (!isSupabaseConfigured() || !supabase) {
    const list = await getGeofences();
    const newG = { id: Date.now(), name, latitude, longitude, radius_meters: radiusMeters, created_at: new Date().toISOString() };
    localStorage.setItem('local-geofences', JSON.stringify([newG, ...list]));
    return newG;
  }

  const coupleId = await getCoupleId();
  if (!coupleId) throw new Error('Couple tidak terhubung.');

  const { data, error } = await supabase
    .from('geofences')
    .insert([
      {
        couple_id: coupleId,
        name,
        latitude,
        longitude,
        radius_meters: radiusMeters,
      },
    ])
    .select()
    .single();

  if (error || !data) throw new Error(`Gagal menyimpan lokasi penting: ${error?.message}`);

  return data;
};

export const deleteGeofence = async (id: number): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    const list = await getGeofences();
    const updated = list.filter((g) => g.id !== id);
    localStorage.setItem('local-geofences', JSON.stringify(updated));
    return;
  }

  const { error } = await supabase
    .from('geofences')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Gagal menghapus lokasi penting: ${error.message}`);
};

export const logLocationEvent = async (geofenceName: string, eventType: 'arrived' | 'left'): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.log(`[Local Log] Event: ${eventType} at ${geofenceName}`);
    return;
  }

  const coupleId = await getCoupleId();
  if (!coupleId) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('location_logs')
    .insert([
      {
        couple_id: coupleId,
        profile_id: userId,
        geofence_name: geofenceName,
        event_type: eventType,
      },
    ]);

  if (error) {
    console.error('Gagal menyimpan log lokasi:', error.message);
  }
};

export const getLocationLogs = async (): Promise<any[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return [];
  }

  const coupleId = await getCoupleId();
  if (!coupleId) return [];

  const { data, error } = await supabase
    .from('location_logs')
    .select('*, profiles(name)')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Gagal mengambil log lokasi:', error.message);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    geofence_name: item.geofence_name,
    event_type: item.event_type,
    created_at: item.created_at,
    profile_name: item.profiles?.name || 'Pasangan',
  }));
};

// =========================================================================
// PUBLIC API - DAILY CHECK-IN & MOOD TRACKING
// =========================================================================
export interface MoodLog {
  id: string;
  mood: string;
  intensity: number;
  reason: string;
  created_at: string;
  user_id?: string;
}

export const saveMoodLog = async (mood: string, intensity: number, reason: string): Promise<void> => {
  const log: MoodLog = {
    id: `mood-${Date.now()}`,
    mood,
    intensity,
    reason,
    created_at: new Date().toISOString()
  };

  const localList = localStorage.getItem('local-mood-logs');
  const list: MoodLog[] = localList ? JSON.parse(localList) : [];
  localStorage.setItem('local-mood-logs', JSON.stringify([log, ...list]));

  // Tambahkan XP RPG: +15 Intimacy XP untuk Check-In harian
  await addRelationshipXP(15, 'intimacy');

  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const coupleId = await getCoupleId();
    const userId = await getCurrentUserId();
    if (!coupleId || !userId) return;

    const { error } = await supabase.from('mood_logs').insert([
      {
        couple_id: coupleId,
        user_id: userId,
        mood,
        intensity,
        reason,
      }
    ]);
    if (error) console.error('Gagal simpan mood log ke Supabase:', error.message);
  } catch (err) {
    console.warn('[db] Gagal simpan mood log ke Supabase:', err);
  }
};

export const getMoodLogs = async (): Promise<MoodLog[]> => {
  const localList = localStorage.getItem('local-mood-logs');
  const local: MoodLog[] = localList ? JSON.parse(localList) : [];

  if (!isSupabaseConfigured() || !supabase) {
    return local;
  }

  try {
    const coupleId = await getCoupleId();
    if (!coupleId) return local;

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return local;
    }

    return data.map((item: any) => ({
      id: item.id,
      mood: item.mood,
      intensity: item.intensity,
      reason: item.reason,
      created_at: item.created_at,
      user_id: item.user_id
    }));
  } catch (err) {
    console.warn('[db] Gagal ambil mood logs dari Supabase, menggunakan lokal:', err);
    return local;
  }
};

export const saveMoodLogForDate = async (dateStr: string, mood: string, intensity: number, reason: string): Promise<void> => {
  const checkinDate = new Date(dateStr + 'T12:00:00');
  const localListStr = localStorage.getItem('local-mood-logs');
  const localList: MoodLog[] = localListStr ? JSON.parse(localListStr) : [];
  
  const existingLocalIndex = localList.findIndex(log => {
    const logDate = new Date(log.created_at);
    const logDateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
    return logDateStr === dateStr;
  });
  
  const isNewCheckin = existingLocalIndex === -1;
  const userId = await getCurrentUserId() || 'me';
  
  if (!isNewCheckin) {
    localList[existingLocalIndex].mood = mood;
    localList[existingLocalIndex].intensity = intensity;
    localList[existingLocalIndex].reason = reason;
  } else {
    const newLog: MoodLog = {
      id: `mood-${Date.now()}`,
      mood,
      intensity,
      reason,
      created_at: checkinDate.toISOString(),
      user_id: userId
    };
    localList.unshift(newLog);
  }
  
  localStorage.setItem('local-mood-logs', JSON.stringify(localList));
  
  if (isNewCheckin) {
    await addRelationshipXP(15, 'intimacy');
  }
  
  if (!isSupabaseConfigured() || !supabase) return;
  
  try {
    const coupleId = await getCoupleId();
    const userId = await getCurrentUserId();
    if (!coupleId || !userId) return;
    
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;
    
    const { data: existingLogs, error: searchError } = await supabase
      .from('mood_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);
      
    if (searchError) throw searchError;
    
    if (existingLogs && existingLogs.length > 0) {
      const { error: updateError } = await supabase
        .from('mood_logs')
        .update({
          mood,
          intensity,
          reason
        })
        .eq('id', existingLogs[0].id);
        
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('mood_logs')
        .insert([
          {
            couple_id: coupleId,
            user_id: userId,
            mood,
            intensity,
            reason,
            created_at: checkinDate.toISOString()
          }
        ]);
        
      if (insertError) throw insertError;
    }
  } catch (err) {
    console.warn('[db] Gagal simpan/update mood log ke Supabase:', err);
  }
};

export const deleteMoodLogForDate = async (dateStr: string): Promise<void> => {
  const localListStr = localStorage.getItem('local-mood-logs');
  const localList: MoodLog[] = localListStr ? JSON.parse(localListStr) : [];
  
  const updatedList = localList.filter(log => {
    const logDate = new Date(log.created_at);
    const logDateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`;
    return logDateStr !== dateStr;
  });
  
  localStorage.setItem('local-mood-logs', JSON.stringify(updatedList));
  
  if (!isSupabaseConfigured() || !supabase) return;
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    
    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;
    
    const { error } = await supabase
      .from('mood_logs')
      .delete()
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);
      
    if (error) throw error;
  } catch (err) {
    console.warn('[db] Gagal hapus mood log dari Supabase:', err);
  }
};

// =========================================================================
// PUBLIC API - REALTIME COUPLE CHAT
// =========================================================================
export interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

export const getChatMessages = async (): Promise<ChatMessage[]> => {
  const localVal = localStorage.getItem('local-chat-messages');
  const local: ChatMessage[] = localVal ? JSON.parse(localVal) : [];

  if (!isSupabaseConfigured() || !supabase) {
    return local;
  }

  try {
    const coupleId = await getCoupleId();
    if (!coupleId) return local;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true });

    if (error || !data) return local;

    return data.map((item: any) => ({
      id: item.id,
      sender_id: item.sender_id,
      message: item.message,
      created_at: item.created_at
    }));
  } catch (err) {
    console.warn('[db] Gagal ambil chat dari Supabase:', err);
    return local;
  }
};

export const saveChatMessage = async (messageText: string): Promise<ChatMessage> => {
  const userId = await getCurrentUserId() || 'me';
  const chat: ChatMessage = {
    id: `chat-${Date.now()}`,
    sender_id: userId,
    message: messageText,
    created_at: new Date().toISOString()
  };

  const localVal = localStorage.getItem('local-chat-messages');
  const list: ChatMessage[] = localVal ? JSON.parse(localVal) : [];
  localStorage.setItem('local-chat-messages', JSON.stringify([...list, chat]));

  // Tambahkan XP RPG: +2 Trust XP untuk berbalas pesan
  await addRelationshipXP(2, 'trust');

  if (!isSupabaseConfigured() || !supabase) return chat;

  try {
    const coupleId = await getCoupleId();
    if (!coupleId) return chat;

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          couple_id: coupleId,
          sender_id: userId,
          message: messageText
        }
      ])
      .select()
      .single();

    if (error || !data) throw new Error(error?.message);

    return {
      id: data.id,
      sender_id: data.sender_id,
      message: data.message,
      created_at: data.created_at
    };
  } catch (err) {
    console.warn('[db] Gagal kirim chat ke Supabase:', err);
    return chat;
  }
};

// =========================================================================
// PUBLIC API - REALTIME RICH STATUS & PRIVACY CONTROLS
// =========================================================================
export interface RichStatus {
  battery_level?: number;
  is_charging?: boolean;
  current_activity?: string;
  online_status?: string;
  latitude?: number;
  longitude?: number;
}

export const updateRichStatus = async (status: RichStatus): Promise<void> => {
  localStorage.setItem('local-my-rich-status', JSON.stringify({ ...status, updated_at: new Date().toISOString() }));

  if (!isSupabaseConfigured() || !supabase) return;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const payload: any = {
      ...status,
      location_updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) console.error('Gagal update rich status ke Supabase:', error.message);
  } catch (err) {
    console.warn('[db] Gagal update rich status ke Supabase:', err);
  }
};

export const getPartnerRichStatus = async (): Promise<any | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const local = localStorage.getItem('local-partner-rich-status');
    return local ? JSON.parse(local) : null;
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('user_a_id, user_b_id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .not('connected_at', 'is', null)
      .maybeSingle();

    if (coupleError || !couple) return null;

    const partnerId = couple.user_a_id === userId ? couple.user_b_id : couple.user_a_id;
    if (!partnerId) return null;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, battery_level, is_charging, current_activity, online_status, latitude, longitude, location_updated_at')
      .eq('id', partnerId)
      .maybeSingle();

    if (profileError || !profile) return null;

    return profile;
  } catch (err) {
    console.warn('[db] Gagal ambil partner rich status:', err);
    return null;
  }
};

// =========================================================================
// PUBLIC API - RPG STATS & RELATIONSHIP GROWTH (XP / LEVEL)
// =========================================================================
export interface RPGStats {
  level: number;
  xp: number;
  trust_xp: number;
  intimacy_xp: number;
}

const DEFAULT_RPG_STATS: RPGStats = {
  level: 1,
  xp: 0,
  trust_xp: 0,
  intimacy_xp: 0
};

export const getRPGStats = async (): Promise<RPGStats> => {
  const localVal = localStorage.getItem('local-rpg-stats');
  const localStats: RPGStats = localVal ? JSON.parse(localVal) : DEFAULT_RPG_STATS;

  if (!isSupabaseConfigured() || !supabase) {
    return localStats;
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) return localStats;

    const { data, error } = await supabase
      .from('profiles')
      .select('level, xp, trust_xp, intimacy_xp')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data || data.level === null) {
      return localStats;
    }

    return {
      level: data.level ?? 1,
      xp: data.xp ?? 0,
      trust_xp: data.trust_xp ?? 0,
      intimacy_xp: data.intimacy_xp ?? 0,
    };
  } catch (err) {
    console.warn('[db] Gagal mengambil RPG stats dari Supabase, menggunakan lokal:', err);
    return localStats;
  }
};

export const addRelationshipXP = async (xpToAdd: number, type: 'intimacy' | 'trust'): Promise<RPGStats> => {
  const current = await getRPGStats();
  let newXp = current.xp + xpToAdd;
  let newLevel = current.level;
  let newIntimacy = current.intimacy_xp + (type === 'intimacy' ? xpToAdd : 0);
  let newTrust = current.trust_xp + (type === 'trust' ? xpToAdd : 0);

  // Setiap 100 XP naik 1 level
  while (newXp >= 100) {
    newXp -= 100;
    newLevel += 1;
  }

  const updated: RPGStats = {
    level: newLevel,
    xp: newXp,
    trust_xp: newTrust,
    intimacy_xp: newIntimacy
  };

  localStorage.setItem('local-rpg-stats', JSON.stringify(updated));

  if (isSupabaseConfigured() && supabase) {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        await supabase
          .from('profiles')
          .update({
            level: newLevel,
            xp: newXp,
            trust_xp: newTrust,
            intimacy_xp: newIntimacy,
          })
          .eq('id', userId);
      }
    } catch (err) {
      console.warn('[db] Gagal sinkronisasi RPG stats ke Supabase:', err);
    }
  }

  return updated;
};

