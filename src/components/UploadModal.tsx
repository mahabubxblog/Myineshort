import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Film, CheckCircle2, AlertCircle } from 'lucide-react';
import { VideoItem } from '../types/video';
import { normalizeVideoUrl } from '../utils/urlParser';
import { saveCustomUploadedVideo } from '../services/storage';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoAdded: (newVideo: VideoItem) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onVideoAdded }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creator, setCreator] = useState('আমার ভিডিও');
  const [audioTrack, setAudioTrack] = useState('অরিজিনাল সাউন্ড');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMsg('দয়া করে সঠিক ভিডিও ফাইল নির্বাচন করুন (MP4, WebM, MOV ইত্যাদি)।');
      return;
    }

    // Free IndexedDB typically holds hundreds of MBs easily
    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('দয়া করে একটি শিরোনাম লিখুন।');
      return;
    }

    setIsSaving(true);

    try {
      const videoId = 'custom_' + Date.now();
      const tags = (description.match(/#[a-zA-Z0-9_\u0980-\u09FF]+/g) || ['#shorts', '#custom']).map(
        (t) => t.replace('#', '')
      );

      if (activeTab === 'file') {
        if (!selectedFile) {
          setErrorMsg('দয়া করে আপনার ডিভাইস থেকে একটি ভিডিও ফাইল সিলেক্ট করুন।');
          setIsSaving(false);
          return;
        }

        const newVideo: VideoItem = {
          id: videoId,
          title: title.trim(),
          description: description.trim() || title.trim(),
          creator: creator.trim() || 'আমার চ্যানেল',
          creatorHandle: '@' + (creator.trim().toLowerCase().replace(/\s+/g, '_') || 'me'),
          videoUrl: previewUrl || '',
          tags,
          audioTrack: audioTrack.trim() || 'অরিজিনাল সাউন্ড',
          likes: 1,
          commentsCount: 0,
          sharesCount: 0,
          isCustomUpload: true,
          isOfflineAvailable: true,
          offlineSize: selectedFile.size,
          createdAt: Date.now(),
        };

        await saveCustomUploadedVideo(newVideo, selectedFile);
        onVideoAdded(newVideo);
      } else {
        // Direct URL mode
        if (!videoUrlInput.trim()) {
          setErrorMsg('দয়া করে ভিডিও URL লিংক প্রদান করুন।');
          setIsSaving(false);
          return;
        }

        const normalizedUrl = normalizeVideoUrl(videoUrlInput.trim());

        const newVideo: VideoItem = {
          id: videoId,
          title: title.trim(),
          description: description.trim() || title.trim(),
          creator: creator.trim() || 'অনলাইন শর্টস',
          creatorHandle: '@online_feed',
          videoUrl: normalizedUrl,
          tags,
          audioTrack: audioTrack.trim() || 'অনলাইন অডিও',
          likes: 1,
          commentsCount: 0,
          sharesCount: 0,
          isCustomUpload: true,
          isOfflineAvailable: false,
          createdAt: Date.now(),
        };

        // If user wants to fetch and cache it now, we can convert
        try {
          const resp = await fetch(normalizedUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            if (blob.size > 0) {
              newVideo.isOfflineAvailable = true;
              newVideo.offlineSize = blob.size;
              await saveCustomUploadedVideo(newVideo, blob);
            } else {
              await saveCustomUploadedVideo(newVideo);
            }
          } else {
            await saveCustomUploadedVideo(newVideo);
          }
        } catch {
          // If CORS prevents direct fetch, save with URL
          await saveCustomUploadedVideo(newVideo);
        }

        onVideoAdded(newVideo);
      }

      // Close modal
      setIsSaving(false);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'ভিডিও যোগ করতে ব্যর্থ হয়েছে।';
      setErrorMsg(message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 text-white p-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold">নতুন কাস্টম ভিডিও যোগ করুন</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-zinc-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'file'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            ডিভাইস থেকে ফাইল
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              activeTab === 'url'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            অনলাইন ভিডিও লিংক
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto mt-4 space-y-4 no-scrollbar pr-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'file' ? (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                ভিডিও ফাইল নির্বাচন করুন (MP4, WebM, MOV)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-rose-500/70 rounded-xl p-5 text-center cursor-pointer bg-zinc-800/40 hover:bg-zinc-800/70 transition flex flex-col items-center justify-center gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
                    <span className="text-sm font-semibold text-zinc-200">{selectedFile.name}</span>
                    <span className="text-xs text-zinc-400">
                      সাইজ: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <span className="text-[11px] text-emerald-400 mt-1">
                      ✓ এটি স্বয়ংক্রিয়ভাবে ব্রাউজারের অফলাইনে সেভ হবে (কোনো খরচ নেই)
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-zinc-400" />
                    <p className="text-xs font-medium text-zinc-300">
                      কম্পিউটার বা মোবাইল থেকে ভিডিও বাছাই করতে ট্যাপ করুন
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      ব্যক্তিগত ব্যবহারের জন্য সম্পূর্ণ ফ্রি এবং সরাসরি আপনার ডিভাইসে ক্যাশ হবে
                    </p>
                  </>
                )}
              </div>

              {previewUrl && (
                <div className="mt-3 rounded-lg overflow-hidden border border-zinc-800 bg-black aspect-[9/14] max-h-48 mx-auto flex items-center justify-center">
                  <video src={previewUrl} controls className="max-h-full max-w-full" />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                সরাসরি ভিডিও URL লিংক
              </label>
              <input
                type="url"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://example.com/my-short-video.mp4"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                সরাসরি MP4 বা WebM ফাইল লিংক পেস্ট করুন।
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              ভিডিওর শিরোনাম (Title) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: আমার স্পেশাল ট্রাভেল রিলস..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              ক্যাপশন ও হ্যাশট্যাগ (Description)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ভিডিও সম্পর্কে কিছু লিখুন... #shorts #bangla #viral"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                ক্রিয়েটর নাম
              </label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="আপনার নাম"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                অডিও ট্র্যাক
              </label>
              <input
                type="text"
                value={audioTrack}
                onChange={(e) => setAudioTrack(e.target.value)}
                placeholder="অরিজিনাল অডিও"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-zinc-700 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium text-xs shadow-md shadow-rose-600/30 flex items-center gap-2 transition"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  সংরক্ষণ করা হচ্ছে...
                </>
              ) : (
                'ভিডিও যুক্ত করুন'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
