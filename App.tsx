
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { HashRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { LayoutGrid, List, Plus, LogIn, LogOut, ChevronLeft, ArrowRight, Github, ExternalLink, Trash2, PlusCircle, Eye, Search, ArrowUp, Pin, Settings, LayoutDashboard, Menu, X, RefreshCw, GripVertical, Bell, ChevronRight, ChevronDown, Megaphone, Radio, Edit3, Key, BarChart3, Globe, Link as LinkIcon, ArrowDown, Calendar, Download, Save, Moon, Sun, Waves, Activity, FileCode, ListMusic, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Post, INITIAL_POSTS, INITIAL_LINKS, FriendlyLink, EditorState, ViewMode, Announcement, INITIAL_ANNOUNCEMENTS, DEFAULT_CATEGORIES, SiteConfig, DEFAULT_SITE_CONFIG } from './types';
import { GalleryCard } from './components/GalleryCard';
import { Button } from './components/Button';
import { EditorModal } from './components/EditorModal';

// --- Security Helper ---
// SHA-256 hash for 'fishy0517home'. 
const ADMIN_HASH = "72d5ca73780ebff2deba2ce5899c86a5582514b9e56760e36ef56a68219a5171";

// Storage Keys
const KEYS = {
  POSTS: 'ew_posts',
  CATEGORIES: 'ew_categories',
  ANNOUNCEMENTS: 'ew_announcements',
  LINKS: 'ew_links',
  CONFIG: 'ew_site_config',
  DAILY_WAVE_CONFIG: 'ew_daily_wave_config',
  ADMIN: 'ew_admin_logged_in',
  THEME: 'ew_theme_mode',
  GITHUB_CONFIG: 'ew_github_config',
  DATA_HISTORY: 'ew_data_history',
  LAST_SEEN_PUBLISHED_HASH: 'ew_last_seen_published_hash',
  EDITED_TIME_MAP: 'ew_post_edited_time_map'
};

interface DataBundle {
  posts: Post[];
  categories: string[];
  announcements: Announcement[];
  links: FriendlyLink[];
  siteConfig: SiteConfig;
}

interface VersionSnapshot extends DataBundle {
  hash: string;
  savedAt: number;
  source: 'published' | 'local' | 'history';
}

interface VersionChoice {
  id: string;
  title: string;
  description: string;
  snapshot: VersionSnapshot;
}

// 轻量字符串哈希（避免引入额外依赖）
const hashString = (input: string) => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & hash;
  }
  return `h${(hash >>> 0).toString(16)}`;
};

const createSnapshot = (
  bundle: DataBundle,
  source: VersionSnapshot['source'],
  savedAt = Date.now()
): VersionSnapshot => {
  const hash = hashString(JSON.stringify(bundle));
  return { ...bundle, hash, source, savedAt };
};

const applyBundleToStorage = (bundle: DataBundle) => {
  localStorage.setItem(KEYS.POSTS, JSON.stringify(bundle.posts));
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(bundle.categories));
  localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(bundle.announcements));
  localStorage.setItem(KEYS.LINKS, JSON.stringify(bundle.links));
  localStorage.setItem(KEYS.CONFIG, JSON.stringify(bundle.siteConfig));
};

const formatVersionTime = (timestamp: number) => new Date(timestamp).toLocaleString();

interface GitHubConfig {
  username: string;
  repo: string;
  branch: string;
  filePath: string;
  dailyWaveConfigPath: string;
  assetPath: string;
  token: string;
  autoSync: boolean;
  syncInterval: number; // minutes
}

const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  username: '',
  repo: '',
  branch: 'main',
  filePath: 'src/types.ts',
  dailyWaveConfigPath: 'public/daily-wave-config.json',
  assetPath: 'public/uploads',
  token: '',
  autoSync: false,
  syncInterval: 30
};

interface DailyWaveEntry {
  id: string;
  date?: string;
  title?: string;
  content: string;
  from?: string;
  tags?: string[];
}

interface DailyWaveConfig {
  updatedAt?: string;
  timezone?: string;
  items: DailyWaveEntry[];
}

const DAILY_WAVE_CONFIG_URL = '/daily-wave-config.json';

const DEFAULT_DAILY_WAVE_CONFIG: DailyWaveConfig = {
  updatedAt: '2026-05-10T00:00:00+08:00',
  timezone: 'Asia/Shanghai',
  items: [
    {
      id: 'fallback-wave',
      title: '今日电波',
      content: '今天也要好好生活。',
      from: '电波FM',
      tags: ['默认']
    }
  ]
};

const INTERNATIONAL_FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '元旦',
  '02-14': '情人节',
  '03-08': '妇女节',
  '04-01': '愚人节',
  '05-01': '劳动节',
  '06-01': '儿童节',
  '10-01': '国庆节',
  '10-31': '万圣节',
  '12-24': '平安夜',
  '12-25': '圣诞节'
};

const SOLAR_TERM_TABLE = [
  { name: '小寒', c20: 6.11, c21: 5.4055 },
  { name: '大寒', c20: 20.84, c21: 20.12 },
  { name: '立春', c20: 4.6295, c21: 3.87 },
  { name: '雨水', c20: 19.4599, c21: 18.73 },
  { name: '惊蛰', c20: 6.3826, c21: 5.63 },
  { name: '春分', c20: 21.4155, c21: 20.646 },
  { name: '清明', c20: 5.59, c21: 4.81 },
  { name: '谷雨', c20: 20.888, c21: 20.1 },
  { name: '立夏', c20: 6.318, c21: 5.52 },
  { name: '小满', c20: 21.86, c21: 21.04 },
  { name: '芒种', c20: 6.5, c21: 5.678 },
  { name: '夏至', c20: 22.2, c21: 21.37 },
  { name: '小暑', c20: 7.928, c21: 7.108 },
  { name: '大暑', c20: 23.65, c21: 22.83 },
  { name: '立秋', c20: 8.35, c21: 7.5 },
  { name: '处暑', c20: 23.95, c21: 23.13 },
  { name: '白露', c20: 8.44, c21: 7.646 },
  { name: '秋分', c20: 23.822, c21: 23.042 },
  { name: '寒露', c20: 9.098, c21: 8.318 },
  { name: '霜降', c20: 24.218, c21: 23.438 },
  { name: '立冬', c20: 8.218, c21: 7.438 },
  { name: '小雪', c20: 23.08, c21: 22.36 },
  { name: '大雪', c20: 7.9, c21: 7.18 },
  { name: '冬至', c20: 22.6, c21: 21.94 }
];

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDailyWaveConfig = (raw: unknown): DailyWaveConfig | null => {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as DailyWaveConfig;
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return null;

  const cleanedItems = candidate.items
    .filter((item): item is DailyWaveEntry => !!item && typeof item.content === 'string' && item.content.trim().length > 0)
    .map((item, idx) => ({
      id: item.id || `daily-wave-${idx + 1}`,
      date: item.date,
      title: item.title,
      content: item.content,
      from: item.from,
      tags: Array.isArray(item.tags) ? item.tags : []
    }));

  if (cleanedItems.length === 0) return null;

  return {
    updatedAt: candidate.updatedAt,
    timezone: candidate.timezone,
    items: cleanedItems
  };
};

const getDayOffset = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
};

const pickDailyWave = (config: DailyWaveConfig, date: Date): DailyWaveEntry => {
  const dateKey = toDateKey(date);
  const exact = config.items.find(item => item.date === dateKey);
  if (exact) return exact;

  const index = getDayOffset(date) % config.items.length;
  return config.items[index];
};

const getChinaDateLabel = (date: Date) => {
  try {
    const lunar = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long',
      day: 'numeric'
    }).format(date);
    return `中国农历 ${lunar}`;
  } catch (_error) {
    return null;
  }
};

const getSolarTermLabel = (date: Date) => {
  const year = date.getFullYear();
  if (year < 1901 || year > 2099) return null;

  const yearOffset = year % 100;
  const month = date.getMonth();
  const day = date.getDate();

  const firstTerm = SOLAR_TERM_TABLE[month * 2];
  const secondTerm = SOLAR_TERM_TABLE[month * 2 + 1];

  const firstDay = Math.floor(yearOffset * 0.2422 + (year >= 2000 ? firstTerm.c21 : firstTerm.c20)) - Math.floor((yearOffset - 1) / 4);
  const secondDay = Math.floor(yearOffset * 0.2422 + (year >= 2000 ? secondTerm.c21 : secondTerm.c20)) - Math.floor((yearOffset - 1) / 4);

  if (day === firstDay) return firstTerm.name;
  if (day === secondDay) return secondTerm.name;
  return null;
};

const getNthWeekday = (year: number, month: number, weekday: number, nth: number) => {
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  return 1 + offset + (nth - 1) * 7;
};

const getInternationalHolidayLabel = (date: Date) => {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (INTERNATIONAL_FIXED_HOLIDAYS[mmdd]) {
    return INTERNATIONAL_FIXED_HOLIDAYS[mmdd];
  }

  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();

  // 母亲节：五月第二个周日
  if (month === 4 && weekday === 0 && day === getNthWeekday(year, 4, 0, 2)) {
    return '母亲节';
  }

  // 父亲节：六月第三个周日
  if (month === 5 && weekday === 0 && day === getNthWeekday(year, 5, 0, 3)) {
    return '父亲节';
  }

  // 感恩节：十一月第四个周四
  if (month === 10 && weekday === 4 && day === getNthWeekday(year, 10, 4, 4)) {
    return '感恩节';
  }

  return null;
};

const getTodayWaveBadges = (date: Date) => {
  const labels: string[] = [];
  const chinaDate = getChinaDateLabel(date);
  const solarTerm = getSolarTermLabel(date);
  const international = getInternationalHolidayLabel(date);

  if (chinaDate) labels.push(chinaDate);
  if (solarTerm) labels.push(`节气 ${solarTerm}`);
  if (international) labels.push(`国际节日 ${international}`);

  return labels;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const sanitizeFileName = (name: string) => {
  const dotIndex = name.lastIndexOf('.');
  const base = (dotIndex >= 0 ? name.slice(0, dotIndex) : name)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image';
  const ext = dotIndex >= 0 ? name.slice(dotIndex).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  return `${base}${ext}`;
};

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

async function digestMessage(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Helper to load from storage or fallback to default
function loadState<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.warn(`Failed to load ${key} from storage`, e);
    return fallback;
  }
}

