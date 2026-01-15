
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { LayoutGrid, List, Plus, LogIn, LogOut, ChevronLeft, ArrowRight, Github, ExternalLink, Trash2, PlusCircle, Eye, Search, ArrowUp, Pin, Settings, LayoutDashboard, Menu, X, RefreshCw, GripVertical, Bell, ChevronRight, Megaphone, Radio, Edit3, Key, BarChart3, Globe, Link as LinkIcon, ArrowDown, Calendar, Download, Save, Moon, Sun, Waves, Activity, FileCode, ListMusic } from 'lucide-react';
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
  ADMIN: 'ew_admin_logged_in',
  THEME: 'ew_theme_mode'
};

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
                                <BarChart3 size={14} className="text-zine-pink" />
                                {/* Busuanzi Unique Visitor Counter */}
                                <span id="busuanzi_container_site_uv" style={{ display: 'none' }}>
                                    访客数: <span id="busuanzi_value_site_uv" className="font-bold text-zine-blue dark:text-white">--</span>
                                </span>
                             </div>
                             <div>
                                 {/* Busuanzi Page View Counter */}
                                 <span id="busuanzi_container_site_pv" style={{ display: 'none' }}>
                                    总浏览量: <span id="busuanzi_value_site_pv" className="font-bold text-zine-blue dark:text-white">--</span>
                                 </span>
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
    onUpdatePosts: (posts: Post[]) => void; 
    onUpdateCategories: (cats: string[]) => void; 
    onUpdateAnnouncements: (anns: Announcement[]) => void; 
    onUpdateLinks: (links: FriendlyLink[]) => void;
    onUpdateSiteConfig: (config: SiteConfig) => void;
    onEditPost: (p: Post) => void; 
    onDeletePost: (id: string) => void; 
}> = ({ posts, categories, announcements, links, siteConfig, onUpdatePosts, onUpdateCategories, onUpdateAnnouncements, onUpdateLinks, onUpdateSiteConfig, onEditPost, onDeletePost }) => {
    const [activeTab, setActiveTab] = useState<'posts' | 'announcements' | 'categories' | 'links' | 'settings'>('posts');
    const [newCategory, setNewCategory] = useState('');
    const [newLink, setNewLink] = useState({ title: '', url: '' });
    const [newAnnouncement, setNewAnnouncement] = useState('');

    const handleExportTs = () => {
        // Construct the full content of types.ts
        const typesFileContent = `
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

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-soft p-8 min-h-[600px] flex flex-col md:flex-row gap-8 transition-colors">
                <div className="w-full md:w-64 md:border-r border-gray-100 dark:border-gray-700 md:pr-6 space-y-2 shrink-0">
                    <h2 className="text-xl font-serif font-bold text-zine-blue dark:text-white mb-6">控制台</h2>
                    <button onClick={() => setActiveTab('posts')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'posts' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>文章管理</button>
                    <button onClick={() => setActiveTab('announcements')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'announcements' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>公告管理</button>
                    <button onClick={() => setActiveTab('categories')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'categories' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>分区设置</button>
                    <button onClick={() => setActiveTab('links')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'links' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>友链设置</button>
                    <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'settings' ? 'bg-zine-blue/5 dark:bg-zine-blue/20 text-zine-blue dark:text-blue-300 font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>全局设置</button>
                </div>
                <div className="flex-1 overflow-x-auto">
                    {/* Posts Management */}
                    {activeTab === 'posts' && (
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead className="text-xs uppercase text-gray-400 border-b border-gray-100 dark:border-gray-700"><tr><th className="py-4">标题</th><th className="py-4">日期</th><th className="py-4 text-right">操作</th></tr></thead>
                            <tbody>
                                {posts.map(post => (
                                    <tr key={post.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="py-4 font-serif font-bold text-zine-blue dark:text-gray-200 flex items-center gap-2">
                                            {post.isPinned && <Pin size={12} className="text-zine-pink" fill="currentColor"/>}
                                            {post.title}
                                        </td>
                                        <td className="py-4 text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</td>
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
                    )}

                    {/* Announcements Management */}
                    {activeTab === 'announcements' && (
                        <div className="space-y-6">
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
                         <div className="space-y-6">
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
                         <div className="space-y-6">
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
                        <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
                            <div className="bg-gray-50 dark:bg-slate-700/30 p-8 rounded-xl border border-gray-100 dark:border-gray-700 space-y-8">
                                <div>
                                    <label className="block text-sm font-bold text-zine-blue dark:text-blue-300 mb-2 uppercase tracking-wider">站点名称</label>
                                    <input 
                                        value={siteConfig.siteName} 
                                        onChange={e => onUpdateSiteConfig({...siteConfig, siteName: e.target.value})} 
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-zine-blue text-base font-serif text-zine-blue dark:text-white shadow-sm" 
                                        placeholder="输入站点名称..."
                                    />
                                    <p className="mt-2 text-xs text-gray-400">显示在标题栏和页脚的品牌名称。</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-zine-blue dark:text-blue-300 mb-2 uppercase tracking-wider">头像链接 (URL)</label>
                                    <div className="flex gap-4">
                                        <img src={siteConfig.avatarUrl} alt="Preview" className="w-12 h-12 rounded-full border border-gray-200 object-cover" />
                                        <input 
                                            value={siteConfig.avatarUrl} 
                                            onChange={e => onUpdateSiteConfig({...siteConfig, avatarUrl: e.target.value})} 
                                            className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-zine-blue text-sm font-mono text-gray-500 dark:text-gray-300 shadow-sm" 
                                            placeholder="https://..."
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
                                    <p className="mt-2 text-xs text-gray-400">用于计算页脚显示的“运行天数”。</p>
                                </div>
                                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <label className="block text-sm font-bold text-zine-blue dark:text-blue-300 mb-4 uppercase tracking-wider">数据维护</label>
                                    <Button onClick={handleExportTs} icon={<FileCode size={16} />} variant="secondary" className="w-full">
                                        导出 types.ts (用于覆盖更新)
                                    </Button>
                                    <p className="mt-3 text-xs text-gray-400 leading-relaxed">
                                        点击上方按钮下载 `types.ts` 文件。将该文件直接覆盖到你 GitHub 仓库中的 `types.ts` 即可完成数据更新。
                                        (无需再手动复制 JSON 内容)
                                    </p>
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
  isAdmin: boolean;
  handleEditPost: (p: Post) => void;
  handleDeletePost: (id: string) => void;
  siteConfig: SiteConfig;
  announcements: Announcement[];
  hitokoto: { text: string; from: string } | null;
}> = ({ posts, categories, searchQuery, setSearchQuery, isAdmin, handleEditPost, handleDeletePost, siteConfig, announcements, hitokoto }) => {
    const navigate = useNavigate();

    // Separate pinned and regular from the passed 'posts' (which are already filtered by search/category in App component)
    const pinnedPosts = posts.filter(p => p.isPinned);
    const regularPosts = posts.filter(p => !p.isPinned);

    return (
        <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20 flex-1 relative z-10">
            <section className="mb-24 flex flex-col justify-between md:flex-row md:items-end md:justify-between border-b border-zine-blue/10 dark:border-gray-700 pb-16 md:relative min-h-[400px]">
                
                {/* ECG Visualizer: In-flow on mobile with smaller height, absolute on desktop */}
                <div className="w-full h-[150px] -z-10 overflow-hidden pointer-events-none opacity-40 md:absolute md:top-0 md:left-1/2 md:-translate-x-1/2 md:w-screen md:h-[250px] md:opacity-30">
                    <ECGVisualizer />
                </div>

                {/* Hitokoto Container: Pushed to bottom on mobile, self-end on desktop */}
                <div className="max-w-4xl flex-1 relative z-10 w-full">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zine-blue/5 dark:bg-blue-900/20 text-zine-blue dark:text-blue-300 text-xs font-bold mb-8 border border-zine-blue/10 dark:border-blue-900/30">今日电波</span>
                    <h2 className="text-xl md:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-zine-blue via-zine-pink to-zine-blue dark:from-white dark:via-blue-300 dark:to-white py-3">
                        “{hitokoto ? hitokoto.text : '正在接收电波...'}”
                    </h2>
                    <p className="text-lg text-gray-500 dark:text-gray-400 font-serif italic">
                        —— {hitokoto ? hitokoto.from : '...'}
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
             <div className="flex flex-wrap gap-2 mb-12 sticky top-20 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4 -mx-6 px-6 md:mx-0 md:px-0 md:bg-transparent md:static transition-colors">
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
            </div>

            {/* Pinned Posts Section */}
            {pinnedPosts.length > 0 && (
                <section className="mb-20 animate-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-sm font-bold text-zine-pink mb-8 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-8 h-px bg-zine-pink"></span> 精选推荐
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
            <section className="animate-in slide-in-from-bottom-8 duration-700">
                <h3 className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest">
                    {searchQuery ? (categories.includes(searchQuery) ? `${searchQuery} 分区` : '搜索结果') : '最新收录'}
                </h3>
                {regularPosts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {regularPosts.map(post => (
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
  const [hitokoto, setHitokoto] = useState<{ text: string; from: string } | null>(null);

  useEffect(() => localStorage.setItem(KEYS.POSTS, JSON.stringify(posts)), [posts]);
  useEffect(() => localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories)), [categories]);
  useEffect(() => localStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(announcements)), [announcements]);
  useEffect(() => localStorage.setItem(KEYS.LINKS, JSON.stringify(links)), [links]);
  useEffect(() => localStorage.setItem(KEYS.CONFIG, JSON.stringify(siteConfig)), [siteConfig]);
  useEffect(() => localStorage.setItem(KEYS.ADMIN, JSON.stringify(isAdmin)), [isAdmin]);
  
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
      setIsDark(prev => prev !== shouldBeDark ? shouldBeDark : prev);
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
    const fetchHitokoto = async () => {
      try {
        const res = await fetch('https://v1.hitokoto.cn/?c=d&c=h&c=k');
        const data = await res.json();
        setHitokoto({ text: data.hitokoto, from: data.from });
      } catch (e) { setHitokoto({ text: "人类的悲欢并不相通。", from: "鲁迅" }); }
    };
    fetchHitokoto();
    const interval = setInterval(fetchHitokoto, 15000);
    return () => clearInterval(interval);
  }, []);

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
                        isAdmin={isAdmin}
                        handleEditPost={handleEditPost}
                        handleDeletePost={handleDeletePost}
                        siteConfig={siteConfig}
                        announcements={announcements}
                        hitokoto={hitokoto}
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
                onClose={() => setEditor({ ...editor, isOpen: false })} 
                onSave={handleSavePost} 
             />
        </div>
    </HashRouter>
  );
};
