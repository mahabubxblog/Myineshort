import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
  Link as LinkIcon,
  Video,
  Key,
  Copy,
  Check,
  DownloadCloud,
  RefreshCw,
  Eye,
  Layers,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { VideoItem } from '../types/video';
import { normalizeVideoUrl } from '../utils/urlParser';
import {
  getSavedGitHubToken,
  saveGitHubToken,
  commitVideosToGitHub,
  getDefaultRepoOwner,
  getDefaultRepoName,
  saveRepoConfig,
  verifyGitHubToken,
} from '../services/githubSync';

interface AdminStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: VideoItem[];
  onVideosUpdated: () => void;
  onSelectVideoToPlay: (videoId: string) => void;
}

export const AdminStudioModal: React.FC<AdminStudioModalProps> = ({
  isOpen,
  onClose,
  videos = [],
  onVideosUpdated,
  onSelectVideoToPlay,
}) => {
  // Safe videos list guard
  const safeVideos: VideoItem[] = Array.isArray(videos) ? videos : [];

  // Active Tab: 'videos' | 'add' | 'github'
  const [activeTab, setActiveTab] = useState<'videos' | 'add' | 'github'>('videos');

  // GitHub token state with safe initializers
  const [githubToken, setGithubToken] = useState<string>('');
  const [repoOwner, setRepoOwner] = useState<string>('mahabubxblog');
  const [repoName, setRepoName] = useState<string>('my-shorts-app');
  const [isCopiedJson, setIsCopiedJson] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Form state for Add/Edit
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rawUrl, setRawUrl] = useState('');
  const [creator, setCreator] = useState('মাহবুব');
  const [audioTrack, setAudioTrack] = useState('অরিজিনাল সুর');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewTestUrl, setPreviewTestUrl] = useState<string | null>(null);

  // Load configuration on open safely
  useEffect(() => {
    if (isOpen) {
      try {
        const savedToken = getSavedGitHubToken();
        if (savedToken) setGithubToken(savedToken);
        setRepoOwner(getDefaultRepoOwner());
        setRepoName(getDefaultRepoName());
      } catch (err) {
        console.warn('Config load error:', err);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Open Form for Adding New Video
  const handleOpenAdd = () => {
    setEditingVideoId(null);
    setTitle(`ভিডিও #${safeVideos.length + 1}`);
    setDescription('');
    setRawUrl('');
    setCreator('মাহবুব');
    setAudioTrack('অরিজিনাল সুর');
    setFormMsg(null);
    setPreviewTestUrl(null);
    setActiveTab('add');
  };

  // Open Form for Editing Existing Video
  const handleOpenEdit = (v: VideoItem) => {
    setEditingVideoId(v.id);
    setTitle(v.title || '');
    setDescription(v.description || '');
    setRawUrl(v.videoUrl || '');
    setCreator(v.creator || 'মাহবুব');
    setAudioTrack(v.audioTrack || 'অরিজিনাল সুর');
    setFormMsg(null);
    setPreviewTestUrl(normalizeVideoUrl(v.videoUrl || ''));
    setActiveTab('add');
  };

  // Handle Dropbox / URL Change with Live Auto-Normalization
  const handleUrlChange = (val: string) => {
    setRawUrl(val);
    const normalized = normalizeVideoUrl(val);
    setPreviewTestUrl(normalized || null);
  };

  // Test token connection live
  const handleTestToken = async () => {
    if (!githubToken.trim()) {
      setTestResult({ success: false, msg: 'দয়া করে গিটহাব অ্যাক্সেস টোকেন ইনপুট দিন।' });
      return;
    }
    setIsTestingToken(true);
    setTestResult(null);
    try {
      const res = await verifyGitHubToken(githubToken, repoOwner, repoName);
      setTestResult({
        success: res.valid && res.canPush,
        msg: res.message,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'যাচাই ব্যর্থ';
      setTestResult({ success: false, msg });
    } finally {
      setIsTestingToken(false);
    }
  };

  // Save Token & Repo Config
  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      saveGitHubToken(githubToken);
      saveRepoConfig(repoOwner, repoName);
      setFormMsg({ type: 'success', text: 'GitHub কনফিগারেশন সংরক্ষিত হয়েছে!' });
      setTimeout(() => setFormMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Download videos.json file
  const handleDownloadJson = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(safeVideos, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'videos.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error(err);
    }
  };

  // Copy JSON for manual backup
  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(safeVideos, null, 2));
      setIsCopiedJson(true);
      setTimeout(() => setIsCopiedJson(false), 2000);
    } catch {
      alert('কপি করতে সমস্যা হয়েছে');
    }
  };

  // Handle Form Submit (Saves locally first + optionally syncs to GitHub)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    const convertedUrl = normalizeVideoUrl(rawUrl);
    if (!convertedUrl) {
      setFormMsg({ type: 'error', text: 'দয়া করে ড্রপবক্স বা ভিডিওর সঠিক লিঙ্ক দিন।' });
      return;
    }

    if (!title.trim()) {
      setFormMsg({ type: 'error', text: 'ভিডিওর শিরোনাম বা নাম দিন।' });
      return;
    }

    setIsSubmitting(true);

    try {
      const tags = (description.match(/#[a-zA-Z0-9_\u0980-\u09FF]+/g) || ['#shorts', '#viral']).map(
        (t) => t.replace('#', '')
      );

      let updatedList: VideoItem[];

      if (editingVideoId) {
        // Edit existing video
        updatedList = safeVideos.map((v) =>
          v.id === editingVideoId
            ? {
                ...v,
                title: title.trim(),
                description: description.trim() || title.trim(),
                videoUrl: convertedUrl,
                creator: creator.trim() || 'মাহবুব',
                creatorHandle: '@' + (creator.trim().toLowerCase().replace(/\s+/g, '_') || 'mahabub'),
                audioTrack: audioTrack.trim() || 'অরিজিনাল সাউন্ড',
                tags,
              }
            : v
        );
      } else {
        // Add new video slot
        const nextSlot = safeVideos.length + 1;
        const newVideo: VideoItem = {
          id: `vid_${Date.now()}`,
          slotNumber: nextSlot,
          title: title.trim(),
          description: description.trim() || title.trim(),
          videoUrl: convertedUrl,
          creator: creator.trim() || 'মাহবুব',
          creatorHandle: '@' + (creator.trim().toLowerCase().replace(/\s+/g, '_') || 'mahabub'),
          audioTrack: audioTrack.trim() || 'অরিজিনাল সাউন্ড',
          tags,
          likes: 1,
          commentsCount: 0,
          sharesCount: 0,
          createdAt: Date.now(),
        };
        updatedList = [newVideo, ...safeVideos];
      }

      // 1. ALWAYS save locally first so user instantly sees and plays the video
      try {
        localStorage.setItem('sniptok_custom_videos_list', JSON.stringify(updatedList));
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }
      onVideosUpdated();

      // 2. If GitHub Token is configured, sync directly to GitHub repository
      if (githubToken.trim()) {
        try {
          await commitVideosToGitHub(githubToken, updatedList, repoOwner, repoName);
          setFormMsg({
            type: 'success',
            text: '✓ সরাসরি গিটহাবে সেভ হয়েছে! বিশ্বের সব ফোনে ভিডিওটি লাইভ হয়ে গেছে!',
          });
          setTimeout(() => {
            setActiveTab('videos');
            setFormMsg(null);
          }, 1500);
        } catch (gitErr: unknown) {
          const errMsg = gitErr instanceof Error ? gitErr.message : 'গিটহাব সিঙ্ক ব্যর্থ';
          setFormMsg({
            type: 'error',
            text: `ভিডিও আপনার ফোনে সেভ হয়েছে! কিন্তু গিটহাবে লাইভ সিঙ্ক এরর: ${errMsg}`,
          });
        }
      } else {
        setFormMsg({
          type: 'success',
          text: '✓ ভিডিও আপনার ফোনে সফলভাবে সেভ হয়েছে! (সবার ফোনে অটো-সিঙ্কের জন্য GitHub ট্যাবে টোকেন দিন)',
        });
        setTimeout(() => {
          setActiveTab('videos');
          setFormMsg(null);
        }, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সংরক্ষণে সমস্যা হয়েছে।';
      setFormMsg({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Video
  const handleDelete = async (id: string, vidTitle: string) => {
    if (window.confirm(`আপনি কি "${vidTitle}" ভিডিওটি মুছে ফেলতে চান?`)) {
      try {
        const updatedList = safeVideos.filter((v) => v.id !== id);

        try {
          localStorage.setItem('sniptok_custom_videos_list', JSON.stringify(updatedList));
        } catch (e) {
          console.warn('LocalStorage delete warning:', e);
        }
        onVideosUpdated();

        if (githubToken.trim()) {
          try {
            await commitVideosToGitHub(githubToken, updatedList, repoOwner, repoName);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'গিটহাবে ডিলিট ব্যর্থ';
            alert(`আপনার ফোন থেকে মুছে গেছে, তবে গিটহাব সিঙ্ক এরর: ${msg}`);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'ডিলিট করতে সমস্যা হয়েছে।';
        alert(msg);
      }
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl rounded-3xl bg-zinc-900 border border-zinc-700 text-white p-5 md:p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Top Gradient Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
              <Sparkles className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-1.5">
                ক্রিয়েটর স্টুডিও <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold uppercase tracking-wider">অ্যাডমিন</span>
              </h2>
              <p className="text-[11px] text-zinc-400">ড্রপবক্স ভিডিও যোগ, এডিট ও লাইভ সিঙ্ক</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 my-3 p-1 bg-zinc-950/80 rounded-2xl border border-zinc-800 shrink-0">
          <button
            onClick={() => {
              setActiveTab('videos');
              setEditingVideoId(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'videos'
                ? 'bg-zinc-800 text-white shadow-md border border-zinc-700'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-rose-400" />
            <span>ভিডিও তালিকা ({safeVideos.length})</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'add'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingVideoId ? 'ভিডিও এডিট' : '+ নতুন ভিডিও'}</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'github'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-emerald-300" />
            <span>GitHub সিঙ্ক</span>
          </button>
        </div>

        {/* Tab 1: Video List (1 to 100) */}
        {activeTab === 'videos' && (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1 min-h-0">
            {safeVideos.length === 0 ? (
              <div className="text-center py-12 bg-zinc-800/40 rounded-2xl border border-zinc-800/80 text-zinc-400 text-xs">
                <Video className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="font-bold text-white text-sm mb-1">কোনো ভিডিও যোগ করা নেই</p>
                <p className="text-zinc-400 max-w-xs mx-auto mb-4 leading-relaxed">
                  উপরের "+ নতুন ভিডিও" ট্যাবে গিয়ে আপনার ড্রপবক্স লিংক দিয়ে প্রথম ভিডিও যোগ করুন।
                </p>
                <button
                  onClick={handleOpenAdd}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> ড্রপবক্স থেকে ভিডিও যোগ করুন
                </button>
              </div>
            ) : (
              safeVideos.map((vid, index) => (
                <div
                  key={vid.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-zinc-800/70 border border-zinc-700/60 hover:border-zinc-500 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 mr-2">
                    <span className="w-7 h-7 rounded-xl bg-zinc-700/90 text-zinc-200 font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                      #{index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{vid.title}</p>
                      <p className="text-[10px] text-zinc-400 truncate max-w-[180px] md:max-w-xs font-mono">
                        {vid.videoUrl}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        onSelectVideoToPlay(vid.id);
                        onClose();
                      }}
                      className="p-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition"
                      title="প্লে করুন"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(vid)}
                      className="p-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition"
                      title="এডিট / পরিবর্তন"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(vid.id, vid.title)}
                      className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-400 transition"
                      title="ডিলিট করুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Add / Edit Video Form */}
        {activeTab === 'add' && (
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-1 min-h-0">
            {formMsg && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                  formMsg.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                    : 'bg-red-950/80 border border-red-800 text-red-200'
                }`}
              >
                {formMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{formMsg.text}</span>
              </div>
            )}

            {/* Dropbox Link Input */}
            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-rose-500" />
                ড্রপবক্স ভিডিও লিঙ্ক (Dropbox Share Link) *
              </label>
              <input
                type="text"
                required
                value={rawUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.dropbox.com/scl/fi/.../video.mp4?dl=0"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
              />
              {rawUrl.includes('dropbox.com') && (
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  ড্রপবক্স লিঙ্কটি লাইভ স্ট্রিমিং ও অফলাইন ক্যাশিং উপযোগী হিসেবে সনাক্ত হয়েছে!
                </p>
              )}
            </div>

            {/* Video Title */}
            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1">
                ভিডিওর শিরোনাম (Title) *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="যেমন: ভিডিও #১: আমার স্পেশাল ট্রাভেল রিলস..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Description & Tags */}
            <div>
              <label className="block text-xs font-semibold text-zinc-200 mb-1">
                ক্যাপশন ও হ্যাশট্যাগ (Description)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ভিডিও সম্পর্কে কিছু কথা... #shorts #viral #bangla"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  ক্রিয়েটরের নাম
                </label>
                <input
                  type="text"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  অডিও সাউন্ড
                </label>
                <input
                  type="text"
                  value={audioTrack}
                  onChange={(e) => setAudioTrack(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Preview player */}
            {previewTestUrl && (
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 truncate max-w-[200px] flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" /> লিংক প্রস্তুত
                </span>
                <a
                  href={previewTestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  লিংক টেস্ট করুন
                </a>
              </div>
            )}

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('videos')}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    সেভ হচ্ছে...
                  </>
                ) : (
                  '✓ সেভ করুন (সবার ফোনে লাইভ)'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: GitHub Live Sync & Backup Settings */}
        {activeTab === 'github' && (
          <form onSubmit={handleSaveToken} className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-1 min-h-0">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200">
              <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> GitHub লাইভ সিঙ্ক সুবিধা:
              </p>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                টোকেন সেট থাকলে ওয়েবসাইট থেকেই ড্রপবক্সের ভিডিও যোগ করলে তা স্বয়ংক্রিয়ভাবে গিটহাবে সেভ হবে এবং বিশ্বের সকল ইউজারের ফোনে লাইভ আপডেট হয়ে যাবে।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-zinc-300 font-medium mb-1">
                  GitHub ইউজারনেম (Owner):
                </label>
                <input
                  type="text"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value.trim())}
                  placeholder="mahabubxblog"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-300 font-medium mb-1">
                  রিপোজিটরির নাম (Repo):
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value.trim())}
                  placeholder="mahabubxblog.github.io"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-300 font-medium mb-1 flex items-center justify-between">
                <span>GitHub Personal Access Token:</span>
                <span className="text-[10px] text-amber-400 font-normal">('repo' পারমিশন আবশ্যক)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value.trim())}
                  placeholder="ghp_... টোকেন পেস্ট করুন"
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestToken}
                  disabled={isTestingToken}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  {isTestingToken ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> চেকিং...
                    </>
                  ) : (
                    'যাচাই করুন'
                  )}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/30 shrink-0"
                >
                  সেভ
                </button>
              </div>
            </div>

            {/* Live Test Feedback */}
            {testResult && (
              <div
                className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                    : 'bg-red-950/80 border border-red-800 text-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{testResult.msg}</span>
              </div>
            )}

            {/* Classic Token 1-Click Link */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> ১-ক্লিকে টোকেন তৈরি করুন:
                </span>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=SnipTok+Admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1 shadow-sm"
                >
                  টোকেন পেজ খুলুন <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <ol className="text-[11px] text-zinc-400 list-decimal list-inside space-y-1 leading-relaxed">
                <li>উপরের বোতামে চাপ দিন (এতে <strong>'repo'</strong> টিক দেওয়া থাকবে)।</li>
                <li>নিচে গিয়ে <strong>'Generate token'</strong> বাটনে চাপ দিন।</li>
                <li>যে <code>ghp_...</code> কোডটি পাবেন তা উপরের বক্সে পেস্ট করে সেভ করুন।</li>
              </ol>
            </div>

            {/* Offline Backup Tools */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
              <button
                type="button"
                onClick={handleDownloadJson}
                className="text-zinc-300 hover:text-white flex items-center gap-1 underline font-medium"
              >
                <DownloadCloud className="w-3.5 h-3.5 text-rose-400" />
                videos.json ফাইল ডাউনলোড
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                className="text-zinc-300 hover:text-white flex items-center gap-1 font-medium"
              >
                {isCopiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopiedJson ? 'কপি হয়েছে' : 'JSON টেক্সট কপি করুন'}
              </button>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span className="flex items-center gap-1 text-[11px]">
            <Settings className="w-3 h-3 text-rose-400" /> ক্রিয়েটর স্টুডিও অ্যাক্টিভ
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition font-medium"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
