import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Unlock,
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
} from 'lucide-react';
import { VideoItem } from '../types/video';
import { normalizeVideoUrl } from '../utils/urlParser';
import { verifyAdminPassword } from '../services/api';
import {
  getSavedGitHubToken,
  saveGitHubToken,
  commitVideosToGitHub,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME,
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
  videos,
  onVideosUpdated,
  onSelectVideoToPlay,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // GitHub token state
  const [githubToken, setGithubToken] = useState('');
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rawUrl, setRawUrl] = useState('');
  const [creator, setCreator] = useState('মাহবুব');
  const [audioTrack, setAudioTrack] = useState('অরিজিনাল সুর');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewTestUrl, setPreviewTestUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedGitHubToken();
      if (saved) setGithubToken(saved);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Login with Ma44332211
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const res = await verifyAdminPassword(inputPassword.trim());
    if (res.success) {
      setIsAuthenticated(true);
    } else {
      setAuthError('ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।');
    }
  };

  // Open Form for Add
  const handleOpenAdd = () => {
    setEditingVideoId(null);
    setTitle(`ভিডিও #${videos.length + 1}`);
    setDescription('');
    setRawUrl('');
    setCreator('মাহবুব');
    setAudioTrack('অরিজিনাল সুর');
    setFormMsg(null);
    setPreviewTestUrl(null);
    setShowForm(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (v: VideoItem) => {
    setEditingVideoId(v.id);
    setTitle(v.title);
    setDescription(v.description || '');
    setRawUrl(v.videoUrl);
    setCreator(v.creator || 'মাহবুব');
    setAudioTrack(v.audioTrack || 'অরিজিনাল সুর');
    setFormMsg(null);
    setPreviewTestUrl(v.videoUrl);
    setShowForm(true);
  };

  // Handle Dropbox / URL Change with Auto Normalization
  const handleUrlChange = (val: string) => {
    setRawUrl(val);
    const normalized = normalizeVideoUrl(val);
    setPreviewTestUrl(normalized);
  };

  // Save Token
  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    saveGitHubToken(githubToken);
    setShowTokenSettings(false);
    setFormMsg({ type: 'success', text: 'GitHub টোকেন সংরক্ষিত হয়েছে!' });
    setTimeout(() => setFormMsg(null), 3000);
  };

  // Copy JSON for manual backup
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(videos, null, 2));
    setIsCopiedJson(true);
    setTimeout(() => setIsCopiedJson(false), 2000);
  };

  // Handle Form Submit (Saves to GitHub & Local)
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
        updatedList = videos.map((v) =>
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
        const nextSlot = videos.length + 1;
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
        updatedList = [newVideo, ...videos];
      }

      // If GitHub Token exists, commit directly to GitHub repository!
      if (githubToken.trim()) {
        await commitVideosToGitHub(githubToken, updatedList);
        setFormMsg({
          type: 'success',
          text: '✓ সরাসরি গিটহাবে সেভ হয়েছে! বিশ্বের সব ফোনে ভিডিওটি লাইভ হয়ে গেছে!',
        });
      } else {
        // Saved in local storage fallback
        localStorage.setItem('sniptok_custom_videos_list', JSON.stringify(updatedList));
        setFormMsg({
          type: 'success',
          text: 'ভিডিও যোগ হয়েছে! (সবার ফোনে অটো-সিঙ্কের জন্য নিচে গিটহাব টোকেন অপশন অন করুন)',
        });
      }

      onVideosUpdated();
      setTimeout(() => {
        setShowForm(false);
        setFormMsg(null);
      }, 1200);
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
        const updatedList = videos.filter((v) => v.id !== id);

        if (githubToken.trim()) {
          await commitVideosToGitHub(githubToken, updatedList);
        } else {
          localStorage.setItem('sniptok_custom_videos_list', JSON.stringify(updatedList));
        }

        onVideosUpdated();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'ডিলিট করতে সমস্যা হয়েছে।';
        alert(msg);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 text-white p-5 md:p-6 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-600/30 text-rose-500">
              {isAuthenticated ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold">ক্রিয়েটর স্টুডিও (অ্যাডমিন প্যানেল)</h2>
              <p className="text-[11px] text-zinc-400">ভিডিও যোগ ও নিয়ন্ত্রণ (সবার ফোনে লাইভ সিঙ্ক)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Screen */}
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="py-8 flex flex-col items-center max-w-sm mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4 text-rose-500 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">গোপন পাসওয়ার্ড দিন</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              ভিডিও যোগ, ডিলিট বা পরিবর্তন করার জন্য আপনার ক্রিয়েটর পাসওয়ার্ডটি প্রবেশ করান।
            </p>

            {authError && (
              <div className="w-full mb-4 p-2.5 bg-red-950/60 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="w-full space-y-3">
              <input
                type="password"
                required
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="পাসওয়ার্ড লিখুন..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-center text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 tracking-wider"
              />

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                অ্যাডমিন মোড আনলক করুন
              </button>
            </div>
          </form>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 overflow-y-auto no-scrollbar py-3 flex flex-col">
            {/* Top Stat Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-semibold text-zinc-300">
                  মোট ভিডিও: <strong className="text-white text-sm tabular-nums">{videos.length}</strong> / ১০০
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTokenSettings(!showTokenSettings)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                    githubToken
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                  title="GitHub সিঙ্ক সেটিংস"
                >
                  <Key className="w-3 h-3 text-emerald-400" />
                  {githubToken ? 'গিটহাব সিঙ্ক সক্রিয় ✓' : 'গিটহাব কানেক্ট করুন'}
                </button>
                <button
                  onClick={() => setIsAuthenticated(false)}
                  className="text-[11px] text-zinc-400 hover:text-white underline ml-1"
                >
                  লগআউট
                </button>
              </div>
            </div>

            {/* GitHub Token Setup Drawer (One-time connection) */}
            {showTokenSettings && (
              <form onSubmit={handleSaveToken} className="mb-3 p-3 bg-zinc-800/90 border border-emerald-500/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" />
                    GitHub Personal Access Token (PAT)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTokenSettings(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    বন্ধ
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  এই টোকেনটি দিলে আপনি ওয়েবসাইট থেকেই সেভ চাপলেই স্বয়ংক্রিয়ভাবে গিটহাবে <code>{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}</code> রিপোজিটরিতে জমা হবে এবং বিশ্বের সব ডিভাইসে ১ সেকেন্ডে ভিডিও লাইভ হয়ে যাবে!
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="github_pat_... বা ghp_... টোকেন পেস্ট করুন"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs"
                  >
                    সেভ
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400">
                  <a
                    href="https://github.com/settings/tokens?type=beta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-400 hover:underline flex items-center gap-1"
                  >
                    টোকেন কীভাবে তৈরি করবেন? (GitHub Settings ➔ Tokens) <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="text-zinc-300 hover:text-white flex items-center gap-1"
                  >
                    {isCopiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {isCopiedJson ? 'কপি হয়েছে' : 'ভিডিও JSON কপি করুন'}
                  </button>
                </div>
              </form>
            )}

            {/* Action Header */}
            {!showForm && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-zinc-400 font-medium">
                  ভিডিও স্লট তালিকা (১ থেকে ১০০)
                </span>
                <button
                  onClick={handleOpenAdd}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition"
                >
                  <Plus className="w-4 h-4" />
                  নতুন ভিডিও যোগ করুন
                </button>
              </div>
            )}

            {/* Form for Add/Edit */}
            {showForm ? (
              <form onSubmit={handleFormSubmit} className="bg-zinc-800/80 border border-zinc-700 rounded-2xl p-4 mb-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-700">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {editingVideoId ? 'ভিডিও পরিবর্তন / এডিট করুন' : '+ ড্রপবক্স থেকে নতুন ভিডিও যুক্ত করুন'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    বন্ধ
                  </button>
                </div>

                {formMsg && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                      formMsg.type === 'success'
                        ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                        : 'bg-red-950/60 border border-red-800 text-red-200'
                    }`}
                  >
                    {formMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{formMsg.text}</span>
                  </div>
                )}

                {/* Dropbox Link Input */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-rose-500" />
                    ড্রপবক্স ভিডিও লিঙ্ক (Dropbox Share Link) *
                  </label>
                  <input
                    type="text"
                    required
                    value={rawUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://www.dropbox.com/s/.../myvideo.mp4?dl=0"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                  {rawUrl.includes('dropbox.com') && (
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      ড্রপবক্স লিঙ্কটি সরাসরি ডিরেক্ট স্ট্রিমিং ও অফলাইন ক্যাশিং উপযোগী করা হয়েছে!
                    </p>
                  )}
                </div>

                {/* Video Title */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    ভিডিওর শিরোনাম (Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="যেমন: ভিডিও #১: আমার স্পেশাল ট্রাভেল রিলস..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Description & Tags */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    ক্যাপশন ও হ্যাশট্যাগ (Description)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ভিডিও সম্পর্কে কিছু কথা... #shorts #bangla #viral"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      ক্রিয়েটরের নাম
                    </label>
                    <input
                      type="text"
                      value={creator}
                      onChange={(e) => setCreator(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      অডিও সাউন্ড
                    </label>
                    <input
                      type="text"
                      value={audioTrack}
                      onChange={(e) => setAudioTrack(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Preview player */}
                {previewTestUrl && (
                  <div className="mt-2 p-2 bg-black/60 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                      টেস্ট প্রিভিউ রেডি
                    </span>
                    <a
                      href={previewTestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      লিংক চেক করুন
                    </a>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        সেভ ও সিঙ্ক হচ্ছে...
                      </>
                    ) : (
                      'সেভ করুন (সবার ফোনে লাইভ)'
                    )}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Video List (Slots 1 to 100) */}
            <div className="space-y-2">
              {videos.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  কোনো ভিডিও যোগ করা নেই। উপরের "+" বাটনে ক্লিক করে ড্রপবক্স থেকে ভিডিও যোগ করুন।
                </div>
              ) : (
                videos.map((vid, index) => (
                  <div
                    key={vid.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 hover:border-zinc-600 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 mr-2">
                      <span className="w-6 h-6 rounded-lg bg-zinc-700 text-zinc-300 font-bold text-[11px] flex items-center justify-center shrink-0 tabular-nums">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{vid.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[200px] md:max-w-xs">
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
                        className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition"
                        title="প্লে করুন"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(vid)}
                        className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition"
                        title="এডিট / পরিবর্তন"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(vid.id, vid.title)}
                        className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-800/50 text-rose-400 transition"
                        title="ডিলিট করুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1 text-zinc-500">
            <Lock className="w-3 h-3 text-zinc-500" />
            সুরক্ষিত ক্রিয়েটর স্টুডিও
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
