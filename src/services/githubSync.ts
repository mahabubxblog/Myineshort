import { VideoItem } from '../types/video';
import { INITIAL_VIDEOS } from '../data/defaultVideos';
import { normalizeVideoUrl } from '../utils/urlParser';

const GITHUB_TOKEN_KEY = 'sniptok_admin_github_token';
const GITHUB_OWNER_KEY = 'sniptok_admin_github_owner';
const GITHUB_REPO_KEY = 'sniptok_admin_github_repo';

export const GITHUB_REPO_OWNER = 'mahabubxblog';
export const GITHUB_REPO_NAME = 'my-shorts-app';

/**
 * Auto-detect GitHub Owner from browser hostname (e.g. mahabubxblog.github.io -> mahabubxblog)
 */
export function getDefaultRepoOwner(): string {
  try {
    const saved = localStorage.getItem(GITHUB_OWNER_KEY);
    if (saved && saved.trim()) return saved.trim();

    const host = window.location.hostname;
    if (host.includes('.github.io')) {
      return host.split('.github.io')[0].trim();
    }
  } catch {}
  return 'mahabubxblog';
}

/**
 * Auto-detect GitHub Repo name from pathname or default
 */
export function getDefaultRepoName(): string {
  try {
    const saved = localStorage.getItem(GITHUB_REPO_KEY);
    if (saved && saved.trim()) return saved.trim();

    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    if (path) {
      const seg = path.split('/')[0];
      if (seg) return seg.trim();
    }
    // If hosted at root mahabubxblog.github.io
    const host = window.location.hostname;
    if (host.includes('.github.io')) {
      return host; // e.g. mahabubxblog.github.io
    }
  } catch {}
  return 'my-shorts-app';
}

export function saveRepoConfig(owner: string, repo: string): void {
  try {
    localStorage.setItem(GITHUB_OWNER_KEY, owner.trim());
    localStorage.setItem(GITHUB_REPO_KEY, repo.trim());
  } catch (err) {
    console.error('Failed to save repo config:', err);
  }
}

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
 * Prioritizes local modifications, then live remote GitHub repository, then fallback defaults.
 */
export async function fetchLiveVideosFromGitHub(): Promise<VideoItem[]> {
  const timestamp = Date.now();
  const owner = getDefaultRepoOwner();
  const repo = getDefaultRepoName();

  // Helper to ensure all video URLs have clean, working streaming links
  const sanitizeList = (list: VideoItem[]): VideoItem[] => {
    return list.map((item) => ({
      ...item,
      videoUrl: normalizeVideoUrl(item.videoUrl),
    }));
  };

  // 1. Check local saved list first
  let localVideos: VideoItem[] | null = null;
  try {
    const cached = localStorage.getItem('sniptok_custom_videos_list');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localVideos = sanitizeList(parsed);
      }
    }
  } catch {}

  // 2. Try remote live GitHub repository (raw.githubusercontent.com)
  const remoteUrls = [
    `https://raw.githubusercontent.com/${owner}/${repo}/main/public/videos.json?_t=${timestamp}`,
    `https://raw.githubusercontent.com/${owner}/${repo}/main/videos.json?_t=${timestamp}`,
  ];

  for (const url of remoteUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const sanitized = sanitizeList(data);
          // Sync into localStorage
          try {
            localStorage.setItem('sniptok_custom_videos_list', JSON.stringify(sanitized));
          } catch {}
          return sanitized;
        }
      }
    } catch {}
  }

  // 3. If local modifications exist on this device, keep them!
  if (localVideos && localVideos.length > 0) {
    return localVideos;
  }

  // 4. Bundled fallback
  const fallbackUrls = [
    `/public/videos.json?_t=${timestamp}`,
    `/videos.json?_t=${timestamp}`,
  ];

  for (const url of fallbackUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return sanitizeList(data);
        }
      }
    } catch {}
  }

  return sanitizeList(INITIAL_VIDEOS);
}

/**
 * Verify GitHub Token validity and write permissions on the repository
 */
export async function verifyGitHubToken(
  token: string,
  customOwner?: string,
  customRepo?: string
): Promise<{ valid: boolean; canPush: boolean; message: string }> {
  if (!token || !token.trim()) {
    return { valid: false, canPush: false, message: 'টোকেন ফাঁকা রাখা যাবে না।' };
  }

  const owner = customOwner?.trim() || getDefaultRepoOwner();
  const repo = customRepo?.trim() || getDefaultRepoName();

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.status === 401) {
      return { valid: false, canPush: false, message: 'ভুল বা মেয়াদোত্তীর্ণ GitHub Token!' };
    }

    if (res.status === 404) {
      return {
        valid: false,
        canPush: false,
        message: `রিপোজিটরি "${owner}/${repo}" পাওয়া যায়নি। ইউজারনেম ও রিপোজিটরি নাম সঠিক কিনা চেক করুন।`,
      };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { valid: false, canPush: false, message: err.message || res.statusText };
    }

    const data = await res.json();
    const canPush = Boolean(data.permissions?.push || data.permissions?.admin);

    if (!canPush) {
      return {
        valid: true,
        canPush: false,
        message: `টোকেনটি পাওয়া গেছে কিন্তু "${owner}/${repo}"-তে লেখার (Write/Push) পারমিশন নেই। "repo" পারমিশন সহ ক্লাসিক টোকেন তৈরি করুন।`,
      };
    }

    return {
      valid: true,
      canPush: true,
      message: `টোকেন শতভাগ কার্যকর! "${owner}/${repo}" রিপোজিটরিতে সেভ করার পূর্ণ অনুমতি আছে।`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'কানেকশন চেক করতে সমস্যা হয়েছে।';
    return { valid: false, canPush: false, message: msg };
  }
}

/**
 * Commit updated videos directly to GitHub repo from the website Admin Panel!
 */
export async function commitVideosToGitHub(
  token: string,
  updatedVideos: VideoItem[],
  customOwner?: string,
  customRepo?: string
): Promise<{ success: boolean; message: string }> {
  if (!token || !token.trim()) {
    throw new Error('দয়া করে আপনার GitHub Token প্রবেশ করান।');
  }

  const owner = customOwner?.trim() || getDefaultRepoOwner();
  const repo = customRepo?.trim() || getDefaultRepoName();
  const filePath = 'public/videos.json';

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

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

    if (putRes.status === 403 || errorMsg.includes('Resource not accessible')) {
      throw new Error(
        `টোকেন পারমিশন এরর: আপনার GitHub Token-এ "${owner}/${repo}" রিপোজিটরির জন্য Write/repo পারমিশন নেই। (টোকেন বানানোর সময় 'repo' চেকবক্স টিক দিতে হবে)`
      );
    }
    if (putRes.status === 404) {
      throw new Error(`GitHub রিপোজিটরি "${owner}/${repo}" পাওয়া যায়নি। ইউজারনেম ও রিপোজিটরির নাম সঠিক কি না চেক করুন।`);
    }
    if (putRes.status === 401) {
      throw new Error('ভুল বা মেয়াদোত্তীর্ণ GitHub Token! দয়া করে সঠিক টোকেন দিন।');
    }

    throw new Error(`GitHub সেভ করতে ব্যর্থ: ${errorMsg}`);
  }

  // Also cache locally
  try {
    localStorage.setItem('sniptok_custom_videos_list', JSON.stringify(updatedVideos));
  } catch {}

  return {
    success: true,
    message: 'সফলভাবে গিটহাবে সেভ হয়েছে! বিশ্বের সব ফোনে ভিডিওটি লাইভ হয়ে গেছে!',
  };
}
