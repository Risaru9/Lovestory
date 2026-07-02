const DB_NAME = 'LovestoryDB';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';
const SONG_STORE = 'songs';

export interface DBPhoto {
  id: string;
  blob: Blob;
  caption: string;
  category: 'date' | 'travel' | 'food' | 'selfie';
  src?: string; // Generated at runtime
}

export interface DBSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  blob: Blob;
  src?: string; // Generated at runtime
}

let dbInstance: IDBDatabase | null = null;

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

export const addPhoto = async (
  blob: Blob,
  caption: string,
  category: 'date' | 'travel' | 'food' | 'selfie'
): Promise<DBPhoto> => {
  const db = await initDB();
  const id = `custom-photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const photoItem: DBPhoto = {
    id,
    blob,
    caption,
    category,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, 'readwrite');
    const store = transaction.objectStore(transaction.objectStoreNames[0] || PHOTO_STORE);
    const request = store.add(photoItem);

    request.onsuccess = () => {
      // Create blob URL for immediate runtime use
      photoItem.src = URL.createObjectURL(blob);
      resolve(photoItem);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const getPhotos = async (): Promise<DBPhoto[]> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, 'readonly');
    const store = transaction.objectStore(transaction.objectStoreNames[0] || PHOTO_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results: DBPhoto[] = request.result || [];
      // Generate runtime blob URLs
      const mapped = results.map((item) => ({
        ...item,
        src: URL.createObjectURL(item.blob),
      }));
      resolve(mapped);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const addSong = async (
  blob: Blob,
  title: string,
  artist: string,
  duration: string
): Promise<DBSong> => {
  const db = await initDB();
  const id = `custom-song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const songItem: DBSong = {
    id,
    title,
    artist,
    duration,
    blob,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONG_STORE, 'readwrite');
    const store = transaction.objectStore(transaction.objectStoreNames[0] || SONG_STORE);
    const request = store.add(songItem);

    request.onsuccess = () => {
      // Create blob URL for immediate runtime use
      songItem.src = URL.createObjectURL(blob);
      resolve(songItem);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const getSongs = async (): Promise<DBSong[]> => {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SONG_STORE, 'readonly');
    const store = transaction.objectStore(transaction.objectStoreNames[0] || SONG_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results: DBSong[] = request.result || [];
      // Generate runtime blob URLs
      const mapped = results.map((item) => ({
        ...item,
        src: URL.createObjectURL(item.blob),
      }));
      resolve(mapped);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};
