import { VideoItem } from '../types/video';
import { INITIAL_VIDEOS } from '../data/defaultVideos';

const LOCAL_STORAGE_VIDEOS_KEY = 'sniptok_custom_videos_list';
const ADMIN_PASSWORD_FALLBACK = 'Ma44332211';

// Helpers for localStorage fallback on static hosts (like GitHub Pages)
function getLocalCustomVideos(): VideoItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VIDEOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomVideos(videos: VideoItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_VIDEOS_KEY, JSON.stringify(videos));
  } catch (err) {
    console.error('LocalStorage save error:', err);
  }
}

/**
 * Fetch all public videos.
 * Handles both backend server (AI Studio) and static hosting (GitHub Pages).
 */
export async function fetchPublicVideos(): Promise<VideoItem[]> {
  try {
    const res = await fetch('/api/videos');
    const contentType = res.headers.get('content-type') || '';

    // If response is HTML (like GitHub Pages 404 page), fall back to local storage
    if (!res.ok || !contentType.includes('application/json')) {
      const localCustom = getLocalCustomVideos();
      if (localCustom.length > 0) {
        const map = new Map<string, VideoItem>();
        localCustom.forEach((v) => map.set(v.id, v));
        INITIAL_VIDEOS.forEach((v) => {
          if (!map.has(v.id)) map.set(v.id, v);
        });
        return Array.from(map.values());
      }
      return INITIAL_VIDEOS;
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.videos) && data.videos.length > 0) {
      return data.videos;
    }
  } catch (err) {
    console.warn('Backend unavailable, using local and default videos:', err);
  }

  const localCustom = getLocalCustomVideos();
  if (localCustom.length > 0) {
    const map = new Map<string, VideoItem>();
    localCustom.forEach((v) => map.set(v.id, v));
    INITIAL_VIDEOS.forEach((v) => {
      if (!map.has(v.id)) map.set(v.id, v);
    });
    return Array.from(map.values());
  }
  return INITIAL_VIDEOS;
}

/**
 * Verify admin password (Ma44332211)
 * Works both with backend API and on static GitHub Pages!
 */
export async function verifyAdminPassword(password: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Backend fetch failed, continue to fallback
  }

  // Static host (GitHub Pages) validation
  if (password === ADMIN_PASSWORD_FALLBACK) {
    return { success: true, message: 'সফলভাবে লগইন হয়েছে!' };
  }
  return { success: false, message: 'ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।' };
}

/**
 * Add video.
 * If running on GitHub Pages (where /api/videos returns HTML 404),
 * it gracefully persists into localStorage without any error!
 */
export async function addVideoToServer(
  password: string,
  video: Partial<VideoItem>
): Promise<VideoItem> {
  const newVideoItem: VideoItem = {
    id: video.id || `vid_${Date.now()}`,
    slotNumber: video.slotNumber || Date.now(),
    title: video.title || 'নতুন ভিডিও',
    description: video.description || '',
    creator: video.creator || 'মাহবুব',
    creatorHandle: video.creatorHandle || '@mahabub',
    videoUrl: video.videoUrl || '',
    tags: video.tags || ['shorts'],
    audioTrack: video.audioTrack || 'অরিজিনাল সুর',
    likes: 1,
    commentsCount: 0,
    sharesCount: 0,
    createdAt: Date.now(),
  };

  try {
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, video: newVideoItem }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.video) {
        return data.video;
      }
    }
  } catch {
    // Ignore server error and save locally below
  }

  // GitHub Pages fallback: save to localStorage
  const current = getLocalCustomVideos();
  const updated = [newVideoItem, ...current];
  saveLocalCustomVideos(updated);

  return newVideoItem;
}

/**
 * Update video
 */
export async function updateVideoOnServer(
  password: string,
  id: string,
  updates: Partial<VideoItem>
): Promise<VideoItem> {
  try {
    const res = await fetch(`/api/videos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, updates }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.video) {
        return data.video;
      }
    }
  } catch {
    // Ignore server error and save locally below
  }

  // GitHub Pages fallback: update in localStorage
  const current = getLocalCustomVideos();
  const index = current.findIndex((v) => v.id === id);
  if (index !== -1) {
    current[index] = { ...current[index], ...updates };
    saveLocalCustomVideos(current);
    return current[index];
  }

  return { id, ...updates } as VideoItem;
}

/**
 * Delete video
 */
export async function deleteVideoFromServer(password: string, id: string): Promise<void> {
  try {
    const res = await fetch(`/api/videos/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return;
    }
  } catch {
    // Ignore server error and remove locally below
  }

  // GitHub Pages fallback: remove from localStorage
  const current = getLocalCustomVideos();
  const filtered = current.filter((v) => v.id !== id);
  saveLocalCustomVideos(filtered);
}
