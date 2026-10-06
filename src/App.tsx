import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronUp, ChevronDown, Info, X, HelpCircle, Film, DownloadCloud, Sparkles, Lock, RefreshCw } from 'lucide-react';
import { VideoItem } from './types/video';
import { INITIAL_VIDEOS } from './data/defaultVideos';
import {
  getCustomVideos,
  getOfflineVideoIds,
  deleteCustomVideo,
} from './services/storage';
import { fetchPublicVideos } from './services/api';
import { fetchLiveVideosFromGitHub } from './services/githubSync';
import { TopHeader } from './components/TopHeader';
import { VideoPlayer } from './components/VideoPlayer';
import { UploadModal } from './components/UploadModal';
import { StorageManagerModal } from './components/StorageManagerModal';
import { AdminStudioModal } from './components/AdminStudioModal';
import { CommentsDrawer } from './components/CommentsDrawer';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  const [serverVideos, setServerVideos] = useState<VideoItem[]>([]);
  const [localCustomVideos, setLocalCustomVideos] = useState<VideoItem[]>([]);
  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filterMode, setFilterMode] = useState<'all' | 'offline'>('all');
  const [isMuted, setIsMuted] = useState(true);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isStorageOpen, setIsStorageOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [commentDrawerData, setCommentDrawerData] = useState<{
    isOpen: boolean;
    videoId: string;
    videoTitle: string;
  }>({
    isOpen: false,
    videoId: '',
    videoTitle: '',
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Load videos on mount
  useEffect(() => {
    loadAllVideos();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadAllVideos = async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch live public videos directly from GitHub (synced across all phones globally)
      const githubVideos = await fetchLiveVideosFromGitHub();
      if (githubVideos && githubVideos.length > 0) {
        setServerVideos(githubVideos);
      } else {
        const fetched = await fetchPublicVideos();
        setServerVideos(fetched && fetched.length > 0 ? fetched : INITIAL_VIDEOS);
      }

      // 2. Fetch local custom videos and offline IDs
      const locals = await getCustomVideos();
      setLocalCustomVideos(locals);
      const savedIds = await getOfflineVideoIds();
      setOfflineIds(savedIds);
    } catch (err) {
      console.error('Error loading video feeds:', err);
      setServerVideos(INITIAL_VIDEOS);
    } finally {
      setIsSyncing(false);
    }
  };

  // Combine public server videos + local user uploads (prioritizing server videos)
  const allVideos = useMemo(() => {
    // Unique by id
    const map = new Map<string, VideoItem>();
    serverVideos.forEach((v) => map.set(v.id, v));
    localCustomVideos.forEach((v) => {
      if (!map.has(v.id)) map.set(v.id, v);
    });
    return Array.from(map.values());
  }, [serverVideos, localCustomVideos]);

  // Filter videos based on selected mode
  const displayedVideos = useMemo(() => {
    if (filterMode === 'offline') {
      return allVideos.filter((v) => offlineIds.includes(v.id));
    }
    return allVideos;
  }, [allVideos, filterMode, offlineIds]);

  // Keep activeIndex within bounds when displayedVideos list shrinks or changes
  useEffect(() => {
    if (displayedVideos.length > 0 && activeIndex >= displayedVideos.length) {
      setActiveIndex(0);
    }
  }, [displayedVideos.length, activeIndex]);

  // Handle scroll detection for snapping active video
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollPos = container.scrollTop;
    const itemHeight = container.clientHeight;
    if (itemHeight === 0) return;

    const newIndex = Math.round(scrollPos / itemHeight);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < displayedVideos.length) {
      setActiveIndex(newIndex);
    }
  };

  // Keyboard navigation (ArrowUp, ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isUploadOpen || isStorageOpen || isGuideOpen || isAdminOpen || commentDrawerData.isOpen) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollNext();
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, displayedVideos.length, isUploadOpen, isStorageOpen, isGuideOpen, isAdminOpen, commentDrawerData.isOpen]);

  const scrollToVideoIndex = (idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = Math.max(0, Math.min(idx, displayedVideos.length - 1));
    container.scrollTo({
      top: target * container.clientHeight,
      behavior: 'smooth',
    });
    setActiveIndex(target);
  };

  const scrollNext = () => {
    if (activeIndex < displayedVideos.length - 1) {
      scrollToVideoIndex(activeIndex + 1);
    }
  };

  const scrollPrev = () => {
    if (activeIndex > 0) {
      scrollToVideoIndex(activeIndex - 1);
    }
  };

  const handleDeleteCustom = async (videoId: string) => {
    await deleteCustomVideo(videoId);
    await loadAllVideos();
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex justify-center select-none font-sans">
      {/* Centered Mobile Reel Container (Max width 480px on desktop for realistic TikTok/Shorts experience) */}
      <div className="relative w-full max-w-md h-full bg-black flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <TopHeader
          filterMode={filterMode}
          onFilterChange={(mode) => {
            setFilterMode(mode);
            setActiveIndex(0);
            if (containerRef.current) containerRef.current.scrollTop = 0;
          }}
          allCount={allVideos.length}
          offlineCount={offlineIds.length}
          isOnline={isOnline}
          isSimulatedOffline={isSimulatedOffline}
          onToggleSimulatedOffline={() => setIsSimulatedOffline((prev) => !prev)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenStorage={() => setIsStorageOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />

        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Vertical Snap Video Feed */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="relative flex-1 w-full h-full overflow-y-scroll snap-y-mandatory no-scrollbar bg-black"
        >
          {displayedVideos.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <DownloadCloud className="w-16 h-16 text-zinc-600 mb-4 animate-pulse" />
              <h2 className="text-lg font-bold text-white mb-2">
                {filterMode === 'offline'
                  ? 'কোনো অফলাইন ভিডিও পাওয়া যায়নি'
                  : 'কোনো ভিডিও নেই'}
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mb-6">
                {filterMode === 'offline'
                  ? 'আপনি এখনও কোনো ভিডিও অফলাইনে ডাউনলোড করেননি। "সব ভিডিও" ট্যাবে গিয়ে ভিডিওর পাশে থাকা ডাউনলোড বাটনে চাপুন।'
                  : 'অ্যাডমিন প্যানেল থেকে ড্রপবক্স লিংক দিয়ে ভিডিও যোগ করুন।'}
              </p>
              {filterMode === 'offline' ? (
                <button
                  onClick={() => setFilterMode('all')}
                  className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition"
                >
                  সব ভিডিও দেখুন
                </button>
              ) : (
                <button
                  onClick={() => setIsAdminOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 transition"
                >
                  + ড্রপবক্স ভিডিও যোগ করুন
                </button>
              )}
            </div>
          ) : (
            displayedVideos.map((video, idx) => (
              <div
                key={video.id}
                className="w-full h-full snap-start relative shrink-0"
              >
                <VideoPlayer
                  video={video}
                  isActive={activeIndex === idx}
                  isMuted={isMuted}
                  onToggleMute={() => setIsMuted((prev) => !prev)}
                  onOpenComments={(id, title) =>
                    setCommentDrawerData({ isOpen: true, videoId: id, videoTitle: title })
                  }
                  onDeleteCustomVideo={handleDeleteCustom}
                  isOfflineMode={filterMode === 'offline' || isSimulatedOffline || !isOnline}
                  onOfflineStatusChanged={loadAllVideos}
                />
              </div>
            ))
          )}
        </div>

        {/* Floating Quick Action: Information / Discussion Guide button */}
        <div className="absolute bottom-5 left-3 z-30 flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="p-2 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 text-zinc-300 hover:text-white backdrop-blur-md transition shadow-lg flex items-center gap-1.5"
            title="গাইড ও আলোচনা"
          >
            <HelpCircle className="w-4 h-4 text-rose-400" />
            <span className="text-[11px] font-medium pr-1">গাইড</span>
          </button>

          <button
            onClick={() => setIsAdminOpen(true)}
            className="p-2 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 text-zinc-400 hover:text-rose-400 backdrop-blur-md transition shadow-lg"
            title="ক্রিয়েটর অ্যাডমিন স্টুডিও"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Next/Prev Arrows (Desktop & Convenience) */}
        {displayedVideos.length > 1 && (
          <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 flex-col gap-2 pointer-events-auto">
            <button
              onClick={scrollPrev}
              disabled={activeIndex === 0}
              className="p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white disabled:opacity-20 transition"
              title="আগের ভিডিও"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={scrollNext}
              disabled={activeIndex === displayedVideos.length - 1}
              className="p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-white disabled:opacity-20 transition"
              title="পরের ভিডিও"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Guide / Discussion Modal */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 text-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold">আপনার তৈরি সিস্টেমের পূর্ণাঙ্গ গাইড</h3>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-zinc-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-zinc-800/80 border border-rose-500/40">
                <h4 className="font-semibold text-rose-400 text-sm mb-1 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> ১. গোপন ক্রিয়েটর অ্যাডমিন প্যানেল
                </h4>
                <p>
                  উপরে ডানদিকের <strong>"+ ড্রপবক্স"</strong> অথবা লক আইকনে চাপ দিলে আপনার গোপন অ্যাডমিন প্যানেল আসবে। সেখানে আপনার গোপন ক্রিয়েটর পাসওয়ার্ড দিলে ১ থেকে ১০০টি ভিডিও যোগ ও পরিবর্তনের ড্যাশবোর্ড খুলে যাবে।
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-800/70 border border-zinc-700/60">
                <h4 className="font-semibold text-emerald-400 text-sm mb-1 flex items-center gap-1.5">
                  <Film className="w-4 h-4" /> ২. ড্রপবক্স (Dropbox) থেকে ভিডিও দেওয়ার নিয়ম
                </h4>
                <p>
                  আপনার ফোন থেকে ভিডিও ড্রপবক্সে আপলোড করে <strong>Copy Link</strong> করবেন। তারপর আমাদের অ্যাডমিন প্যানেলের বক্সে পেস্ট করে সেভ দেবেন। ওয়েবসাইট স্বয়ংক্রিয়ভাবে ড্রপবক্স লিংক কনভার্ট করে সবার ফোনে লাইভ করে দেবে!
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-800/70 border border-zinc-700/60">
                <h4 className="font-semibold text-cyan-400 text-sm mb-1 flex items-center gap-1.5">
                  <DownloadCloud className="w-4 h-4" /> ৩. ভিজিটরদের ১০-২০টি অফলাইন ডাউনলোড
                </h4>
                <p>
                  যে কেউ ওয়েবসাইটে ঢুকলে সব ভিডিও দেখতে পাবে। তার নিজের ফোনের জন্য যে ১০ বা ২০টি ভিডিও ভালো লাগবে, সে পাশে থাকা <strong>ডাউনলোড</strong> বাটনে ক্লিক করে অফলাইনে সেভ করে নিতে পারবে। এরপর নেট বন্ধ হলেও শুধু তার সেভ করা ভিডিওগুলো চলবে।
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-800/70 border border-zinc-700/60">
                <h4 className="font-semibold text-amber-400 text-sm mb-1">
                  ৪. লাইফটাইম ফ্রি ও হোস্টিং
                </h4>
                <p>
                  Google AI Studio-তে আপনার ডেভেলপমেন্ট ও শেয়ারেবল লিংক আজীবন ফ্রি। পাশাপাশি এর সম্পূর্ণ কোডটি এক্সপোর্ট করে যেকোনো সময় গিটহাব বা ভের্সেলে রাখা সম্ভব।
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-semibold text-white transition"
              >
                ঠিক আছে, বুঝতে পেরেছি
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Studio Modal (Dropbox + Video Manager 1-100) */}
      <AdminStudioModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        videos={allVideos}
        onVideosUpdated={loadAllVideos}
        onSelectVideoToPlay={(id) => {
          const idx = displayedVideos.findIndex((v) => v.id === id);
          if (idx !== -1) {
            scrollToVideoIndex(idx);
          }
        }}
      />

      {/* Upload Custom Video Modal (Device File / Direct URL) */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onVideoAdded={() => loadAllVideos()}
      />

      {/* Storage Manager Modal */}
      <StorageManagerModal
        isOpen={isStorageOpen}
        onClose={() => setIsStorageOpen(false)}
        onSelectVideoToPlay={(id) => {
          const idx = displayedVideos.findIndex((v) => v.id === id);
          if (idx !== -1) {
            scrollToVideoIndex(idx);
          }
        }}
        onStorageChanged={loadAllVideos}
      />

      {/* Comments Drawer */}
      <CommentsDrawer
        isOpen={commentDrawerData.isOpen}
        videoId={commentDrawerData.videoId}
        videoTitle={commentDrawerData.videoTitle}
        onClose={() =>
          setCommentDrawerData({ isOpen: false, videoId: '', videoTitle: '' })
        }
      />
    </div>
  );
}
