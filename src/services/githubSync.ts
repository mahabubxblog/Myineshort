import { VideoItem } from '../types/video';
import { INITIAL_VIDEOS } from '../data/defaultVideos';

export const GITHUB_REPO_OWNER = 'demox2025';
export const GITHUB_REPO_NAME = 'my-shorts-app';
export const GITHUB_FILE_PATH = 'public/videos.json';

const GITHUB_TOKEN_KEY = 'sniptok_admin_github_token';

export function getSavedGitHubToken(): string {
  try {
    return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGitHubToken(token: string): void {
  try {
    localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
  } catch (err) {
    console.error('Failed to save GitHub token:', err);
  }
}

/**
 * Fetch the latest live video list directly from GitHub.
 * Every device in the world fetches this!
 */
export async function fetchLiveVideosFromGitHub(): Promise<VideoItem[]> {
  const timestamp = Date.now();
  // 1. Try raw githubusercontent directly with cache-busting
  const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/main/${GITHUB_FILE_PATH}?_t=${timestamp}`;
  // 2. Fallback to local /videos.json path
  const localUrl = `/videos.json?_t=${timestamp}`;

  try {
    const res = await fetch(rawUrl);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // If raw fails, fallback to local path
  }

  try {
    const resLocal = await fetch(localUrl);
    if (resLocal.ok) {
      const data = await resLocal.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {}

  // Fallback to local storage if available
  try {
    const cached = localStorage.getItem('sniptok_custom_videos_list');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  return INITIAL_VIDEOS;
}

/**
 * Commit updated videos directly to GitHub repo from the website Admin Panel!
 */
export async function commitVideosToGitHub(
  token: string,
  updatedVideos: VideoItem[]
): Promise<{ success: boolean; message: string }> {
  if (!token || !token.trim()) {
    throw new Error('দয়া করে আপনার GitHub Token প্রবেশ করান।');
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`;

  // 1. Get current file sha
  let sha = '';
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha || '';
    }
  } catch (err) {
    console.warn('Could not fetch existing file SHA:', err);
  }

  // 2. Encode JSON content to UTF-8 Base64
  const jsonString = JSON.stringify(updatedVideos, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

  // 3. Send PUT request to GitHub Contents API
  const putBody: { message: string; content: string; sha?: string } = {
    message: `Update videos list from Admin Panel [${new Date().toLocaleTimeString()}]`,
    content: base64Content,
  };
  if (sha) {
    putBody.sha = sha;
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const errorData = await putRes.json().catch(() => ({}));
    const errorMsg = errorData.message || putRes.statusText;
    if (putRes.status === 401) {
      throw new Error('ভুল বা মেয়াদোত্তীর্ণ GitHub Token! দয়া করে সঠিক টোকেন দিন।');
    }
    if (putRes.status === 404) {
      throw new Error('GitHub রিপোজিটরি পাওয়া যায়নি। রিপোজিটরির নাম বা পারমিশন চেক করুন।');
    }
    throw new Error(`GitHub সেভ করতে ব্যর্থ: ${errorMsg}`);
  }

  // Also cache locally in this browser
  try {
    localStorage.setItem('sniptok_custom_videos_list', JSON.stringify(updatedVideos));
  } catch {}

  return {
    success: true,
    message: 'সফলভাবে গিটহাবে সেভ হয়েছে! বিশ্বের সব ফোনে ভিডিওটি লাইভ হয়ে গেছে!',
  };
}