// Generate the content string for types.ts
const generateTypesFileContent = (
    posts: Post[], 
    categories: string[], 
    announcements: Announcement[], 
    links: FriendlyLink[], 
    siteConfig: SiteConfig
) => {
    const bundleForHash = { posts, categories, announcements, links, siteConfig };
    const versionHash = hashString(JSON.stringify(bundleForHash));
    const generatedAt = new Date().toISOString();

    return `
export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string; // Now supports Markdown
  tags: string[];
  coverImage: string;
  createdAt: number;
  author: string;
  category: string; // Dynamic category
  isPinned?: boolean;
}

export interface FriendlyLink {
  id: string;
  title: string;
  url: string;
}

export interface Announcement {
    id: string;
    content: string;
    isActive: boolean;
}

export interface SiteConfig {
    siteName: string;
    avatarUrl: string;
    startDate: string; // Format: YYYY-MM-DD
}

export const DATA_VERSION = {
  hash: '${versionHash}',
  generatedAt: '${generatedAt}'
} as const;

export type ViewMode = 'gallery' | 'list';

export interface EditorState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  currentPost: Post | null;
}

export const DEFAULT_CATEGORIES = ${JSON.stringify(categories, null, 2)};

export const DEFAULT_SITE_CONFIG: SiteConfig = ${JSON.stringify(siteConfig, null, 2)};

export const INITIAL_POSTS: Post[] = ${JSON.stringify(posts, null, 2)};

export const INITIAL_LINKS: FriendlyLink[] = ${JSON.stringify(links, null, 2)};

export const INITIAL_ANNOUNCEMENTS: Announcement[] = ${JSON.stringify(announcements, null, 2)};
`;
};

// Helper to preserve multiple blank lines while respecting code blocks
const preprocessContent = (content: string) => {
  if (!content) return '';
  // Split by code blocks to avoid modifying content inside them
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map(part => {
    // If it starts with ``` it's a code block, return as is
    if (part.startsWith('```')) return part;
    
    // Otherwise replace sequences of 3+ newlines with empty paragraphs
    return part.replace(/\n{3,}/g, (match) => {
      const count = match.length;
      return '\n\n' + Array(count - 2).fill('&nbsp;\n\n').join('');
    });
  }).join('');
};

