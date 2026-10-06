/**
 * Helper to normalize and convert video URLs (Dropbox, Google Drive, Direct MP4, etc.)
 * into direct streaming raw video URLs with CORS support for offline Blob downloading.
 */
export function normalizeVideoUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // 1. Dropbox link conversion
  // Standard Dropbox: https://www.dropbox.com/s/xxxx/video.mp4?dl=0
  // SCL Dropbox: https://www.dropbox.com/scl/fi/xxxx/video.mp4?rlkey=yyyy&dl=0
  if (trimmed.includes('dropbox.com')) {
    try {
      const urlObj = new URL(trimmed);
      // Replace host with direct streaming host dl.dropboxusercontent.com
      urlObj.hostname = 'dl.dropboxusercontent.com';
      // Remove dl=0 and ensure raw=1
      urlObj.searchParams.delete('dl');
      urlObj.searchParams.set('raw', '1');
      return urlObj.toString();
    } catch {
      // Fallback string replacement if URL parse fails
      let converted = trimmed
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('dropbox.com', 'dl.dropboxusercontent.com');
      if (converted.includes('?')) {
        converted = converted.replace('dl=0', 'raw=1');
        if (!converted.includes('raw=1')) {
          converted += '&raw=1';
        }
      } else {
        converted += '?raw=1';
      }
      return converted;
    }
  }

  // 2. Google Drive share link conversion (if user pastes one)
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const gdriveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveMatch && gdriveMatch[1]) {
    const fileId = gdriveMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return trimmed;
}

/**
 * Format bytes to human readable string (KB, MB)
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '০ KB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return (bytes / 1024).toFixed(1) + ' KB';
  return mb.toFixed(2) + ' MB';
}
