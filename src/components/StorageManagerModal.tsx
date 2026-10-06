import React, { useEffect, useState } from 'react';
import { X, HardDrive, Trash2, DownloadCloud, Play, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getOfflineStorageStats, removeVideoFromOffline, clearAllOfflineVideos } from '../services/storage';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideoToPlay: (videoId: string) => void;
  onStorageChanged: () => void;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectVideoToPlay,
  onStorageChanged,
}) => {
  const [stats, setStats] = useState<{
    totalBytes: number;
    count: number;
    videos: { id: string; title: string; size: number; downloadedAt: number }[];
  }>({ totalBytes: 0, count: 0, videos: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setIsLoading(true);
    const data = await getOfflineStorageStats();
    setStats(data);
    setIsLoading(false);
  };

  const handleDeleteOne = async (id: string) => {
    await removeVideoFromOffline(id);
    await loadStats();
    onStorageChanged();
  };

  const handleClearAll = async () => {
    if (window.confirm('আপনি কি নিশ্চিত যে সকল অফলাইন ভিডিও ডিলিট করতে চান?')) {
      await clearAllOfflineVideos();
      await loadStats();
      onStorageChanged();
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '০ KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return (bytes / 1024).toFixed(1) + ' KB';
    return mb.toFixed(2) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 text-white p-6 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold">অফলাইন স্টোরেজ ম্যানেজার</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview banner */}
        <div className="my-4 p-4 rounded-xl bg-gradient-to-br from-zinc-800/90 to-zinc-800/40 border border-zinc-700/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-300">অফলাইনে সংরক্ষিত ভিডিও</span>
            </div>
            <span className="text-sm font-bold text-white tabular-nums">
              {stats.count} টি ভিডিও
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>ব্যবহৃত মেমোরি:</span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {formatSize(stats.totalBytes)}
            </span>
          </div>

          {/* Quick explanation */}
          <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-start gap-2 text-[11px] text-zinc-400 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              সম্পূর্ণ বিনামূল্যে আপনার ব্রাউজারের লোকাল স্টোরেজে (IndexedDB) সংরক্ষিত থাকে। ইন্টারনেট বন্ধ থাকলেও এই ভিডিওগুলো সরাসরি চলবে!
            </span>
          </div>
        </div>

        {/* Action row */}
        {stats.count > 0 && (
          <div className="flex items-center justify-between pb-2 px-1">
            <span className="text-xs text-zinc-400 font-medium">ডাউনলোডকৃত ভিডিও তালিকা</span>
            <button
              onClick={handleClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              সব ক্যাশ মুছুন
            </button>
          </div>
        )}

        {/* Video list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 no-scrollbar py-1">
          {isLoading ? (
            <div className="text-center py-8 text-zinc-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              লোড হচ্ছে...
            </div>
          ) : stats.videos.length === 0 ? (
            <div className="text-center py-10 px-4">
              <DownloadCloud className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-300">কোনো ভিডিও অফলাইনে সেভ নেই</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                ভিডিও দেখার সময় ডানপাশের ডাউনলোড বাটনে ক্লিক করে যেকোনো ভিডিও অফলাইনে সেভ করে রাখতে পারেন।
              </p>
            </div>
          ) : (
            stats.videos.map((vid) => (
              <div
                key={vid.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/70 border border-zinc-700/60 hover:border-zinc-600 transition"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="text-xs font-semibold text-zinc-200 truncate">{vid.title}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 tabular-nums">
                    <span>{formatSize(vid.size)}</span>
                    <span>•</span>
                    <span>
                      {new Date(vid.downloadedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onSelectVideoToPlay(vid.id);
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 hover:text-white transition"
                    title="ভিডিওটি চালান"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => handleDeleteOne(vid.id)}
                    className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-400 transition"
                    title="অফলাইন স্টোরেজ থেকে সরান"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
