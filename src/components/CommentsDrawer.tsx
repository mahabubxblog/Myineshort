import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { UserComment } from '../types/video';
import { addComment, getCommentsForVideo } from '../services/storage';

interface CommentsDrawerProps {
  videoId: string;
  videoTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  videoId,
  videoTitle,
  isOpen,
  onClose,
  onCommentCountChange,
}) => {
  const [comments, setComments] = useState<UserComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('আমি');

  useEffect(() => {
    if (isOpen && videoId) {
      loadComments();
    }
  }, [isOpen, videoId]);

  const loadComments = async () => {
    const list = await getCommentsForVideo(videoId);
    setComments(list.sort((a, b) => b.createdAt - a.createdAt));
    if (onCommentCountChange) {
      onCommentCountChange(list.length);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const item: UserComment = {
      id: 'c_' + Date.now(),
      videoId,
      author: authorName.trim() || 'ব্যবহারকারী',
      text: newComment.trim(),
      createdAt: Date.now(),
    };

    await addComment(item);
    setNewComment('');
    await loadComments();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content */}
      <div className="relative w-full max-w-lg rounded-t-3xl bg-zinc-900 border-t border-zinc-800 text-white p-4 pb-6 flex flex-col max-h-[75vh] shadow-2xl z-10 animate-in slide-in-from-bottom duration-200">
        {/* Grab bar */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 px-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-rose-500" />
            <h3 className="font-semibold text-base">মন্তব্য ও নোট ({comments.length})</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mt-2 px-1 truncate">ভিডিও: {videoTitle}</p>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar min-h-[160px]">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              এখনও কোনো মন্তব্য বা ব্যক্তিগত নোট নেই। নিজের মন্তব্য বা নোট লিখুন!
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-zinc-200">{c.author}</span>
                  <span className="text-zinc-500">
                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{c.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="pt-2 border-t border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="মন্তব্য বা ব্যক্তিগত নোট লিখুন..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="p-2.5 rounded-full bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white transition flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
