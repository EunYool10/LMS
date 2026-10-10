// IndexedDB Media Store for handling large video/audio blobs without exceeding localStorage quota

const DB_NAME = 'tdsnt_media_store_v1';
const STORE_NAME = 'media_files';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open media database'));
    };
  });

  return dbPromise;
}

export interface StoredMedia {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export const mediaStore = {
  /**
   * Save a video or file blob to IndexedDB
   */
  async saveMedia(id: string, file: Blob | File, name?: string): Promise<string> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record: StoredMedia = {
          id,
          blob: file,
          name: name || (file instanceof File ? file.name : `media_${id}`),
          type: file.type || 'video/mp4',
          size: file.size,
          createdAt: new Date().toISOString(),
        };

        const req = store.put(record);
        req.onsuccess = () => {
          resolve(`idb://${id}`);
        };
        req.onerror = () => {
          reject(req.error);
        };
      });
    } catch (err) {
      console.warn('Failed to save media in IndexedDB:', err);
      // Fallback to empty reference or let caller fallback
      return `idb://${id}`;
    }
  },

  /**
   * Retrieve a media blob by its key or id
   */
  async getMedia(idOrKey: string): Promise<StoredMedia | null> {
    const cleanId = idOrKey.replace(/^idb:\/\//, '');
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(cleanId);

        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => {
          reject(req.error);
        };
      });
    } catch (err) {
      console.warn('Failed to get media from IndexedDB:', err);
      return null;
    }
  },

  /**
   * Look up media by checking multiple potential keys (lessonId, videoId, filename)
   */
  async findMediaByAnyKey(keys: (string | undefined | null)[]): Promise<StoredMedia | null> {
    const validKeys = keys.filter((k): k is string => Boolean(k && k.trim()));
    for (const key of validKeys) {
      const media = await this.getMedia(key);
      if (media && media.blob) {
        return media;
      }
    }
    return null;
  },

  /**
   * Resolve any video URL (idb://, standard URL, YouTube URL, or clean empty)
   */
  async resolveMediaUrl(url: string | undefined, fallbackKeys?: (string | undefined | null)[]): Promise<string> {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      // If URL is empty, check fallback keys in IndexedDB
      if (fallbackKeys && fallbackKeys.length > 0) {
        const media = await this.findMediaByAnyKey(fallbackKeys);
        if (media && media.blob) {
          return URL.createObjectURL(media.blob);
        }
      }
      return '';
    }

    const trimmedUrl = url.trim();

    // If it's an IndexedDB reference
    if (trimmedUrl.startsWith('idb://')) {
      const media = await this.getMedia(trimmedUrl);
      if (media && media.blob) {
        return URL.createObjectURL(media.blob);
      }
      if (fallbackKeys && fallbackKeys.length > 0) {
        const fallbackMedia = await this.findMediaByAnyKey(fallbackKeys);
        if (fallbackMedia && fallbackMedia.blob) {
          return URL.createObjectURL(fallbackMedia.blob);
        }
      }
      return '';
    }

    return trimmedUrl;
  },

  /**
   * Delete media record
   */
  async deleteMedia(idOrKey: string): Promise<void> {
    const cleanId = idOrKey.replace(/^idb:\/\//, '');
    try {
      const db = await getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(cleanId);
    } catch (err) {
      console.warn('Failed to delete media from IndexedDB:', err);
    }
  },
};