// --- Shared Components ---

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.scrollY > 400);
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  return (
    <button onClick={scrollToTop} className={`fixed bottom-10 right-10 z-40 p-3 bg-white dark:bg-slate-700 text-zine-blue dark:text-white border border-gray-200 dark:border-gray-600 shadow-soft rounded-full transition-all duration-500 hover:scale-110 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
      <ArrowUp size={20} strokeWidth={1} />
    </button>
  );
};

// --- ECG Visualizer Component ---
const ECGVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // === 配置区域 ===
  // 扫描速度
  const SPEED = 4; 
  // 线条透明度配置 (0.0 - 1.0)
  const OPACITY_CONFIG = {
    dark: 0.5,   // 暗色模式下的线条不透明度
    light: 0.3  // 亮色模式下的线条不透明度
  };
  // === 配置结束 ===

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let x = 0;
    
    // Resize handler
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = canvas.offsetHeight;
      x = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    // Heartbeat State Machine
    let state = 'flat'; // States: flat, p, q, r, s, t
    let stateStep = 0;
    let nextBeatDistance = Math.random() * 200 + 100; // Random distance until next beat

    // Re-implementing draw with better state tracking for line continuity
    let prevY = canvas.height / 2;

    const animate = () => {
       const w = canvas.width;
       const h = canvas.height;
       const baseline = h / 2;
       const amplitude = 50;

       // Theme update check (inefficient to do every frame but robust for toggle)
       const isDark = document.documentElement.classList.contains('dark');
       
       // Dynamic Style based on config
       const opacity = isDark ? OPACITY_CONFIG.dark : OPACITY_CONFIG.light;
       ctx.strokeStyle = isDark ? `rgba(96, 165, 250, ${opacity})` : `rgba(27, 60, 115, ${opacity})`;
       ctx.shadowColor = isDark ? `rgba(96, 165, 250, ${opacity * 0.5})` : `rgba(27, 60, 115, ${opacity * 0.5})`;
       
       ctx.lineWidth = 2;
       ctx.lineJoin = 'round';
       ctx.lineCap = 'round';
       ctx.shadowBlur = 4;

       // Eraser
       ctx.clearRect(x, 0, 40, h); // Clear ahead

       ctx.beginPath();
       ctx.moveTo(x, prevY);

       x += SPEED;
       
       // Loop x
       if (x > w) {
           x = 0;
           ctx.moveTo(0, baseline);
           prevY = baseline; // Reset
       }

       // Calculate Y based on state
       let y = baseline;

       if (state === 'flat') {
           // Add some noise
           y = baseline + (Math.random() - 0.5) * 4;
           nextBeatDistance -= SPEED;
           if (nextBeatDistance <= 0) {
               state = 'p';
               stateStep = 0;
           }
       } else if (state === 'p') {
           // P wave: small bump up
           y = baseline - Math.sin(stateStep * Math.PI) * 10;
           stateStep += 0.15;
           if (stateStep >= 1) { state = 'wait_q'; stateStep = 0; y = baseline; }
       } else if (state === 'wait_q') {
           y = baseline;
           stateStep += 0.3;
           if (stateStep >= 1) { state = 'q'; stateStep = 0; }
       } else if (state === 'q') {
           // Q: slight dip
           y = baseline + 10;
           state = 'r';
       } else if (state === 'r') {
           // R: Big spike up
           y = baseline - amplitude;
           state = 's';
       } else if (state === 's') {
           // S: Dip down
           y = baseline + 15;
           state = 'wait_t';
       } else if (state === 'wait_t') {
           y = baseline; 
           stateStep += 0.2;
           if (stateStep >= 1) { state = 't'; stateStep = 0; }
       } else if (state === 't') {
           // T wave: medium bump
           y = baseline - Math.sin(stateStep * Math.PI) * 15;
           stateStep += 0.1;
           if (stateStep >= 1) { 
               state = 'flat'; 
               stateStep = 0; 
               y = baseline;
               nextBeatDistance = Math.random() * 400 + 100; // Reset timer
           }
       }

       ctx.lineTo(x, y);
       ctx.stroke();
       prevY = y;

       animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};


const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: (key: string) => void }> = ({ isOpen, onClose, onLogin }) => {
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!key) return;
    setIsLoading(true);
    // Small delay to prevent timing attacks and show UI feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    await onLogin(key);
    setIsLoading(false);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-zine-blue text-white rounded-full flex items-center justify-center mb-6 shadow-lg"><Github size={32} /></div>
        <h2 className="text-xl font-serif font-bold text-zine-blue dark:text-white mb-2">管理权认证</h2>
        <div className="w-full space-y-4">
          <input 
            type="password" 
            value={key} 
            onChange={(e) => setKey(e.target.value)} 
            placeholder="输入管理密钥..." 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none text-center dark:text-white" 
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} 
          />
          <Button onClick={handleSubmit} className="w-full !py-3 !rounded-xl" disabled={isLoading}>
            {isLoading ? '验证中...' : '授权登录'}
          </Button>
          <button onClick={onClose} className="w-full text-xs text-gray-400 py-2">取消访问</button>
        </div>
      </div>
    </div>
  );
};

const VersionConflictModal: React.FC<{
  isOpen: boolean;
  choices: VersionChoice[];
  onConfirm: (choice: VersionChoice) => void;
}> = ({ isOpen, choices, onConfirm }) => {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!isOpen || choices.length === 0) return;
    setSelectedId(choices[0].id);
  }, [isOpen, choices]);

  if (!isOpen) return null;

  const selected = choices.find(c => c.id === selectedId) || choices[0];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold font-serif text-zine-blue dark:text-white flex items-center gap-2">
            <AlertCircle size={18} className="text-zine-pink" />
            检测到多版本数据，请选择要采用的版本
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">你当前设备存在未同步数据，同时线上也有新更新。请选择要保留的版本。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="max-h-[360px] overflow-y-auto border-r border-gray-100 dark:border-gray-700">
            {choices.map(choice => (
              <button
                key={choice.id}
                onClick={() => setSelectedId(choice.id)}
                className={`w-full text-left px-4 py-4 border-b border-gray-100 dark:border-gray-700 transition-colors ${selectedId === choice.id ? 'bg-zine-blue/5 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/40'}`}
              >
                <div className="font-bold text-sm text-zine-blue dark:text-gray-100">{choice.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{choice.description}</div>
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            <h4 className="font-bold text-sm text-zine-blue dark:text-gray-100">版本对比</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg p-3">文章数：<span className="font-bold">{selected.snapshot.posts.length}</span></div>
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg p-3">分区数：<span className="font-bold">{selected.snapshot.categories.length}</span></div>
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg p-3">公告数：<span className="font-bold">{selected.snapshot.announcements.length}</span></div>
              <div className="bg-gray-50 dark:bg-slate-700/40 rounded-lg p-3">友链数：<span className="font-bold">{selected.snapshot.links.length}</span></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              站点名：<span className="font-bold text-zine-blue dark:text-gray-100">{selected.snapshot.siteConfig.siteName}</span>
            </div>
            <div className="text-xs text-gray-400 font-mono break-all">Hash: {selected.snapshot.hash}</div>

            <Button className="w-full mt-2" onClick={() => onConfirm(selected)}>
              采用该版本
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}> = ({ value, onChange, options, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      zIndex: 300
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();

    const onViewportChange = () => updateMenuPosition();
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open]);

  const current = options.find(o => o.value === value)?.label ?? options[0]?.label ?? '';

  const dropdownMenu = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className="fixed origin-top rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md shadow-2xl"
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onChange(option.value);
            setOpen(false);
          }}
          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === option.value ? 'bg-zine-blue/10 dark:bg-blue-900/30 text-zine-blue dark:text-blue-200 font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={wrapRef} className={`relative z-[80] ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen(prev => !prev);
        }}
        className="min-w-[180px] px-4 py-2 rounded-full text-sm text-left bg-white/90 dark:bg-slate-800/90 border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:border-zine-blue/40 dark:hover:border-zine-pink/50 transition-all duration-300 flex items-center justify-between"
      >
        <span className="truncate">{current}</span>
        <ChevronDown size={16} className={`ml-3 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      {mounted ? createPortal(dropdownMenu, document.body) : dropdownMenu}
    </div>
  );
};

const Header: React.FC<{ isAdmin: boolean; isDark: boolean; toggleTheme: () => void; onLoginClick: () => void; onLogout: () => void; onNewPost: () => void; searchQuery: string; setSearchQuery: (q: string) => void; siteConfig: SiteConfig; }> = ({ isAdmin, isDark, toggleTheme, onLoginClick, onLogout, onNewPost, searchQuery, setSearchQuery, siteConfig }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 h-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-4 sm:gap-8">
        <Link to="/" className="group flex flex-col justify-center shrink-0">
          <h1 className="text-2xl font-serif font-black text-zine-blue dark:text-white transition-colors leading-none mb-1 whitespace-nowrap">{siteConfig.siteName}<span className="text-zine-pink">.</span></h1>
          <span className="text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.3em] text-gray-400 group-hover:text-zine-blue dark:group-hover:text-zine-pink transition-colors leading-none whitespace-nowrap">Electric Wave</span>
        </Link>
        <div className="flex-1 max-w-sm relative hidden sm:block">
          <input type="text" placeholder="搜索频道..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-4 py-1.5 border-b border-gray-300 dark:border-gray-700 bg-transparent focus:border-zine-blue dark:focus:border-zine-pink outline-none text-sm font-serif dark:text-gray-200" />
          <Search className="absolute left-0 top-1.5 text-gray-400" size={16} />
        </div>
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          {/* Theme Toggle */}
          <button onClick={toggleTheme} className="text-gray-400 hover:text-zine-blue dark:hover:text-yellow-300 transition-colors p-1">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <a href="https://github.com/Colerith/electric-wave" target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity text-zine-blue dark:text-white p-1">
            <Github size={20} strokeWidth={1.5} />
          </a>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
          {isAdmin ? (
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="w-9 h-9 rounded-full overflow-hidden border-2 border-zine-pink hidden sm:block"><img src={siteConfig.avatarUrl} className="w-full h-full object-cover" alt="admin" /></Link>
              <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition-colors p-1"><LogOut size={18} /></button>
              <Button onClick={onNewPost} variant="primary" icon={<Plus size={16} />} className="!py-1.5 !px-4 !text-xs !rounded-full hidden sm:flex">发布</Button>
              <button onClick={onNewPost} className="sm:hidden text-zine-blue dark:text-white p-1"><PlusCircle size={24}/></button>
            </div>
          ) : (
            <button onClick={onLoginClick} className="text-xs font-bold text-gray-400 hover:text-zine-blue dark:hover:text-white flex items-center gap-2 px-2 py-1"><LogIn size={14} /> <span className="hidden sm:inline">登录</span></button>
          )}
        </div>
      </div>
    </header>
  );
};

const Footer: React.FC<{ links: FriendlyLink[]; isAdmin: boolean; visitorCount: number; siteConfig: SiteConfig }> = ({ links, isAdmin, siteConfig }) => {
    // Dynamic running days calculation
    const daysRunning = useMemo(() => {
        const start = new Date(siteConfig.startDate).getTime();
        const now = Date.now();
        const diff = now - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }, [siteConfig.startDate]);

    return (
        <footer className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-gray-800 py-12 mt-auto transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    <div>
                        <h4 className="font-serif font-bold text-zine-blue dark:text-gray-200 mb-4 flex items-center gap-2"><Globe size={16}/> 站点统计</h4>
                        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 font-serif">
                           <div className="flex items-center gap-2">
                             <Eye size={14} className="text-zine-pink" />
                             访客数: <span id="busuanzi_value_site_uv" className="font-bold text-zine-blue dark:text-white">--</span>
                           </div>
                           <div className="flex items-center gap-2">
                            <BarChart3 size={14} className="text-zine-pink" />
                            总浏览量: <span id="busuanzi_value_site_pv" className="font-bold text-zine-blue dark:text-white">--</span>
                             </div>
                             <div className="flex items-center gap-2">
                                 <Calendar size={14} className="text-zine-pink" />
                                 运行天数: <span className="font-bold text-zine-blue dark:text-white">{daysRunning > 0 ? daysRunning : 0} 天</span>
                             </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-serif font-bold text-zine-blue dark:text-gray-200 mb-4 flex items-center gap-2">
                            <LinkIcon size={16}/> 友情链接
                            {isAdmin && <Link to="/dashboard" className="text-xs text-gray-300 hover:text-zine-pink ml-2 font-normal underline">管理</Link>}
                        </h4>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {links.map(link => (
                                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-zine-pink dark:text-gray-400 dark:hover:text-zine-pink transition-colors font-serif border-b border-dashed border-gray-300 dark:border-gray-700 hover:border-zine-pink pb-0.5">{link.title}</a>
                            ))}
                        </div>
                    </div>
                    <div className="md:text-right">
                        <h4 className="font-serif font-bold text-zine-blue dark:text-gray-200 mb-4">电波FM.</h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-xs ml-auto">
                            {/* 修改页脚版权文字区域 */}
                           © {new Date().getFullYear()} 电波系. <br/>
                            一个温暖的自给自足的小世界. <br/>
                        </p>
                    </div>
                </div>
                <div className="text-center">
                     <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent mb-6"></div>
                     <p className="text-[10px] text-gray-300 dark:text-gray-600 uppercase tracking-widest">End of Transmission</p>
                </div>
            </div>
        </footer>
    );
};

const AnnouncementGallery: React.FC<{ announcements: Announcement[] }> = ({ announcements }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const activeAnnouncements = announcements.filter(a => a.isActive);
    useEffect(() => {
        if (activeAnnouncements.length <= 1) return;
        const interval = setInterval(() => setCurrentIndex(prev => (prev + 1) % activeAnnouncements.length), 8000);
        return () => clearInterval(interval);
    }, [activeAnnouncements.length]);
    if (activeAnnouncements.length === 0) return null;
    return (
        <section className="mb-20">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><Megaphone size={14} className="text-zine-pink"/> 公告板</h3>
            <div className="relative bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-soft rounded-2xl p-8 md:p-12 min-h-[280px] flex flex-col justify-center overflow-hidden transition-colors">
                {activeAnnouncements.map((ann, idx) => (
                    <div key={ann.id} className={`transition-all duration-700 absolute inset-0 p-8 flex flex-col justify-center ${idx === currentIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
                        {/* Allow line breaks in announcement */}
                        <div className="font-serif text-xl md:text-2xl font-bold text-zine-blue dark:text-gray-100 leading-relaxed whitespace-pre-wrap">{ann.content}</div>
                        <div className="mt-6 flex gap-2 items-center">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zine-pink/10 text-zine-pink"><Radio size={12} /></span>
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">NEWS FLASH</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

// --- Dashboard Component (Enhanced) ---

const Dashboard: React.FC<{ 
    posts: Post[]; 
    categories: string[]; 
    announcements: Announcement[]; 
    links: FriendlyLink[];
    siteConfig: SiteConfig;
  dailyWaveConfigText: string;
  onUpdateDailyWaveConfigText: (text: string) => void;
  onApplyDailyWaveConfigText: () => void;
    onUpdatePosts: (posts: Post[]) => void; 
    onUpdateCategories: (cats: string[]) => void; 
    onUpdateAnnouncements: (anns: Announcement[]) => void; 
    onUpdateLinks: (links: FriendlyLink[]) => void;
    onUpdateSiteConfig: (config: SiteConfig) => void;
    onEditPost: (p: Post) => void; 
    onDeletePost: (id: string) => void; 
}> = ({ posts, categories, announcements, links, siteConfig, dailyWaveConfigText, onUpdateDailyWaveConfigText, onApplyDailyWaveConfigText, onUpdatePosts, onUpdateCategories, onUpdateAnnouncements, onUpdateLinks, onUpdateSiteConfig, onEditPost, onDeletePost }) => {
    const [activeTab, setActiveTab] = useState<'posts' | 'announcements' | 'categories' | 'links' | 'settings'>('posts');
    const [newCategory, setNewCategory] = useState('');
    const [newLink, setNewLink] = useState({ title: '', url: '' });
    const [newAnnouncement, setNewAnnouncement] = useState('');
    
    // GitHub Sync State
    const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => loadState(KEYS.GITHUB_CONFIG, DEFAULT_GITHUB_CONFIG));
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncingDailyWave, setIsSyncingDailyWave] = useState(false);
    const [syncStatus, setSyncStatus] = useState<{success: boolean, message: string, time: string} | null>(null);
    const [draggingPostId, setDraggingPostId] = useState<string | null>(null);

    const orderedPosts = useMemo(() => {
        const pinned = posts.filter(p => p.isPinned);
        const normal = posts.filter(p => !p.isPinned);
        return [...pinned, ...normal];
    }, [posts]);

    // Save GitHub config whenever it changes
    useEffect(() => {
        localStorage.setItem(KEYS.GITHUB_CONFIG, JSON.stringify(ghConfig));
    }, [ghConfig]);

    // Auto-sync logic
    useEffect(() => {
        if (!ghConfig.autoSync || ghConfig.syncInterval <= 0 || !ghConfig.token || !ghConfig.username || !ghConfig.repo) return;

        const intervalId = setInterval(() => {
            handleGitHubSync(true);
        }, ghConfig.syncInterval * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [ghConfig, posts, categories, announcements, links, siteConfig]);

    const handleExportTs = () => {
        const typesFileContent = generateTypesFileContent(posts, categories, announcements, links, siteConfig);
        const blob = new Blob([typesFileContent], { type: 'text/typescript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `types.ts`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

      const putTextFileToGitHub = async (path: string, content: string, message: string) => {
        const apiUrl = `https://api.github.com/repos/${ghConfig.username}/${ghConfig.repo}/contents/${path}`;

        const getRes = await fetch(`${apiUrl}?ref=${ghConfig.branch}`, {
          headers: {
            'Authorization': `token ${ghConfig.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        let sha = '';
        if (getRes.ok) {
          const data = await getRes.json();
          sha = data.sha;
        } else if (getRes.status !== 404) {
          throw new Error(`Failed to fetch file: ${getRes.statusText}`);
        }

        const base64Content = btoa(unescape(encodeURIComponent(content)));
        const putRes = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${ghConfig.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            content: base64Content,
            branch: ghConfig.branch,
            sha: sha || undefined
          })
        });

        if (!putRes.ok) {
          const errData = await putRes.json();
          throw new Error(errData.message || 'Update failed');
        }
      };

    const handleGitHubSync = async (isAuto = false) => {
        if (!ghConfig.username || !ghConfig.repo || !ghConfig.token) {
            setSyncStatus({ success: false, message: '请完善 GitHub 配置', time: new Date().toLocaleTimeString() });
            return;
        }

        setIsSyncing(true);
        try {
            const content = generateTypesFileContent(posts, categories, announcements, links, siteConfig);
            await putTextFileToGitHub(
              ghConfig.filePath,
              content,
              isAuto ? 'Auto-sync: Update data' : 'Manual sync: Update data via Dashboard'
            );

            setSyncStatus({ success: true, message: 'GitHub 同步成功', time: new Date().toLocaleTimeString() });
        } catch (error: any) {
            setSyncStatus({ success: false, message: `同步失败: ${error.message}`, time: new Date().toLocaleTimeString() });
            if (!isAuto) alert(`GitHub Sync Failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncDailyWaveConfig = async () => {
      if (!ghConfig.username || !ghConfig.repo || !ghConfig.token) {
        setSyncStatus({ success: false, message: '请完善 GitHub 配置', time: new Date().toLocaleTimeString() });
        return;
      }

      setIsSyncingDailyWave(true);
      try {
        await putTextFileToGitHub(
          ghConfig.dailyWaveConfigPath,
          dailyWaveConfigText,
          'Manual sync: Update daily wave config via Dashboard'
        );
        setSyncStatus({ success: true, message: '每日电波配置已推送到 GitHub', time: new Date().toLocaleTimeString() });
      } catch (error: any) {
        setSyncStatus({ success: false, message: `推送失败: ${error.message}`, time: new Date().toLocaleTimeString() });
        alert(`Daily Wave Sync Failed: ${error.message}`);
      } finally {
        setIsSyncingDailyWave(false);
      }
    };

    // Helpers for sorting
    const moveItem = <T,>(arr: T[], index: number, direction: 'up' | 'down'): T[] => {
        const newArr = [...arr];
        if (direction === 'up' && index > 0) {
            [newArr[index], newArr[index - 1]] = [newArr[index - 1], newArr[index]];
        } else if (direction === 'down' && index < arr.length - 1) {
            [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
        }
        return newArr;
    };

    const movePostBefore = (arr: Post[], sourceId: string, targetId: string) => {
        const sourceIndex = arr.findIndex(p => p.id === sourceId);
        const targetIndex = arr.findIndex(p => p.id === targetId);
        if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return arr;

        const sourcePost = arr[sourceIndex];
        const targetPost = arr[targetIndex];
        if (!!sourcePost.isPinned !== !!targetPost.isPinned) {
            alert('置顶文章与普通文章分组显示，拖动排序仅在组内生效。');
            return arr;
        }

        const next = [...arr];
        const [item] = next.splice(sourceIndex, 1);
        const nextTargetIndex = next.findIndex(p => p.id === targetId);
        next.splice(nextTargetIndex, 0, item);
        return next;
    };

    return (
        // Expanded Dashboard Container
        <div className="w-[98%] max-w-[1920px] mx-auto px-4 md:px-8 py-8 h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-soft p-6 md:p-8 h-full flex flex-col md:flex-row gap-8 transition-colors rounded-xl overflow-hidden">
                <div className="w-full md:w-64 md:border-r border-gray-100 dark:border-gray-700 md:pr-6 space-y-2 shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-visible pb-2 md:pb-0 gap-2 md:gap-0">
                    <h2 className="text-xl font-serif font-bold text-zine-blue dark:text-white mb-6 hidden md:block">控制台</h2>
                    <button onClick={() => setActiveTab('posts')} className={`whitespace-nowrap w-auto md:w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'posts' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><LayoutDashboard className="inline mr-2 w-4 h-4"/>文章</button>
                    <button onClick={() => setActiveTab('announcements')} className={`whitespace-nowrap w-auto md:w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'announcements' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><Megaphone className="inline mr-2 w-4 h-4"/>公告</button>
                    <button onClick={() => setActiveTab('categories')} className={`whitespace-nowrap w-auto md:w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'categories' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><List className="inline mr-2 w-4 h-4"/>分区</button>
                    <button onClick={() => setActiveTab('links')} className={`whitespace-nowrap w-auto md:w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'links' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><LinkIcon className="inline mr-2 w-4 h-4"/>友链</button>
                    <button onClick={() => setActiveTab('settings')} className={`whitespace-nowrap w-auto md:w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'settings' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}><Settings className="inline mr-2 w-4 h-4"/>设置</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Posts Management */}
                    {activeTab === 'posts' && (
                        <div className="min-w-[600px]">
                        <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <GripVertical size={14} /> 支持拖拽排序（默认置顶文章在最上方）
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead className="text-xs uppercase text-gray-400 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-slate-800 z-10"><tr><th className="py-4">标题</th><th className="py-4">分类</th><th className="py-4">日期</th><th className="py-4 text-right">操作</th></tr></thead>
                            <tbody>
                                {orderedPosts.map(post => (
                                    <tr
                                      key={post.id}
                                      draggable
                                      onDragStart={() => setDraggingPostId(post.id)}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={() => {
                                        if (!draggingPostId || draggingPostId === post.id) return;
                                        onUpdatePosts(movePostBefore(orderedPosts, draggingPostId, post.id));
                                        setDraggingPostId(null);
                                      }}
                                      onDragEnd={() => setDraggingPostId(null)}
                                      className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <td className="py-4 font-serif font-bold text-zine-blue dark:text-gray-200 flex items-center gap-2 max-w-md truncate">
                                            <GripVertical size={14} className="text-gray-300 shrink-0" />
                                            {post.isPinned && <Pin size={12} className="text-zine-pink shrink-0" fill="currentColor"/>}
                                            {post.title}
                                        </td>
                                        <td className="py-4 text-xs text-gray-500"><span className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">{post.category}</span></td>
                                        <td className="py-4 text-xs text-gray-400 font-mono">{new Date(post.createdAt).toLocaleDateString()}</td>
                                        <td className="py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                              <button onClick={() => onEditPost(post)} className="text-gray-400 hover:text-zine-blue dark:hover:text-white"><Edit3 size={16}/></button>
                                              <button onClick={() => onDeletePost(post.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}

                    {/* Announcements Management */}
                    {activeTab === 'announcements' && (
                        <div className="space-y-6 max-w-4xl">
                            <div className="flex flex-col gap-2">
                                {/* Use Textarea for Newlines */}
                                <textarea value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} placeholder="发布新公告 (支持换行)..." className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white rounded-lg outline-none focus:border-zine-blue text-sm min-h-[100px]" />
                                <div className="text-right">
                                  <Button onClick={() => { if(newAnnouncement) { onUpdateAnnouncements([...announcements, {id: crypto.randomUUID(), content: newAnnouncement, isActive: true}]); setNewAnnouncement(''); } }} className="!py-2">添加</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {announcements.map((ann, idx) => (
                                    <div key={ann.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg group">
                                        <div className="flex flex-col gap-1 text-gray-400 mt-1">
                                            <button onClick={() => onUpdateAnnouncements(moveItem(announcements, idx, 'up'))} className="hover:text-zine-blue"><ArrowUp size={14}/></button>
                                            <button onClick={() => onUpdateAnnouncements(moveItem(announcements, idx, 'down'))} className="hover:text-zine-blue"><ArrowDown size={14}/></button>
                                        </div>
                                        <div className="flex-1">
                                            <textarea value={ann.content} onChange={(e) => { const n = [...announcements]; n[idx].content = e.target.value; onUpdateAnnouncements(n); }} className="w-full bg-transparent outline-none font-serif text-zine-blue dark:text-gray-200 resize-none h-auto" rows={Math.max(2, ann.content.split('\n').length)} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <button onClick={() => { const n = [...announcements]; n[idx].isActive = !n[idx].isActive; onUpdateAnnouncements(n); }} className={`${ann.isActive ? 'text-green-500' : 'text-gray-300'}`}><Eye size={16}/></button>
                                            <button onClick={() => onUpdateAnnouncements(announcements.filter(a => a.id !== ann.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Categories Management */}
                    {activeTab === 'categories' && (
                         <div className="space-y-6 max-w-4xl">
                            <div className="flex gap-2">
                                <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="新分区名称..." className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white rounded-lg outline-none focus:border-zine-blue text-sm" />
                                <Button onClick={() => { if(newCategory && !categories.includes(newCategory)) { onUpdateCategories([...categories, newCategory]); setNewCategory(''); } }} className="!py-2">添加</Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categories.map((cat, idx) => (
                                    <div key={cat} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                        <span className="font-serif font-bold text-zine-blue dark:text-gray-200">{cat}</span>
                                        <div className="flex items-center gap-2">
                                             <button onClick={() => onUpdateCategories(moveItem(categories, idx, 'up'))} className="text-gray-300 hover:text-zine-blue"><ArrowUp size={14}/></button>
                                             <button onClick={() => onUpdateCategories(moveItem(categories, idx, 'down'))} className="text-gray-300 hover:text-zine-blue"><ArrowDown size={14}/></button>
                                             <button onClick={() => onUpdateCategories(categories.filter(c => c !== cat))} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Links Management */}
                    {activeTab === 'links' && (
                         <div className="space-y-6 max-w-4xl">
                            <div className="flex gap-2 flex-col sm:flex-row">
                                <input value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} placeholder="网站名称" className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white rounded-lg outline-none focus:border-zine-blue text-sm" />
                                <input value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} placeholder="URL (https://...)" className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white rounded-lg outline-none focus:border-zine-blue text-sm" />
                                <Button onClick={() => { if(newLink.title && newLink.url) { onUpdateLinks([...links, {id: crypto.randomUUID(), ...newLink}]); setNewLink({title:'', url:''}); } }} className="!py-2">添加友链</Button>
                            </div>
                            <div className="space-y-2">
                                {links.map((link, idx) => (
                                    <div key={link.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                                        <div className="flex flex-col gap-1 text-gray-400">
                                            <button onClick={() => onUpdateLinks(moveItem(links, idx, 'up'))} className="hover:text-zine-blue"><ArrowUp size={14}/></button>
                                            <button onClick={() => onUpdateLinks(moveItem(links, idx, 'down'))} className="hover:text-zine-blue"><ArrowDown size={14}/></button>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input value={link.title} onChange={(e) => { const n = [...links]; n[idx].title = e.target.value; onUpdateLinks(n); }} className="w-full bg-transparent outline-none font-bold text-zine-blue dark:text-gray-200" />
                                            <input value={link.url} onChange={(e) => { const n = [...links]; n[idx].url = e.target.value; onUpdateLinks(n); }} className="w-full bg-transparent outline-none text-gray-500 dark:text-gray-400 text-sm" />
                                        </div>
                                        <button onClick={() => onUpdateLinks(links.filter(l => l.id !== link.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Global Settings */}
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in duration-300">
                            {/* Basic Info */}
                            <div className="bg-gray-50 dark:bg-slate-700/30 p-8 rounded-xl border border-gray-100 dark:border-gray-700 space-y-8">
                                <h3 className="font-serif font-bold text-lg text-zine-blue dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">基础信息</h3>
                                <div>
                                    <label className="block text-sm font-bold text-zine-blue dark:text-blue-300 mb-2 uppercase tracking-wider">站点名称</label>
                                    <input 
                                        value={siteConfig.siteName} 
                                        onChange={e => onUpdateSiteConfig({...siteConfig, siteName: e.target.value})} 
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-zine-blue text-base font-serif text-zine-blue dark:text-white shadow-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-zine-blue dark:text-blue-300 mb-2 uppercase tracking-wider">头像链接</label>
                                    <div className="flex gap-4">
                                        <img src={siteConfig.avatarUrl} alt="Preview" className="w-12 h-12 rounded-full border border-gray-200 object-cover" />
                                        <input 
                                            value={siteConfig.avatarUrl} 
                                            onChange={e => onUpdateSiteConfig({...siteConfig, avatarUrl: e.target.value})} 
                                            className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-zine-blue text-sm font-mono text-gray-500 dark:text-gray-300 shadow-sm" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-zine-blue dark:text-blue-300 mb-2 uppercase tracking-wider">建站日期</label>
                                    <input 
                                        type="date"
                                        value={siteConfig.startDate} 
                                        onChange={e => onUpdateSiteConfig({...siteConfig, startDate: e.target.value})} 
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-zine-blue text-sm font-mono text-gray-500 dark:text-gray-300 shadow-sm" 
                                    />
                                </div>
                            </div>

                            {/* GitHub Sync */}
                            <div className="bg-gray-50 dark:bg-slate-700/30 p-8 rounded-xl border border-gray-100 dark:border-gray-700 space-y-8">
                                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                                     <h3 className="font-serif font-bold text-lg text-zine-blue dark:text-white flex items-center gap-2">
                                         <Github size={18}/> GitHub 数据同步
                                     </h3>
                                     {syncStatus && (
                                         <span className={`text-xs flex items-center gap-1 ${syncStatus.success ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                             {syncStatus.success ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>} 
                                             {syncStatus.time}
                                         </span>
                                     )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">用户名 (Owner)</label>
                                        <input 
                                            value={ghConfig.username}
                                            onChange={e => setGhConfig({...ghConfig, username: e.target.value})}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded outline-none text-sm dark:text-white"
                                            placeholder="e.g. Colerith"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">仓库名 (Repo)</label>
                                        <input 
                                            value={ghConfig.repo}
                                            onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded outline-none text-sm dark:text-white"
                                            placeholder="e.g. electric-wave"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Personal Access Token (PAT)</label>
                                    <input 
                                        type="password"
                                        value={ghConfig.token}
                                        onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded outline-none text-sm dark:text-white font-mono"
                                        placeholder="github_pat_..."
                                    />
                                    <p className="mt-1 text-[10px] text-gray-400">Token 需要 Repo 读写权限。仅保存在本地浏览器中。</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">分支 (Branch)</label>
                                        <input 
                                            value={ghConfig.branch}
                                            onChange={e => setGhConfig({...ghConfig, branch: e.target.value})}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded outline-none text-sm dark:text-white font-mono"
                                        />
                                    </div>
                                     <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">文件路径</label>
                                        <input 
                                            value={ghConfig.filePath}
                                            onChange={e => setGhConfig({...ghConfig, filePath: e.target.value})}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded outline-none text-sm dark:text-white font-mono"
                                        />
                                     </div>
                                 </div>

                                 <div>
                                     <label className="block text-xs font-bold text-gray-400 mb-1">图片上传路径</label>
                                     <input 
                                         value={ghConfig.assetPath}
                                         onChange={e => setGhConfig({...ghConfig, assetPath: e.target.value})}
                                         className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded outline-none text-sm dark:text-white font-mono"
                                         placeholder="public/uploads"
                                     />
                                     <p className="mt-1 text-[10px] text-gray-400">上传后将生成 GitHub Raw 图片地址，不再把图片存进本地存储。</p>
                                 </div>

                                   <div>
                                     <label className="block text-xs font-bold text-gray-400 mb-1">每日电波配置路径</label>
                                     <input 
                                       value={ghConfig.dailyWaveConfigPath}
                                       onChange={e => setGhConfig({...ghConfig, dailyWaveConfigPath: e.target.value})}
                                       className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded outline-none text-sm dark:text-white font-mono"
                                       placeholder="public/daily-wave-config.json"
                                     />
                                   </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
                                     <div className="flex items-center gap-2">
                                         <Clock size={16} className="text-zine-blue dark:text-blue-300"/>
                                         <label className="text-sm font-bold text-zine-blue dark:text-blue-300">定时自动同步</label>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <input 
                                             type="number" 
                                             min="5" 
                                             value={ghConfig.syncInterval} 
                                             onChange={e => setGhConfig({...ghConfig, syncInterval: parseInt(e.target.value) || 30})}
                                             className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded text-center text-sm dark:text-white"
                                         />
                                         <span className="text-xs text-gray-500">分钟</span>
                                         <button 
                                            onClick={() => setGhConfig({...ghConfig, autoSync: !ghConfig.autoSync})}
                                            className={`w-10 h-6 rounded-full relative transition-colors ${ghConfig.autoSync ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                         >
                                             <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${ghConfig.autoSync ? 'translate-x-4' : ''}`}></span>
                                         </button>
                                     </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                                    <Button onClick={() => handleGitHubSync(false)} disabled={isSyncing} className="flex-1" icon={isSyncing ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>}> 
                                        {isSyncing ? '同步中...' : '立即同步到 GitHub'}
                                    </Button>
                                    <Button onClick={handleExportTs} variant="secondary" className="px-4" title="手动下载备份">
                                        <Download size={18}/>
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-700/30 p-8 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4 xl:col-span-2">
                                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                                  <h3 className="font-serif font-bold text-lg text-zine-blue dark:text-white">每日电波配置</h3>
                                  <span className="text-xs text-gray-400">支持换行与分段，按日期每日推送一篇</span>
                                </div>

                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  你可以直接修改 JSON；也可以在浏览器控制台用 <code>window.ewDailyWave</code> 系列方法实时改。
                                </p>

                                <textarea
                                  value={dailyWaveConfigText}
                                  onChange={(e) => onUpdateDailyWaveConfigText(e.target.value)}
                                  className="w-full min-h-[280px] px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-zine-blue text-xs font-mono text-gray-600 dark:text-gray-200"
                                  spellCheck={false}
                                />

                                <div className="flex flex-wrap gap-3">
                                  <Button onClick={onApplyDailyWaveConfigText} icon={<Save size={16} />}>保存到本地并立即生效</Button>
                                  <Button
                                    onClick={handleSyncDailyWaveConfig}
                                    variant="secondary"
                                    disabled={isSyncingDailyWave}
                                    icon={isSyncingDailyWave ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                                  >
                                    {isSyncingDailyWave ? '推送中...' : '推送配置到 GitHub'}
                                  </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper for TOC Slugs
const slugify = (text: string) => {
  return text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/(^-|-$)+/g, '');
};

const PostDetail: React.FC<{ posts: Post[]; isAdmin: boolean; onEdit: (p: Post) => void }> = ({ posts, isAdmin, onEdit }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const post = posts.find(p => String(p.id) === String(id));
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  
  if (!post) {
    return (
      <div className="p-20 text-center font-serif">
        <h2 className="text-2xl text-gray-400 mb-4">条目丢失 (ID: {id})</h2>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  const hasCover = post.coverImage && post.coverImage.trim() !== '';

  // Custom heading renderer to inject IDs for TOC
  const HeadingRenderer = (level: number) => ({ children }: any) => {
    const text = String(children);
    const Tag = `h${level}` as React.ElementType;
    const id = slugify(text);
    return <Tag id={id}>{children}</Tag>;
  };
  
  // Revised Strategy: Since we can't easily sync indices between TOC parser (RegEx) and ReactMarkdown renderer,
  // we will use pure text slugs. If duplicate headings exist, they collide. Acceptable for simple blog.
  const components = {
      h1: HeadingRenderer(1),
      h2: HeadingRenderer(2),
      h3: HeadingRenderer(3),
      h4: HeadingRenderer(4),
      h5: HeadingRenderer(5),
      h6: HeadingRenderer(6),
  };

  // Re-write TOC to match the ID strategy above (pure text slug)
  const SimpleTableOfContents: React.FC<{ content: string, onItemClick?: () => void }> = ({ content, onItemClick }) => {
     // Updated regex to catch up to h4
     const headings = content.match(/^(#{1,4})\s+(.*)$/gm);
     if (!headings || headings.length === 0) return null;
     
     return (
        <div className="w-full lg:w-64 shrink-0">
          <div className="sticky top-32">
            <h4 className="font-serif font-bold text-zine-blue dark:text-gray-200 mb-4 text-sm uppercase tracking-widest">目录</h4>
            <ul className="space-y-2 relative border-l-2 border-gray-100 dark:border-gray-800 ml-1 py-2">
              {headings.map((heading, index) => {
                const level = heading.match(/^#+/)?.[0].length || 1;
                const text = heading.replace(/^#+\s+/, '');
                const id = slugify(text);
                
                // Visual hierarchy based on level
                const fontSize = level === 1 ? 'text-sm font-bold' : level === 2 ? 'text-sm' : 'text-xs';
                const color = level === 1 ? 'text-zine-blue dark:text-gray-200' : 'text-gray-500 dark:text-gray-400';
                // Indentation logic (rem)
                const paddingLeft = `${(level - 1) * 1}rem`;
                
                return (
                  <li key={index} className="relative group transition-all" style={{ paddingLeft }}>
                    <button onClick={() => {
                        const el = document.getElementById(id);
                        if(el) { 
                          const y = el.getBoundingClientRect().top + window.scrollY - 100; 
                          window.scrollTo({top:y, behavior:'smooth'});
                          if (onItemClick) onItemClick();
                        }
                    }} className={`block text-left ${fontSize} ${color} hover:text-zine-pink dark:hover:text-zine-pink transition-colors font-serif leading-tight py-1 border-l-2 border-transparent hover:border-zine-pink -ml-[2px] pl-3`}>
                        {text}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
     );
  };

  return (
    <article className="min-h-screen bg-white dark:bg-dark-bg pb-20 animate-in fade-in duration-500 transition-colors">
        {/* Header Area */}
        {hasCover ? (
             <div className="relative h-[60vh] w-full overflow-hidden group">
                <img 
                    src={post.coverImage} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                    alt={post.title} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 w-full z-30 p-6 md:p-12 max-w-7xl mx-auto flex flex-col items-start gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white mb-2 hover:bg-white hover:text-zine-blue transition-colors group">
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="flex gap-3">
                    <span className="bg-zine-blue/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10">{post.category}</span>
                    {post.isPinned && <span className="bg-zine-pink/90 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-white/10"><Pin size={10} fill="currentColor"/> Featured</span>}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif font-black text-white leading-tight drop-shadow-lg shadow-black/20">{post.title}</h1>
                    <div className="text-white/90 font-serif italic text-lg flex items-center gap-2">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <span className="w-1 h-1 bg-white/50 rounded-full"></span>
                        <span>by {post.author}</span>
                    </div>
                </div>
            </div>
        ) : (
            /* No Image Header */
            <div className="pt-32 pb-12 px-6 max-w-7xl mx-auto">
                 <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-full mb-6 hover:bg-zine-blue hover:text-white transition-colors group inline-flex">
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                 </button>
                 <div className="flex gap-3 mb-4">
                    <span className="bg-zine-blue/10 dark:bg-blue-900/30 text-zine-blue dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{post.category}</span>
                    {post.isPinned && <span className="bg-zine-pink/10 text-zine-pink px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Pin size={10} fill="currentColor"/> Featured</span>}
                 </div>
                 <h1 className="text-4xl md:text-6xl font-serif font-black text-zine-blue dark:text-white leading-tight mb-6">{post.title}</h1>
                 <div className="text-gray-500 dark:text-gray-400 font-serif italic text-lg flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-8">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>by {post.author}</span>
                 </div>
            </div>
        )}
        
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-3 hidden lg:block"><SimpleTableOfContents content={post.content} /></div>
            <div className="lg:col-span-8 lg:col-start-4">
                 <div className="prose prose-lg prose-zinc dark:prose-invert max-w-none font-sans font-medium leading-loose">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>{preprocessContent(post.content)}</ReactMarkdown>
                 </div>
            </div>
        </div>

        {/* Mobile TOC Trigger Button */}
        <button 
           onClick={() => setIsMobileTocOpen(true)}
           className="lg:hidden fixed bottom-24 right-10 z-30 p-3 bg-white dark:bg-slate-700 text-zine-blue dark:text-white border border-gray-200 dark:border-gray-600 shadow-soft rounded-full transition-all duration-300 hover:scale-110 active:scale-95"
           title="目录"
        >
           <ListMusic size={20} strokeWidth={1} />
        </button>

        {/* Mobile TOC Sidebar Drawer */}
        {isMobileTocOpen && (
           <>
             {/* Backdrop */}
             <div className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm lg:hidden animate-in fade-in duration-300" onClick={() => setIsMobileTocOpen(false)} />
             
             {/* Drawer */}
             <div className="fixed top-0 right-0 bottom-0 w-3/4 max-w-sm bg-white dark:bg-slate-900 z-[70] shadow-2xl p-6 lg:hidden animate-in slide-in-from-right duration-300 overflow-y-auto border-l border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100 dark:border-gray-700">
                   <h4 className="font-serif font-bold text-zine-blue dark:text-gray-200 flex items-center gap-2">
                      <ListMusic size={18} className="text-zine-pink"/>
                      文章目录
                   </h4>
                   <button onClick={() => setIsMobileTocOpen(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-gray-50 dark:bg-slate-800 rounded-full">
                      <X size={20} />
                   </button>
                </div>
                <SimpleTableOfContents content={post.content} onItemClick={() => setIsMobileTocOpen(false)} />
             </div>
           </>
        )}
    </article>
  );
};

const HomeWithNavigation: React.FC<{
  posts: Post[];
  categories: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  editedTimeMap: Record<string, number>;
  isAdmin: boolean;
  handleEditPost: (p: Post) => void;
  handleDeletePost: (id: string) => void;
  siteConfig: SiteConfig;
  announcements: Announcement[];
  dailyWave: DailyWaveEntry | null;
  todayBadges: string[];
}> = ({ posts, categories, searchQuery, setSearchQuery, editedTimeMap, isAdmin, handleEditPost, handleDeletePost, siteConfig, announcements, dailyWave, todayBadges }) => {
    const navigate = useNavigate();
    const [sortMode, setSortMode] = useState<'latest' | 'edited'>('latest');
    const [initialFilter, setInitialFilter] = useState('全部');
    const [tagFilter, setTagFilter] = useState('全部');
    const [currentPage, setCurrentPage] = useState(1);
    const POSTS_PER_PAGE = 20;

    const getInitial = (title: string) => {
      const normalized = title.trim().normalize('NFKD').toUpperCase();
      for (const char of normalized) {
        if (/[A-Z]/.test(char)) {
          return char;
        }
      }
      return '#';
    };

    const allTagOptions = useMemo(() => Array.from(new Set(posts.flatMap(p => p.tags))).filter(Boolean), [posts]);
    const initialOptions = useMemo(() => {
        const initials = Array.from(new Set(posts.map(p => getInitial(p.title))));
        return ['全部', ...initials.sort()];
    }, [posts]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortMode, initialFilter, tagFilter]);

    const filteredAndSortedPosts = useMemo(() => {
        let result = [...posts];

        if (initialFilter !== '全部') {
            result = result.filter(p => getInitial(p.title) === initialFilter);
        }

        if (tagFilter !== '全部') {
            result = result.filter(p => p.tags.includes(tagFilter));
        }

        result.sort((a, b) => {
            if (sortMode === 'edited') {
                const aEdited = editedTimeMap[a.id] || a.createdAt;
                const bEdited = editedTimeMap[b.id] || b.createdAt;
                return bEdited - aEdited;
            }
            return b.createdAt - a.createdAt;
        });

        return result;
    }, [posts, sortMode, initialFilter, tagFilter, editedTimeMap]);

    const pinnedPosts = filteredAndSortedPosts.filter(p => p.isPinned);
    const regularPosts = filteredAndSortedPosts.filter(p => !p.isPinned);
    const totalPages = Math.max(1, Math.ceil(regularPosts.length / POSTS_PER_PAGE));
    const pagedRegularPosts = regularPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

    return (
        <main className="w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 flex-1 relative z-10">
            <section className="mb-24 flex flex-col justify-between md:flex-row md:items-end md:justify-between border-b border-zine-blue/10 dark:border-gray-700 pb-16 md:relative min-h-[400px]">
                
                {/* ECG Visualizer: In-flow on mobile with smaller height, absolute on desktop */}
                <div className="w-full h-[150px] -z-10 overflow-hidden pointer-events-none opacity-40 md:absolute md:top-0 md:left-1/2 md:-translate-x-1/2 md:w-screen md:h-[250px] md:opacity-30">
                    <ECGVisualizer />
                </div>

                {/* Hitokoto Container: Pushed to bottom on mobile, self-end on desktop */}
                <div className="max-w-4xl flex-1 relative z-10 w-full">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zine-blue/5 dark:bg-blue-900/20 text-zine-blue dark:text-blue-300 text-xs font-bold mb-8 border border-zine-blue/10 dark:border-blue-900/30">今日电波</span>
                    {todayBadges.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {todayBadges.map((badge) => (
                          <span key={badge} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-white/70 dark:bg-slate-800/70 border border-zine-blue/20 dark:border-blue-800/60 text-zine-blue dark:text-blue-200">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                    {dailyWave?.title && (
                      <h2 className="text-lg md:text-2xl font-serif font-black text-zine-blue dark:text-white mb-2">
                        {dailyWave.title}
                      </h2>
                    )}
                    <p className="text-xl md:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-zine-blue via-zine-pink to-zine-blue dark:from-white dark:via-blue-300 dark:to-white py-3 whitespace-pre-line leading-relaxed">
                        {dailyWave ? dailyWave.content : '正在接收今天的电波...'}
                    </p>
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-serif italic mt-2">
                        —— {dailyWave?.from || '电波FM'}
                    </p>
                </div>
                
                {/* Post Count: Hidden on mobile */}
                <div className="text-right shrink-0 hidden md:block">
                    <div className="text-6xl font-serif font-light text-zine-blue/20 dark:text-white/10">{posts.length}</div>
                    <div className="text-xs text-gray-400">已收录条目</div>
                </div>
            </section>
            
            <AnnouncementGallery announcements={announcements} />

            {/* Sticky Category Filter */}
             <div className="relative isolate overflow-visible flex flex-wrap gap-2 mb-12 sticky top-20 z-[70] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4 -mx-6 px-6 md:mx-0 md:px-0 md:bg-transparent md:static transition-colors">
                 <button 
                    onClick={() => setSearchQuery('')}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${!searchQuery ? 'bg-zine-blue text-white shadow-soft dark:shadow-none' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-zine-blue dark:hover:text-white border border-gray-100 dark:border-gray-700'}`}
                 >
                    全部
                 </button>
                 {categories.map(cat => (
                     <button 
                        key={cat}
                        onClick={() => setSearchQuery(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${searchQuery === cat ? 'bg-zine-blue text-white shadow-soft dark:shadow-none' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-zine-blue dark:hover:text-white border border-gray-100 dark:border-gray-700'}`}
                     >
                        {cat}
                     </button>
                 ))}

                 <div className="w-full h-px bg-gray-100 dark:bg-slate-800 my-2"></div>

                 <FilterDropdown
                    value={initialFilter}
                    onChange={setInitialFilter}
                    options={initialOptions.map(i => ({ value: i, label: `首字母：${i}` }))}
                 />

                 <FilterDropdown
                    value={sortMode}
                    onChange={(v) => setSortMode(v as 'latest' | 'edited')}
                    options={[
                      { value: 'latest', label: '排序：最新发布' },
                      { value: 'edited', label: '排序：最近编辑' }
                    ]}
                 />

                 <FilterDropdown
                    value={tagFilter}
                    onChange={setTagFilter}
                    options={[
                      { value: '全部', label: '标签：全部' },
                      ...allTagOptions.map(tag => ({ value: tag, label: `标签：${tag}` }))
                    ]}
                 />
            </div>

            {/* Pinned Posts Section */}
            {pinnedPosts.length > 0 && (
                <section className="mb-20 animate-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-sm font-bold text-zine-pink mb-8 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-8 h-px bg-zine-pink"></span> 精选推荐
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {pinnedPosts.map(post => (
                            <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="group cursor-pointer">
                                <div className={`aspect-[2/1] overflow-hidden rounded-sm mb-6 bg-gray-100 dark:bg-slate-800 shadow-sm ${!post.coverImage && 'flex items-center justify-center bg-gradient-to-br from-zine-blue/5 to-zine-pink/5'}`}>
                                    {post.coverImage ? (
                                        <img src={post.coverImage} className="w-full h-full object-cover transition-all duration-700 hover:scale-105" alt={post.title} />
                                    ) : (
                                        <span className="font-serif italic text-gray-300 dark:text-gray-600 text-2xl">Electric Wave</span>
                                    )}
                                </div>
                                <h4 className="text-3xl font-serif font-bold text-zine-blue dark:text-white group-hover:text-zine-pink transition-colors">{post.title}</h4>
                                <p className="text-gray-500 dark:text-gray-400 font-serif line-clamp-2 mt-2">{post.excerpt}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Regular Posts Grid */}
            <section className="relative z-0 animate-in slide-in-from-bottom-8 duration-700">
                <h3 className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest">
                    {searchQuery ? (categories.includes(searchQuery) ? `${searchQuery} 分区` : '搜索结果') : '最新收录'}
                </h3>
                {regularPosts.length > 0 ? (
                    <>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-8">
                        {pagedRegularPosts.map(post => (
                            <GalleryCard 
                                key={post.id} 
                                post={post} 
                                isAdmin={isAdmin}
                                onClick={() => navigate(`/post/${post.id}`)}
                                onEdit={(e) => { e.stopPropagation(); handleEditPost(post); }}
                                onDelete={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
                            />
                        ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-10">
                        <Button variant="secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>上一页</Button>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{currentPage} / {totalPages}</span>
                        <Button variant="secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>下一页</Button>
                      </div>
                    )}
                    </>
                ) : (
                    <div className="py-20 text-center text-gray-400 font-serif italic border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                        {posts.length === 0 ? "此分区暂无内容..." : "..."}
                    </div>
                )}
            </section>
        </main>
    );
};

export const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>(() => loadState(KEYS.POSTS, INITIAL_POSTS));
  const [categories, setCategories] = useState<string[]>(() => loadState(KEYS.CATEGORIES, DEFAULT_CATEGORIES));
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => loadState(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS));
  const [links, setLinks] = useState<FriendlyLink[]>(() => loadState(KEYS.LINKS, INITIAL_LINKS));
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => loadState(KEYS.CONFIG, DEFAULT_SITE_CONFIG));
  
  const [isAdmin, setIsAdmin] = useState(() => loadState(KEYS.ADMIN, false));
  
  // Custom theme initialization to support timed fallback without locking preference
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(KEYS.THEME);
    if (saved !== null) {
      try { return JSON.parse(saved); } catch (e) { return false; }
    }
    // Default: Time based (18:00 - 06:00)
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ isOpen: false, mode: 'create', currentPost: null });
  const [dailyWaveConfig, setDailyWaveConfig] = useState<DailyWaveConfig>(() => {
    const saved = loadState<DailyWaveConfig | null>(KEYS.DAILY_WAVE_CONFIG, null);
    return parseDailyWaveConfig(saved) || DEFAULT_DAILY_WAVE_CONFIG;
  });
  const [dailyWaveConfigText, setDailyWaveConfigText] = useState(() => JSON.stringify(dailyWaveConfig, null, 2));
  const [todayWave, setTodayWave] = useState<DailyWaveEntry | null>(null);
  const [todayBadges, setTodayBadges] = useState<string[]>([]);
  const [editedTimeMap, setEditedTimeMap] = useState<Record<string, number>>(() => loadState(KEYS.EDITED_TIME_MAP, {}));
  const [versionChoices, setVersionChoices] = useState<VersionChoice[]>([]);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const hasReconciledRef = useRef(false);

  const applyDailyWaveConfig = (config: DailyWaveConfig, source: 'local' | 'remote' = 'local') => {
    setDailyWaveConfig(config);
    setDailyWaveConfigText(JSON.stringify(config, null, 2));
    localStorage.setItem(KEYS.DAILY_WAVE_CONFIG, JSON.stringify(config));
    if (source === 'remote') {
      setSyncNotice('已加载远程每日电波配置。');
    }
  };

  const applyDailyWaveConfigFromText = () => {
    try {
      const parsed = JSON.parse(dailyWaveConfigText);
      const validated = parseDailyWaveConfig(parsed);
      if (!validated) {
        alert('每日电波配置格式无效：请确保 items 为非空数组，且每项包含 content。');
        return;
      }
      applyDailyWaveConfig(validated, 'local');
      setSyncNotice('每日电波配置已保存并生效。');
    } catch (error) {
      alert(`JSON 解析失败: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    const token = document
      .querySelector('meta[name="cf-beacon-token"]')
      ?.getAttribute('content')
      ?.trim();

    if (!token) return;
    if (document.querySelector('script[data-cf-beacon]')) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
    document.head.appendChild(script);
  }, []);

  const uploadImageToGitHub = async (file: File) => {
    const ghConfig = loadState<GitHubConfig>(KEYS.GITHUB_CONFIG, DEFAULT_GITHUB_CONFIG);
    if (!ghConfig.username || !ghConfig.repo || !ghConfig.token) {
      throw new Error('请先在设置中完善 GitHub 用户名、仓库名和 Token。');
    }

    const assetBasePath = trimSlashes(ghConfig.assetPath || 'public/uploads');
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const safeName = sanitizeFileName(file.name || 'image');
    const uniqueName = `${Date.now()}-${safeName}`;
    const uploadPath = `${assetBasePath}/${datePrefix}/${uniqueName}`;
    const apiUrl = `https://api.github.com/repos/${ghConfig.username}/${ghConfig.repo}/contents/${uploadPath}`;
    const content = arrayBufferToBase64(await file.arrayBuffer());

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${ghConfig.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Upload image: ${uniqueName}`,
        content,
        branch: ghConfig.branch
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => null);
      throw new Error(errData?.message || '图片上传失败');
    }

    const publicPath = trimSlashes(uploadPath.replace(/^public\//, ''));
    return `https://raw.githubusercontent.com/${ghConfig.username}/${ghConfig.repo}/${ghConfig.branch}/${publicPath}`;
  };

  const publishedSnapshot = useMemo(() => createSnapshot({
    posts: INITIAL_POSTS,
    categories: DEFAULT_CATEGORIES,
    announcements: INITIAL_ANNOUNCEMENTS,
    links: INITIAL_LINKS,
    siteConfig: DEFAULT_SITE_CONFIG
  }, 'published'), []);

  const applySnapshotToState = (snapshot: VersionSnapshot) => {
    setPosts(snapshot.posts);
    setCategories(snapshot.categories);
    setAnnouncements(snapshot.announcements);
    setLinks(snapshot.links);
    setSiteConfig(snapshot.siteConfig);
    applyBundleToStorage(snapshot);
  };

  const buildCurrentLocalSnapshot = () => createSnapshot({
    posts,
    categories,
    announcements,
    links,
    siteConfig
  }, 'local');

  useEffect(() => {
    if (hasReconciledRef.current) return;

    const localSnapshot = buildCurrentLocalSnapshot();
    const lastSeenPublishedHash = localStorage.getItem(KEYS.LAST_SEEN_PUBLISHED_HASH);

    // 首次运行：记录当前发布版本基线
    if (!lastSeenPublishedHash) {
      localStorage.setItem(KEYS.LAST_SEEN_PUBLISHED_HASH, publishedSnapshot.hash);
      hasReconciledRef.current = true;
      return;
    }

    // 线上发布版本未变化，不处理
    if (lastSeenPublishedHash === publishedSnapshot.hash) {
      hasReconciledRef.current = true;
      return;
    }

    // 本地等于旧发布版本 => 自动升级到新发布版本（解决“另一个设备还是旧缓存”）
    if (localSnapshot.hash === lastSeenPublishedHash) {
      applySnapshotToState(publishedSnapshot);
      localStorage.setItem(KEYS.LAST_SEEN_PUBLISHED_HASH, publishedSnapshot.hash);
      setSyncNotice('检测到新发布版本，已自动更新到最新内容。');
      hasReconciledRef.current = true;
      return;
    }

    // 本地已是新发布版本，只更新基线即可
    if (localSnapshot.hash === publishedSnapshot.hash) {
      localStorage.setItem(KEYS.LAST_SEEN_PUBLISHED_HASH, publishedSnapshot.hash);
      hasReconciledRef.current = true;
      return;
    }

    // 本地有未同步变更 + 线上也有更新 => 进入版本选择
    const history = loadState<VersionSnapshot[]>(KEYS.DATA_HISTORY, []);
    const dedup = new Map<string, VersionChoice>();

    const pushChoice = (snapshot: VersionSnapshot, title: string, description: string) => {
      if (dedup.has(snapshot.hash)) return;
      dedup.set(snapshot.hash, { id: snapshot.hash, title, description, snapshot });
    };

    pushChoice(publishedSnapshot, '线上最新版本（推荐）', `发布时间：${formatVersionTime(publishedSnapshot.savedAt)}`);
    pushChoice(localSnapshot, '当前设备本地版本', `本地时间：${formatVersionTime(localSnapshot.savedAt)}`);
    history.slice(0, 6).forEach((item, idx) => {
      pushChoice(
        { ...item, source: 'history' },
        `本地历史版本 #${idx + 1}`,
        `保存时间：${formatVersionTime(item.savedAt)}`
      );
    });

    setVersionChoices(Array.from(dedup.values()));
    hasReconciledRef.current = true;
  }, [publishedSnapshot]);

  useEffect(() => localStorage.setItem(KEYS.POSTS, JSON.stringify(posts)), [posts]);
  useEffect(() => localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(announcements)), [announcements]);
  useEffect(() => localStorage.setItem(KEYS.LINKS, JSON.stringify(links)), [links]);
  useEffect(() => localStorage.setItem(KEYS.CONFIG, JSON.stringify(siteConfig)), [siteConfig]);
  useEffect(() => localStorage.setItem(KEYS.ADMIN, JSON.stringify(isAdmin)), [isAdmin]);
  useEffect(() => localStorage.setItem(KEYS.EDITED_TIME_MAP, JSON.stringify(editedTimeMap)), [editedTimeMap]);

  // 保存本地版本历史，支持出现冲突时“多版本比较并选择”
  useEffect(() => {
    if (!hasReconciledRef.current) return;
    const snapshot = buildCurrentLocalSnapshot();
    const history = loadState<VersionSnapshot[]>(KEYS.DATA_HISTORY, []);
    if (history[0]?.hash === snapshot.hash) return;

    const nextHistory = [
      { ...snapshot, savedAt: Date.now(), source: 'local' as const },
      ...history.filter(item => item.hash !== snapshot.hash)
    ].slice(0, 8);

    localStorage.setItem(KEYS.DATA_HISTORY, JSON.stringify(nextHistory));
  }, [posts, categories, announcements, links, siteConfig]);
  
  // Theme Toggle Handler
  const toggleTheme = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    localStorage.setItem(KEYS.THEME, JSON.stringify(newMode));
  };

  // Timed Check Effect (18:00 - 06:00)
  // Only runs if user hasn't manually set a preference
  useEffect(() => {
    const checkTime = () => {
      if (localStorage.getItem(KEYS.THEME) !== null) return;
      
      const hour = new Date().getHours();
      const shouldBeDark = hour >= 18 || hour < 6;
      setIsDark((prev: boolean) => (prev !== shouldBeDark ? shouldBeDark : prev));
    };

    // Check every minute
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    const loadRemoteDailyWave = async () => {
      const saved = loadState<DailyWaveConfig | null>(KEYS.DAILY_WAVE_CONFIG, null);
      const validatedSaved = parseDailyWaveConfig(saved);
      if (validatedSaved) {
        setDailyWaveConfig(validatedSaved);
        setDailyWaveConfigText(JSON.stringify(validatedSaved, null, 2));
      }

      try {
        const res = await fetch(`${DAILY_WAVE_CONFIG_URL}?t=${Date.now()}`);
        if (!res.ok) return;
        const json = await res.json();
        const validated = parseDailyWaveConfig(json);
        if (validated) {
          setDailyWaveConfig(validated);
          setDailyWaveConfigText(JSON.stringify(validated, null, 2));
          localStorage.setItem(KEYS.DAILY_WAVE_CONFIG, JSON.stringify(validated));
        }
      } catch (_error) {
        // Keep local config when remote fetch fails.
      }
    };

    loadRemoteDailyWave();
  }, []);

  useEffect(() => {
    const refreshDailyWave = () => {
      const now = new Date();
      setTodayWave(pickDailyWave(dailyWaveConfig, now));
      setTodayBadges(getTodayWaveBadges(now));
    };

    refreshDailyWave();
    const interval = setInterval(refreshDailyWave, 60 * 1000);
    return () => clearInterval(interval);
  }, [dailyWaveConfig]);

  useEffect(() => {
    const api = {
      getConfig: () => dailyWaveConfig,
      getConfigText: () => dailyWaveConfigText,
      setConfig: (nextConfig: unknown) => {
        const validated = parseDailyWaveConfig(nextConfig);
        if (!validated) throw new Error('Invalid daily wave config.');
        applyDailyWaveConfig(validated, 'local');
        return validated;
      },
      setConfigText: (text: string) => {
        const parsed = JSON.parse(text);
        const validated = parseDailyWaveConfig(parsed);
        if (!validated) throw new Error('Invalid daily wave config text.');
        applyDailyWaveConfig(validated, 'local');
        return validated;
      },
      resetToDefault: () => {
        applyDailyWaveConfig(DEFAULT_DAILY_WAVE_CONFIG, 'local');
        return DEFAULT_DAILY_WAVE_CONFIG;
      },
      clearLocalOverride: () => {
        localStorage.removeItem(KEYS.DAILY_WAVE_CONFIG);
      },
      previewToday: () => pickDailyWave(dailyWaveConfig, new Date())
    };

    window.ewDailyWave = api;
    return () => {
      delete window.ewDailyWave;
    };
  }, [dailyWaveConfig, dailyWaveConfigText]);

  useEffect(() => {
    localStorage.setItem(KEYS.DAILY_WAVE_CONFIG, JSON.stringify(dailyWaveConfig));
  }, [dailyWaveConfig]);

  const handleLogin = async (key: string) => {
    const hash = await digestMessage(key);
    if (hash === ADMIN_HASH) {
      setIsAdmin(true);
      setIsLoginOpen(false);
    } else {
      alert("密钥错误");
    }
  };

  const handleSavePost = (post: Post) => {
    if (editor.mode === 'create') {
      setPosts([post, ...posts]);
    } else {
      setPosts(posts.map(p => p.id === post.id ? post : p));
      setEditedTimeMap(prev => ({ ...prev, [post.id]: Date.now() }));
    }
    setEditor({ ...editor, isOpen: false });
  };

  const handleDeletePost = (id: string) => {
    if (confirm('确定要删除此条目吗？此操作无法撤销。')) {
      setPosts(posts.filter(p => p.id !== id));
    }
  };
  
  const handleEditPost = (post: Post) => {
      setEditor({ isOpen: true, mode: 'edit', currentPost: post });
  };

  const filteredPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const allTags = Array.from(new Set(posts.flatMap(p => p.tags)));

  const handleVersionChoiceConfirm = (choice: VersionChoice) => {
    applySnapshotToState(choice.snapshot);
    localStorage.setItem(KEYS.LAST_SEEN_PUBLISHED_HASH, publishedSnapshot.hash);
    setVersionChoices([]);
    setSyncNotice(`已采用：${choice.title}`);
  };

  return (
    <HashRouter>
        <div className={`min-h-screen flex flex-col transition-colors duration-500 bg-zine-paper dark:bg-dark-bg ${isDark ? 'dark' : ''}`}>
             <ScrollToTop />
             <Header 
                isAdmin={isAdmin} 
                isDark={isDark} 
                toggleTheme={toggleTheme} 
                onLoginClick={() => setIsLoginOpen(true)}
                onLogout={() => setIsAdmin(false)}
                onNewPost={() => setEditor({ isOpen: true, mode: 'create', currentPost: null })}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                siteConfig={siteConfig}
             />
             
             <Routes>
                <Route path="/" element={
                    <HomeWithNavigation 
                        posts={filteredPosts} 
                        categories={categories} 
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        editedTimeMap={editedTimeMap}
                        isAdmin={isAdmin}
                        handleEditPost={handleEditPost}
                        handleDeletePost={handleDeletePost}
                        siteConfig={siteConfig}
                        announcements={announcements}
                        dailyWave={todayWave}
                        todayBadges={todayBadges}
                    />
                } />
                <Route path="/post/:id" element={<PostDetail posts={posts} isAdmin={isAdmin} onEdit={handleEditPost} />} />
                <Route path="/dashboard" element={
                    isAdmin ? (
                        <Dashboard 
                            posts={posts} 
                            categories={categories} 
                            announcements={announcements} 
                            links={links} 
                            siteConfig={siteConfig}
                            dailyWaveConfigText={dailyWaveConfigText}
                            onUpdateDailyWaveConfigText={setDailyWaveConfigText}
                            onApplyDailyWaveConfigText={applyDailyWaveConfigFromText}
                            onUpdatePosts={setPosts} 
                            onUpdateCategories={setCategories} 
                            onUpdateAnnouncements={setAnnouncements} 
                            onUpdateLinks={setLinks}
                            onUpdateSiteConfig={setSiteConfig}
                            onEditPost={handleEditPost}
                            onDeletePost={handleDeletePost}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-20">
                            <p className="text-gray-400 font-serif">Access Denied.</p>
                        </div>
                    )
                } />
             </Routes>

             <Footer links={links} isAdmin={isAdmin} visitorCount={0} siteConfig={siteConfig} />

             <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} onLogin={handleLogin} />
             
             <EditorModal 
                isOpen={editor.isOpen} 
                mode={editor.mode} 
                initialData={editor.currentPost} 
                categories={categories}
                allTags={allTags}
                onUploadImage={uploadImageToGitHub}
                onClose={() => setEditor({ ...editor, isOpen: false })} 
                onSave={handleSavePost} 
             />

             <VersionConflictModal
                isOpen={versionChoices.length > 0}
                choices={versionChoices}
                onConfirm={handleVersionChoiceConfirm}
             />

             {syncNotice && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-zine-blue text-white px-4 py-2 rounded-full shadow-lg text-sm animate-in fade-in duration-300">
                  {syncNotice}
                  <button className="ml-3 text-white/80 hover:text-white" onClick={() => setSyncNotice(null)}>×</button>
                </div>
             )}
        </div>
    </HashRouter>
  );
};
