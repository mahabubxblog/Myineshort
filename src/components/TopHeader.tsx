import React from 'react';
import { Plus, HardDrive, Wifi, WifiOff, Lock } from 'lucide-react';

interface TopHeaderProps {
  filterMode: 'all' | 'offline';
  onFilterChange: (mode: 'all' | 'offline') => void;
  allCount: number;
  offlineCount: number;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onOpenUpload: () => void;
  onOpenStorage: () => void;
  onOpenAdmin: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  filterMode,
  onFilterChange,
  allCount,
  offlineCount,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onOpenUpload,
  onOpenStorage,
  onOpenAdmin,
}) => {
  const effectiveOnline = isOnline && !isSimulatedOffline;

  return (
    <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-3 md:px-5 py-2.5 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-auto">
      {/* Zone 1: Brand title wordmark + hidden admin lock */}
      <div className="flex items-center gap-1.5">
        <a href="/" className="font-display text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-1 drop-shadow-md">
          <span className="text-rose-500">Snip</span>Tok
        </a>
        <button
          onClick={onOpenAdmin}
          className="p-1 rounded-full text-zinc-500 hover:text-rose-400 transition ml-0.5"
          title="ক্রিয়েটর অ্যাডমিন (গোপন পাসওয়ার্ড)"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Zone 2: Segmented filter tab buttons */}
      <div className="flex items-center p-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
            filterMode === 'all'
              ? 'bg-white text-black shadow-md'
              : 'text-zinc-300 hover:text-white'
          }`}
        >
          সব ({allCount})
        </button>
        <button
          onClick={() => onFilterChange('offline')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all flex items-center gap-1 whitespace-nowrap ${
            filterMode === 'offline'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-zinc-300 hover:text-white'
          }`}
        >
          অফলাইন ({offlineCount})
        </button>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Offline test simulator toggle button */}
        <button
          onClick={onToggleSimulatedOffline}
          title={
            effectiveOnline
              ? 'ইন্টারনেট চালু (অফলাইন মোড টেস্ট করতে ক্লিক করুন)'
              : 'অফলাইন মোড সক্রিয় (শুধুমাত্র সেভ করা ভিডিও চলবে)'
          }
          className={`flex items-center gap-1 px-1.5 py-1 rounded-full text-[10px] font-medium border transition ${
            effectiveOnline
              ? 'bg-zinc-900/80 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse'
          }`}
        >
          {effectiveOnline ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">অনলাইন</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-rose-400" />
              <span>অফলাইন</span>
            </>
          )}
        </button>

        {/* Upload Custom / Admin quick trigger */}
        <button
          onClick={onOpenAdmin}
          className="p-1.5 md:px-2.5 md:py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-1 shadow-lg shadow-rose-600/30 transition"
          title="ড্রপবক্স ও ভিডিও যোগ করুন"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ ড্রপবক্স</span>
        </button>

        {/* Storage Manager */}
        <button
          onClick={onOpenStorage}
          className="relative p-1.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/15 text-white transition"
          title="অফলাইন স্টোরেজ দেখুন"
        >
          <HardDrive className="w-3.5 h-3.5 text-zinc-300" />
          {offlineCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-black font-bold text-[8px] flex items-center justify-center">
              {offlineCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

