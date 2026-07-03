import { supabase, isSupabaseConfigured } from './supabaseClient';

const DB_NAME = 'LovestoryDB';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';
const SONG_STORE = 'songs';

export interface DBPhoto {
  id: string;
  blob?: Blob; // Optional when using Supabase
  caption: string;
  category: 'date' | 'travel' | 'food' | 'selfie';
  src: string;
}

export interface DBSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  blob?: Blob; // Optional when using Supabase
  src: string;
}

let dbInstance: IDBDatabase | null = null;

// =========================================================================
// INDEXEDDB LOCAL BACKUP ENGINE
// =========================================================================
export const initDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SONG_STORE)) {
        db.createObjectStore(SONG_STORE, { keyPath: 'id' });
      }
    };
  });
};

const addPhotoLocal = async (
  blob: Blob,
  caption: string,
  category: 'date' | 'travel' | 'food' | 'selfie'
): Promise<DBPhoto> => {
  const db = await initDB();
  const id = `custom-photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const photoItem = {
    id,
    blob,
    caption,
    category,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.add(photoItem);

    request.onsuccess = () => {
      resolve({
        id,
        caption,
        category,
        src: URL.createObjectURL(blob),
      });
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

const getPhotosLocal = async (): Promise<DBPhoto[]> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, 'readonly');
    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results: any[] = request.result || [];
      const mapped = results.map((item) => ({
        id: item.id,
        caption: item.caption,
        category: item.category,
        src: URL.createObjectURL(item.blob),
      }));
      resolve(mapped);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

const addSongLocal = async (
  blob: Blob,
  title: string,
  artist: string,
  duration: string
): Promise<DBSong> => {
  const db = await initDB();
  const id = `custom-song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const songItem = {
    id,
    title,
    artist,
    duration,
    blob,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONG_STORE, 'readwrite');
    const store = transaction.objectStore(SONG_STORE);
    const request = store.add(songItem);

    request.onsuccess = () => {
      resolve({
        id,
        title,
        artist,
        duration,
        src: URL.createObjectURL(blob),
      });
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

const getSongsLocal = async (): Promise<DBSong[]> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONG_STORE, 'readonly');
    const store = transaction.objectStore(SONG_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results: any[] = request.result || [];
      const mapped = results.map((item) => ({
        id: item.id,
        title: item.title,
        artist: item.artist,
        duration: item.duration,
        src: URL.createObjectURL(item.blob),
      }));
      resolve(mapped);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

// =========================================================================
// SUPABASE CLOUD HYBRID ENGINE
// =========================================================================

export const addPhoto = async (
  blob: Blob,
  caption: string,
  category: 'date' | 'travel' | 'food' | 'selfie'
): Promise<DBPhoto> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[LovestoryDB] Menggunakan IndexedDB Lokal untuk upload foto.');
    return addPhotoLocal(blob, caption, category);
  }

  console.log('[LovestoryDB] Menggunakan Supabase Cloud untuk upload foto.');
  const fileExt = blob.type.split('/')[1] || 'png';
  const id = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fileName = `${id}.${fileExt}`;

  // 1. Upload ke Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(fileName, blob, {
      contentType: blob.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Gagal mengunggah berkas ke storage: ${uploadError.message}`);
  }

  // 2. Ambil URL Publik
  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  // 3. Simpan baris data ke tabel PostgreSQL
  const { error: dbError } = await supabase.from('photos').insert([
    {
      id,
      caption,
      category,
      url: publicUrl,
    },
  ]);

  if (dbError) {
    throw new Error(`Gagal menyimpan data foto ke database: ${dbError.message}`);
  }

  return {
    id,
    caption,
    category,
    src: publicUrl,
  };
};

export const getPhotos = async (): Promise<DBPhoto[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getPhotosLocal();
  }

  console.log('[LovestoryDB] Memuat foto dari Supabase Cloud.');
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Gagal mengambil foto dari Supabase, kembali ke lokal:', error.message);
    return getPhotosLocal();
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    caption: item.caption,
    category: item.category,
    src: item.url,
  }));
};

export const addSong = async (
  blob: Blob,
  title: string,
  artist: string,
  duration: string
): Promise<DBSong> => {
  if (!isSupabaseConfigured() || !supabase) {
    console.log('[LovestoryDB] Menggunakan IndexedDB Lokal untuk upload lagu.');
    return addSongLocal(blob, title, artist, duration);
  }

  console.log('[LovestoryDB] Menggunakan Supabase Cloud untuk upload lagu.');
  const fileExt = blob.type.split('/')[1] || 'mp3';
  const id = `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const fileName = `${id}.${fileExt}`;

  // 1. Upload ke Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('songs')
    .upload(fileName, blob, {
      contentType: blob.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Gagal mengunggah berkas musik ke storage: ${uploadError.message}`);
  }

  // 2. Ambil URL Publik
  const { data: urlData } = supabase.storage.from('songs').getPublicUrl(fileName);
  const publicUrl = urlData.publicUrl;

  // 3. Simpan baris data ke tabel PostgreSQL
  const { error: dbError } = await supabase.from('songs').insert([
    {
      id,
      title,
      artist,
      duration,
      url: publicUrl,
    },
  ]);

  if (dbError) {
    throw new Error(`Gagal menyimpan data lagu ke database: ${dbError.message}`);
  }

  return {
    id,
    title,
    artist,
    duration,
    src: publicUrl,
  };
};

export const getSongs = async (): Promise<DBSong[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getSongsLocal();
  }

  console.log('[LovestoryDB] Memuat lagu dari Supabase Cloud.');
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Gagal mengambil lagu dari Supabase, kembali ke lokal:', error.message);
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
// SYNCHRONIZATION FOR LOVE LETTER REPLIES
// =========================================================================

export const saveLetterReply = async (replyText: string): Promise<void> => {
  // Selalu simpan di LocalStorage bawaan dulu
  localStorage.setItem('journey-reply-letter', replyText);

  if (!isSupabaseConfigured() || !supabase) {
    return;
  }

  try {
    console.log('[LovestoryDB] Menyinkronkan balasan surat ke Supabase Cloud.');
    // Kita gunakan ID tetap 'love-letter-reply' agar baris data selalu diperbarui (upsert)
    const { error } = await supabase.from('replies').upsert(
      {
        id: 'love-letter-reply',
        reply_text: replyText,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('Gagal sinkronisasi balasan surat ke cloud:', error.message);
    }
  } catch (err) {
    console.error('Koneksi database gagal:', err);
  }
};

export const getLetterReply = async (): Promise<string> => {
  const localReply = localStorage.getItem('journey-reply-letter') || '';

  if (!isSupabaseConfigured() || !supabase) {
    return localReply;
  }

  try {
    const { data, error } = await supabase
      .from('replies')
      .select('reply_text')
      .eq('id', 'love-letter-reply')
      .single();

    if (error) {
      // Jika data tidak ditemukan (kosong), itu normal
      if (error.code !== 'PGRST116') {
        console.error('Gagal membaca balasan surat dari cloud:', error.message);
      }
      return localReply;
    }

    if (data && data.reply_text) {
      // Sinkronkan ke local storage juga agar terbaru
      localStorage.setItem('journey-reply-letter', data.reply_text);
      return data.reply_text;
    }
  } catch (err) {
    console.error('Gagal mengambil balasan dari cloud:', err);
  }

  return localReply;
};
