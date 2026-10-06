import React, { useRef, useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Download,
  Check,
  Disc,
  Play,
  Pause,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { VideoItem } from '../types/video';
import {
  isVideoOffline,
  getOfflineVideoUrl,
  downloadVideoToOffline,
  removeVideoFromOffline,
} from '../services/storage';

interface VideoPlayerProps {
  video: VideoItem;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenComments: (videoId: string, title: string) => void;
  onDeleteCustomVideo?: (videoId: string) => void;
  isOfflineMode: boolean;
  onOfflineStatusChanged: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isActive,
  isMuted,
  onToggleMute,
  onOpenComments,
  onDeleteCustomVideo,
  isOfflineMode,
  onOfflineStatusChanged,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [likes, setLikes] = useState(video.likes);
  const [isLiked, setIsLiked] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string>(video.videoUrl);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [heartAnim, setHeartAnim] = useState<{ x: number; y: number } | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Check offline status and get blob if cached
  useEffect(() => {
    let isMounted = true;

    async function checkOffline() {
      const offline = await isVideoOffline(video.id);
      if (!isMounted) return;
      setIsSavedOffline(offline);

      if (offline) {
        const blobUrl = await getOfflineVideoUrl(video.id);
        if (isMounted && blobUrl) {
          setActiveVideoSrc(blobUrl);
          return;
        }
      }

      // If not offline and online, use standard url
      if (isMounted) {
        setActiveVideoSrc(video.videoUrl);
      }
    }

    checkOffline();

    return () => {
      isMounted = false;
    };
  }, [video.id, video.videoUrl]);

  // Handle auto-play when active in viewport
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.currentTime = 0;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Autoplay prevented or waiting for user interaction:', err);
            setIsPlaying(false);
          });
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [isActive, activeVideoSrc]);

  // Toggle Play / Pause
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play();
      setIsPlaying(true);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  };

  // Double tap to like
  const handleDoubleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHeartAnim({ x, y });
    setTimeout(() => setHeartAnim(null), 800);

    if (!isLiked) {
      setIsLiked(true);
      setLikes((prev) => prev + 1);
    }
  };

  // Handle like button toggle
  const handleLikeToggle = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikes((prev) => prev - 1);
    } else {
      setIsLiked(true);
      setLikes((prev) => prev + 1);
    }
  };

  // Handle Download for Offline
  const handleDownloadOffline = async () => {
    if (isDownloading) return;

    if (isSavedOffline) {
      // If already saved, ask to remove
      if (window.confirm('এই ভিডিওটি অফলাইন স্টোরেজ থেকে সরাতে চান?')) {
        await removeVideoFromOffline(video.id);
        setIsSavedOffline(false);
        setActiveVideoSrc(video.videoUrl);
        onOfflineStatusChanged();
      }
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(5);

    try {
      await downloadVideoToOffline(video, (pct) => {
        setDownloadProgress(pct);
      });
      setIsSavedOffline(true);
      const blobUrl = await getOfflineVideoUrl(video.id);
      if (blobUrl) {
        setActiveVideoSrc(blobUrl);
      }
      onOfflineStatusChanged();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'ডাউনলোডে সমস্যা হয়েছে।';
      alert(msg);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Share handler
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('ভিডিওর লিংক কপি করা হয়েছে!');
    }
  };

  // Time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none"
      onDoubleClick={handleDoubleTap}
      onClick={handleTogglePlay}
    >
      {/* Video Element */}
      {isOfflineMode && !isSavedOffline ? (
        // Video not saved offline warning in offline mode
        <div className="flex flex-col items-center justify-center text-center p-6 max-w-xs text-zinc-300 z-10">
          <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-amber-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-white mb-1">অফলাইনে সংরক্ষিত নেই</h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            আপনি বর্তমানে অফলাইন ফিল্টারে আছেন। এই ভিডিওটি অফলাইনে উপভোগ করতে অনলাইনে থাকাকালীন ডাউনলোড করে রাখুন।
          </p>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={activeVideoSrc}
          loop
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          className="w-full h-full object-cover object-center max-w-md mx-auto"
        />
      )}

      {/* Center Play/Pause feedback animation */}
      {showPlayIcon && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20 animate-out fade-out zoom-out duration-500">
          <div className="p-4 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
            {isPlaying ? (
              <Play className="w-10 h-10 fill-current ml-0.5" />
            ) : (
              <Pause className="w-10 h-10 fill-current" />
            )}
          </div>
        </div>
      )}

      {/* Double-tap floating heart animation */}
      {heartAnim && (
        <div
          className="pointer-events-none absolute z-30 animate-in zoom-in-50 fade-in duration-300 text-rose-500"
          style={{
            left: heartAnim.x - 40,
            top: heartAnim.y - 40,
          }}
        >
          <Heart className="w-20 h-20 fill-current drop-shadow-2xl animate-bounce" />
        </div>
      )}

      {/* Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10" />

      {/* Bottom Gradient for high legibility */}
      <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />

      {/* Right Side Actions Bar (TikTok Style) */}
      <div
        className="absolute right-3 bottom-20 z-20 flex flex-col items-center gap-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Creator Avatar with follow badge */}
        <div className="relative mb-1">
          <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-rose-500 to-amber-400 overflow-hidden shadow-lg">
            <img
              src={
                video.creatorAvatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
              }
              alt={video.creator}
              className="w-full h-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center border border-black shadow">
            +
          </span>
        </div>

        {/* Like Button */}
        <button
          onClick={handleLikeToggle}
          className="flex flex-col items-center group transition active:scale-90"
        >
          <div
            className={`p-2.5 rounded-full backdrop-blur-md transition ${
              isLiked
                ? 'bg-rose-600/90 text-white shadow-lg shadow-rose-600/50'
                : 'bg-black/50 text-white hover:bg-black/70'
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-[11px] font-semibold text-white mt-1 drop-shadow tabular-nums">
            {likes >= 1000 ? (likes / 1000).toFixed(1) + 'k' : likes}
          </span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => onOpenComments(video.id, video.title)}
          className="flex flex-col items-center group transition active:scale-90"
        >
          <div className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition">
            <MessageCircle className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-semibold text-white mt-1 drop-shadow tabular-nums">
            {video.commentsCount}
          </span>
        </button>

        {/* OFFLINE DOWNLOAD BUTTON - Key Request Feature! */}
        <button
          onClick={handleDownloadOffline}
          disabled={isDownloading}
          title={isSavedOffline ? 'অফলাইনে সেভড (মুছতে ক্লিক করুন)' : 'অফলাইনে ডাউনলোড করুন'}
          className="flex flex-col items-center group transition active:scale-90"
        >
          <div
            className={`p-2.5 rounded-full backdrop-blur-md transition border ${
              isSavedOffline
                ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/40'
                : isDownloading
                ? 'bg-zinc-800 text-emerald-400 border-zinc-700'
                : 'bg-black/50 text-white border-white/10 hover:bg-black/70'
            }`}
          >
            {isDownloading ? (
              <div className="relative w-6 h-6 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            ) : isSavedOffline ? (
              <Check className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <Download className="w-6 h-6" />
            )}
          </div>
          <span className="text-[10px] font-semibold mt-1 drop-shadow text-center">
            {isDownloading ? (
              <span className="text-emerald-400">{downloadProgress}%</span>
            ) : isSavedOffline ? (
              <span className="text-emerald-400">অফলাইন ✓</span>
            ) : (
              <span className="text-zinc-200">ডাউনলোড</span>
            )}
          </span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center group transition active:scale-90"
        >
          <div className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-semibold text-white mt-1 drop-shadow">শেয়ার</span>
        </button>

        {/* Mute/Unmute quick toggle */}
        <button
          onClick={onToggleMute}
          className="p-2.5 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition active:scale-90"
          title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-zinc-400" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>

        {/* If custom upload, optional delete button */}
        {video.isCustomUpload && onDeleteCustomVideo && (
          <button
            onClick={() => {
              if (window.confirm('আপনি কি এই কাস্টম ভিডিওটি সম্পূর্ণ মুছে ফেলতে চান?')) {
                onDeleteCustomVideo(video.id);
              }
            }}
            className="p-2 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-400 hover:text-white transition active:scale-90 mt-1"
            title="কাস্টম ভিডিও মুছুন"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Info Area (Creator, Caption, Sound) */}
      <div
        className="absolute bottom-4 left-3 right-16 z-20 pointer-events-auto text-white flex flex-col justify-end max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Creator Name */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-bold text-sm text-white drop-shadow-md hover:underline cursor-pointer">
            {video.creator}
          </span>
          <span className="text-xs text-zinc-400">{video.creatorHandle}</span>
          {isSavedOffline && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Check className="w-3 h-3" /> অফলাইন প্রস্তুত
            </span>
          )}
        </div>

        {/* Title and Description */}
        <p className="text-xs text-zinc-100 font-medium leading-relaxed drop-shadow-md mb-2">
          {showFullDesc || video.description.length < 80 ? (
            video.description
          ) : (
            <>
              {video.description.slice(0, 80)}...{' '}
              <button
                onClick={() => setShowFullDesc(true)}
                className="text-zinc-300 font-bold hover:underline"
              >
                আরো দেখুন
              </button>
            </>
          )}
        </p>

        {/* Hashtags */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {video.tags.map((tag, idx) => (
              <span key={idx} className="text-xs font-semibold text-rose-400 drop-shadow">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Audio Track Marquee with Vinyl Disc */}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 max-w-[200px] truncate bg-black/40 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-sm">
            <Disc className={`w-3.5 h-3.5 text-rose-500 shrink-0 ${isPlaying ? 'animate-spin' : ''}`} />
            <span className="truncate">{video.audioTrack || 'অরিজিনাল সুর'}</span>
          </div>
        </div>
      </div>

      {/* Progress Scrubber Bar at Very Bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer z-30 group hover:h-2 transition-all"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-rose-600 transition-all duration-150"
          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
};
