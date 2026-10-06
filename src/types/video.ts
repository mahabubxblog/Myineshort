export interface VideoItem {
  id: string;
  slotNumber?: number;
  title: string;
  description: string;
  creator: string;
  creatorHandle: string;
  creatorAvatar?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  audioTrack: string;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  isCustomUpload?: boolean;
  isOfflineAvailable?: boolean;
  offlineSize?: number; // bytes
  createdAt: number;
}

export interface OfflineBlobRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  downloadedAt: number;
  title: string;
}

export interface UserComment {
  id: string;
  videoId: string;
  author: string;
  text: string;
  createdAt: number;
}
