
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json'); // Use absolute path

const ADMIN_HASH = "14620c325c044b76c8c084605e54d89069d72115162a5b678f2e293a3889021e"; 

// Default Data Structure
const DEFAULT_DATA = {
  posts: [
    {
        id: '1',
        title: '欢迎使用电波 FM (动态版)',
        excerpt: '这是一个测试条目，表明你的 VPS 服务器配置成功。',
        content: '# 服务器连接成功\n\n如果你的所有数据都能正常保存，说明后端 API 运行正常。',
        tags: ['系统'],
        coverImage: 'https://picsum.photos/800/400?random=1',
        createdAt: Date.now(),
        author: 'System',
        category: '指南',
        isPinned: true
    }
  ],
  categories: ['指南', '脚本', '设定', '资源'],
  announcements: [
    { id: '1', content: 'Server is online.', isActive: true }
  ],
  links: [],
  siteConfig: {
    siteName: '电波FM',
    avatarUrl: 'https://github.com/Colerith.png',
    startDate: '2024-01-01'
  }
};

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- Data Layer Helpers ---

async function initData() {
    try {
        await fs.access(DATA_FILE);
        console.log('Database file found:', DATA_FILE);
    } catch (e) {
        console.log('Creating new data file at:', DATA_FILE);
        await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    }
}

async function readData() {
    try {
        const raw = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error reading data:", e);
        return DEFAULT_DATA;
    }
}

async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- API Routes ---

app.get('/api/data', async (req, res) => {
    try {
        console.log('GET /api/data request received');
        const data = await readData();
        res.json(data);
    } catch (error) {
        console.error('GET /api/data error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/save', async (req, res) => {
    console.log('POST /api/save request received');
    const { data } = req.body;
    try {
        const currentData = await readData();
        const newData = { ...currentData, ...data };
        await writeData(newData);
        res.json({ success: true });
    } catch (e) {
        console.error('POST /api/save error:', e);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

app.post('/api/login', async (req, res) => {
    const { key } = req.body;
    res.json({ success: true }); 
});

// --- Serve Static Frontend ---
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Start Server ---
initData().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Open http://localhost:${PORT} in your browser`);
    });
}).catch(err => {
    console.error("Failed to initialize server:", err);
});
