import { VideoItem, OfflineBlobRecord, UserComment } from '../types/video';
import { normalizeVideoUrl } from '../utils/urlParser';

const DB_NAME = 'snip_tok_offline_db';
const DB_VERSION = 1;

const STORES = {
  OFFLINE_BLOBS: 'offline_blobs',
  CUSTOM_VIDEOS: 'custom_videos',
  COMMENTS: 'user_comments',
  INTERACTIONS: 'user_interactions',
};

// Singleton IndexedDB Promise
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.OFFLINE_BLOBS)) {
        db.createObjectStore(STORES.OFFLINE_BLOBS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.CUSTOM_VIDEOS)) {
        db.createObjectStore(STORES.CUSTOM_VIDEOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.COMMENTS)) {
        const commentStore = db.createObjectStore(STORES.COMMENTS, { keyPath: 'id' });
        commentStore.createIndex('videoId', 'videoId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.INTERACTIONS)) {
        db.createObjectStore(STORES.INTERACTIONS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Map of active Object URLs to prevent memory leak
const blobUrlCache = new Map<string, string>();

/**
 * Downloads a video from URL and persists its blob to IndexedDB
 */
export async function downloadVideoToOffline(
  video: VideoItem,
  onProgress?: (percent: number) => void
): Promise<void> {
  const db = await getDB();

  // If this is a blob or already in IndexedDB, fetch it or duplicate it
  let blob: Blob;

  try {
    const streamUrl = normalizeVideoUrl(video.videoUrl);
    const response = await fetch(streamUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body || totalBytes === 0) {
      blob = await response.blob();
      if (onProgress) onProgress(100);
    } else {
      const reader = response.body.getReader();
      let receivedBytes = 0;
      const chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          if (onProgress) {
            const pct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
            onProgress(pct);
          }
        }
      }

      blob = new Blob(chunks, { type: response.headers.get('content-type') || 'video/mp4' });
      if (onProgress) onProgress(100);
    }
  } catch (err) {
    // If CORS fails on direct fetch (some external links), try to handle or propagate
    console.error('Fetch error during offline download:', err);
    throw new Error('ভিডিও ডাউনলোড করতে সমস্যা হয়েছে। দয়া করে ভিডিও সোর্স চেক করুন।');
  }

  const record: OfflineBlobRecord = {
    id: video.id,
    blob,
    mimeType: blob.type || 'video/mp4',
    size: blob.size,
    downloadedAt: Date.now(),
    title: video.title,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OFFLINE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORES.OFFLINE_BLOBS);
    const req = store.put(record);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save user custom video blob & metadata directly
 */
export async function saveCustomUploadedVideo(
  video: VideoItem,
  videoBlob?: Blob
): Promise<void> {
  const db = await getDB();
  const hasValidBlob = Boolean(videoBlob && videoBlob.size > 0);

  return new Promise((resolve, reject) => {
    const storesToOpen = hasValidBlob
      ? [STORES.OFFLINE_BLOBS, STORES.CUSTOM_VIDEOS]
      : [STORES.CUSTOM_VIDEOS];

    const tx = db.transaction(storesToOpen, 'readwrite');

    if (hasValidBlob && videoBlob) {
      const record: OfflineBlobRecord = {
        id: video.id,
        blob: videoBlob,
        mimeType: videoBlob.type || 'video/mp4',
        size: videoBlob.size,
        downloadedAt: Date.now(),
        title: video.title,
      };
      tx.objectStore(STORES.OFFLINE_BLOBS).put(record);
    }

    tx.objectStore(STORES.CUSTOM_VIDEOS).put(video);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Check if a video is stored offline
 */
export async function isVideoOffline(videoId: string): Promise<boolean> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.OFFLINE_BLOBS, 'readonly');
    const store = tx.objectStore(STORES.OFFLINE_BLOBS);
    const req = store.get(videoId);

    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });
}

/**
 * Get all offline video IDs
 */
export async function getOfflineVideoIds(): Promise<string[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OFFLINE_BLOBS, 'readonly');
    const store = tx.objectStore(STORES.OFFLINE_BLOBS);
    const req = store.getAllKeys();

    req.onsuccess = () => resolve((req.result as string[]) || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve blob for video and return an ObjectURL for seamless offline video element playback
 */
export async function getOfflineVideoUrl(videoId: string): Promise<string | null> {
  if (blobUrlCache.has(videoId)) {
    return blobUrlCache.get(videoId)!;
  }

  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.OFFLINE_BLOBS, 'readonly');
    const store = tx.objectStore(STORES.OFFLINE_BLOBS);
    const req = store.get(videoId);

    req.onsuccess = () => {
      const record = req.result as OfflineBlobRecord | undefined;
      if (record && record.blob) {
        const objectUrl = URL.createObjectURL(record.blob);
        blobUrlCache.set(videoId, objectUrl);
        resolve(objectUrl);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

/**
 * Delete a single video from offline storage
 */
export async function removeVideoFromOffline(videoId: string): Promise<void> {
  // Revoke object URL
  if (blobUrlCache.has(videoId)) {
    URL.revokeObjectURL(blobUrlCache.get(videoId)!);
    blobUrlCache.delete(videoId);
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OFFLINE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORES.OFFLINE_BLOBS);
    const req = store.delete(videoId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Load all user custom uploaded videos metadata
 */
export async function getCustomVideos(): Promise<VideoItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CUSTOM_VIDEOS, 'readonly');
    const store = tx.objectStore(STORES.CUSTOM_VIDEOS);
    const req = store.getAll();

    req.onsuccess = () => resolve((req.result as VideoItem[]) || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a custom video permanently
 */
export async function deleteCustomVideo(videoId: string): Promise<void> {
  await removeVideoFromOffline(videoId);
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CUSTOM_VIDEOS, 'readwrite');
    const store = tx.objectStore(STORES.CUSTOM_VIDEOS);
    const req = store.delete(videoId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get offline storage usage stats
 */
export async function getOfflineStorageStats(): Promise<{
  totalBytes: number;
  count: number;
  videos: { id: string; title: string; size: number; downloadedAt: number }[];
}> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OFFLINE_BLOBS, 'readonly');
    const store = tx.objectStore(STORES.OFFLINE_BLOBS);
    const req = store.getAll();

    req.onsuccess = () => {
      const records = (req.result as OfflineBlobRecord[]) || [];
      let totalBytes = 0;
      const videos = records.map((r) => {
        totalBytes += r.size || 0;
        return {
          id: r.id,
          title: r.title || 'অজানা ভিডিও',
          size: r.size || 0,
          downloadedAt: r.downloadedAt || Date.now(),
        };
      });
      resolve({ totalBytes, count: records.length, videos });
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clear all offline videos
 */
export async function clearAllOfflineVideos(): Promise<void> {
  blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
  blobUrlCache.clear();

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.OFFLINE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORES.OFFLINE_BLOBS);
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * User comments and interactions helpers
 */
export async function addComment(comment: UserComment): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.COMMENTS, 'readwrite');
    tx.objectStore(STORES.COMMENTS).put(comment);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCommentsForVideo(videoId: string): Promise<UserComment[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.COMMENTS, 'readonly');
    const store = tx.objectStore(STORES.COMMENTS);
    const index = store.index('videoId');
    const req = index.getAll(videoId);
    req.onsuccess = () => resolve((req.result as UserComment[]) || []);
    req.onerror = () => resolve([]);
  });
}
