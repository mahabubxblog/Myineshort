import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ma44332211';

app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed videos if file doesn't exist
const DEFAULT_SEED_VIDEOS = [
  {
    id: 'vid-1',
    slotNumber: 1,
    title: 'প্রকৃতির অপরূপ জলপ্রপাত ও শান্ত পরিবেশ 🌊',
    description: 'শান্ত জলপ্রপাতের শব্দ এবং পাহাড়ি সবুজ রূপ। মনের প্রশান্তির জন্য এই রিলসটি অসাধারণ। #nature #waterfall #reels',
    creator: 'মাহবুব ব্লগস',
    creatorHandle: '@mahabub_blogs',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tags: ['প্রকৃতি', 'রিলস', 'শান্তি'],
    audioTrack: 'শান্ত পাহাড়ি সুর - অরিজিনাল অডিও',
    likes: 1420,
    commentsCount: 88,
    sharesCount: 312,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: 'vid-2',
    slotNumber: 2,
    title: 'গতিময় শহরের রাতের রঙিন আলো 🌃',
    description: 'টোকিও ও সিউলের রাতের নিয়ন লাইটস ও ব্যস্ত জীবনধারা। সিনেমাটিক শর্টস! #citylights #tokyo #shorts',
    creator: 'নাইট ওয়াকার',
    creatorHandle: '@urban_explorer',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    tags: ['শহর', 'সিনেমাটিক', 'নাইটলাইফ'],
    audioTrack: 'Synthwave Night Ride - Lofi Beats',
    likes: 2890,
    commentsCount: 145,
    sharesCount: 520,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'vid-3',
    slotNumber: 3,
    title: 'স্পিড ও এডভেঞ্চার - চরম স্পোর্টস ও স্টান্ট 🛹',
    description: 'অ্যাড্রেনালিন রাশ! চরম স্কেটবোর্ড এবং ডাউনহিল রাইডিং মুহূর্ত। #sports #skate #action #bangla',
    creator: 'এক্সট্রিম স্পোর্টস বিডি',
    creatorHandle: '@extreme_bd',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    tags: ['স্পোর্টস', 'স্টান্ট', 'রোমাঞ্চ'],
    audioTrack: 'High Energy Beat - Bass Boosted',
    likes: 3410,
    commentsCount: 210,
    sharesCount: 780,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
  },
];

function getVideos(): any[] {
  if (!fs.existsSync(VIDEOS_FILE)) {
    fs.writeFileSync(VIDEOS_FILE, JSON.stringify(DEFAULT_SEED_VIDEOS, null, 2), 'utf-8');
    return DEFAULT_SEED_VIDEOS;
  }
  try {
    const raw = fs.readFileSync(VIDEOS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading videos file:', err);
    return DEFAULT_SEED_VIDEOS;
  }
}

function saveVideos(videos: any[]) {
  fs.writeFileSync(VIDEOS_FILE, JSON.stringify(videos, null, 2), 'utf-8');
}

// ----------------- API ENDPOINTS -----------------

// 1. Password Verification
app.post('/api/auth/verify', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'সফলভাবে লগইন হয়েছে!' });
  } else {
    res.status(401).json({ success: false, message: 'ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।' });
  }
});

// 2. Get Public Video Feed (Anyone can see this from any phone)
app.get('/api/videos', (_req: Request, res: Response) => {
  const videos = getVideos();
  res.json({ success: true, videos });
});

// 3. Add Video (Protected)
app.post('/api/videos', (req: Request, res: Response) => {
  const { password, video } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'অননুমোদিত এক্সেস! সঠিক পাসওয়ার্ড দিন।' });
  }

  if (!video || !video.videoUrl || !video.title) {
    return res.status(400).json({ success: false, message: 'ভিডিও লিংক এবং শিরোনাম আবশ্যক।' });
  }

  const currentVideos = getVideos();
  const nextSlot = currentVideos.length + 1;

  const newVideoItem = {
    ...video,
    id: video.id || `vid_${Date.now()}`,
    slotNumber: video.slotNumber || nextSlot,
    createdAt: Date.now(),
    likes: video.likes || 1,
    commentsCount: 0,
    sharesCount: 0,
  };

  // Prepend or append
  currentVideos.unshift(newVideoItem);
  saveVideos(currentVideos);

  res.json({ success: true, message: 'ভিডিও সফলভাবে যুক্ত হয়েছে!', video: newVideoItem });
});

// 4. Update / Edit Video (Protected)
app.put('/api/videos/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { password, updates } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'অননুমোদিত এক্সেস!' });
  }

  const currentVideos = getVideos();
  const index = currentVideos.findIndex((v) => v.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'ভিডিওটি পাওয়া যায়নি।' });
  }

  currentVideos[index] = { ...currentVideos[index], ...updates };
  saveVideos(currentVideos);

  res.json({ success: true, message: 'ভিডিও আপডেট হয়েছে!', video: currentVideos[index] });
});

// 5. Delete Video (Protected)
app.delete('/api/videos/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'অননুমোদিত এক্সেস!' });
  }

  let currentVideos = getVideos();
  const initialLen = currentVideos.length;
  currentVideos = currentVideos.filter((v) => v.id !== id);

  if (currentVideos.length === initialLen) {
    return res.status(404).json({ success: false, message: 'ভিডিওটি পাওয়া যায়নি।' });
  }

  saveVideos(currentVideos);
  res.json({ success: true, message: 'ভিডিওটি মুছে ফেলা হয়েছে!' });
});

// ----------------- VITE INTEGRATION -----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SnipTok Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
