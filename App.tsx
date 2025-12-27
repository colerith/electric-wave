
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { LayoutGrid, List, Plus, LogIn, LogOut, ChevronLeft, ArrowRight, Github, ExternalLink, Trash2, PlusCircle, Eye, Search, ArrowUp, Pin, Settings, LayoutDashboard, Menu, X, RefreshCw, GripVertical, Bell, ChevronRight, Megaphone, Radio, Edit3, Key, BarChart3, Globe, Link as LinkIcon, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Post, INITIAL_POSTS, INITIAL_LINKS, FriendlyLink, EditorState, ViewMode, Announcement, INITIAL_ANNOUNCEMENTS, DEFAULT_CATEGORIES } from './types';
import { GalleryCard } from './components/GalleryCard';
import { Button } from './components/Button';
import { EditorModal } from './components/EditorModal';

// --- Security Helper ---
const ADMIN_HASH = "14620c325c044b76c8c084605e54d89069d72115162a5b678f2e293a3889021e";

async function digestMessage(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

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
    <button onClick={scrollToTop} className={`fixed bottom-10 right-10 z-40 p-3 bg-white text-zine-blue border border-gray-200 shadow-soft rounded-full transition-all duration-500 hover:scale-110 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
      <ArrowUp size={20} strokeWidth={1} />
    </button>
  );
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
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-zine-blue text-white rounded-full flex items-center justify-center mb-6 shadow-lg"><Github size={32} /></div>
        <h2 className="text-xl font-serif font-bold text-zine-blue mb-2">管理权认证</h2>
        <div className="w-full space-y-4">
          <input 
            type="password" 
            value={key} 
            onChange={(e) => setKey(e.target.value)} 
            placeholder="输入管理密钥..." 
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-center" 
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

const Header: React.FC<{ isAdmin: boolean; onLoginClick: () => void; onLogout: () => void; onNewPost: () => void; searchQuery: string; setSearchQuery: (q: string) => void; avatarUrl: string; }> = ({ isAdmin, onLoginClick, onLogout, onNewPost, searchQuery, setSearchQuery, avatarUrl }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 h-20">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-8">
        <Link to="/" className="group flex flex-col justify-center">
          <h1 className="text-2xl font-serif font-black text-zine-blue">电波FM<span className="text-zine-pink">.</span></h1>
          <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 group-hover:text-zine-blue transition-colors">Electric Wave</span>
        </Link>
        <div className="flex-1 max-w-sm relative hidden sm:block">
          <input type="text" placeholder="搜索频道..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-4 py-1.5 border-b border-gray-300 bg-transparent focus:border-zine-blue outline-none text-sm font-serif" />
          <Search className="absolute left-0 top-1.5 text-gray-400" size={16} />
        </div>
        <div className="flex items-center gap-6">
          <a href="https://github.com/Colerith/electric-wave" target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity text-zine-blue">
            <Github size={20} strokeWidth={1.5} />
          </a>
          <div className="h-6 w-px bg-gray-200"></div>
          {isAdmin ? (
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="w-9 h-9 rounded-full overflow-hidden border-2 border-zine-pink"><img src={avatarUrl} className="w-full h-full object-cover" alt="admin" /></Link>
              <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
              <Button onClick={onNewPost} variant="primary" icon={<Plus size={16} />} className="!py-1.5 !px-4 !text-xs !rounded-full">发布</Button>
            </div>
          ) : (
            <button onClick={onLoginClick} className="text-xs font-bold text-gray-400 hover:text-zine-blue flex items-center gap-2"><LogIn size={14} /> 登录</button>
          )}
        </div>
      </div>
    </header>
  );
};

const Footer: React.FC<{ links: FriendlyLink[]; isAdmin: boolean }> = ({ links, isAdmin }) => {
    return (
        <footer className="bg-white border-t border-gray-100 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    <div>
                        <h4 className="font-serif font-bold text-zine-blue mb-4 flex items-center gap-2"><Globe size={16}/> 站点统计</h4>
                        <div className="space-y-2 text-sm text-gray-500 font-serif">
                             <div className="flex items-center gap-2">
                                <BarChart3 size={14} className="text-zine-pink" />
                                {/* Busuanzi Unique Visitor Counter */}
                                <span id="busuanzi_container_site_uv" style={{ display: 'none' }}>
                                    访客数: <span id="busuanzi_value_site_uv" className="font-bold text-zine-blue">--</span>
                                </span>
                             </div>
                             <div>
                                 {/* Busuanzi Page View Counter */}
                                 <span id="busuanzi_container_site_pv" style={{ display: 'none' }}>
                                    总浏览量: <span id="busuanzi_value_site_pv" className="font-bold text-zine-blue">--</span>
                                 </span>
                             </div>
                             <div>运行天数: <span>{Math.floor((Date.now() - 1704067200000) / (1000 * 60 * 60 * 24))} 天</span></div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-serif font-bold text-zine-blue mb-4 flex items-center gap-2">
                            <LinkIcon size={16}/> 友情链接
                            {isAdmin && <Link to="/dashboard" className="text-xs text-gray-300 hover:text-zine-pink ml-2 font-normal underline">管理</Link>}
                        </h4>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {links.map(link => (
                                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-zine-pink transition-colors font-serif border-b border-dashed border-gray-300 hover:border-zine-pink pb-0.5">{link.title}</a>
                            ))}
                        </div>
                    </div>
                    <div className="md:text-right">
                        <h4 className="font-serif font-bold text-zine-blue mb-4">Electric Wave.</h4>
                        <p className="text-xs text-gray-400 leading-relaxed max-w-xs ml-auto">
                            © {new Date().getFullYear()} Colerith. <br/>
                            Built with React & Gemini AI. <br/>
                            Designed for SillyTavern Community.
                        </p>
                    </div>
                </div>
                <div className="text-center">
                     <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6"></div>
                     <p className="text-[10px] text-gray-300 uppercase tracking-widest">End of Transmission</p>
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
            <div className="relative bg-white border border-gray-100 shadow-soft rounded-2xl p-8 md:p-12 min-h-[280px] flex flex-col justify-center overflow-hidden">
                {activeAnnouncements.map((ann, idx) => (
                    <div key={ann.id} className={`transition-all duration-700 absolute inset-0 p-8 flex flex-col justify-center ${idx === currentIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}`}>
                        <div className="font-serif text-2xl md:text-3xl font-bold text-zine-blue leading-relaxed">{ann.content}</div>
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
    onUpdatePosts: (posts: Post[]) => void; 
    onUpdateCategories: (cats: string[]) => void; 
    onUpdateAnnouncements: (anns: Announcement[]) => void; 
    onUpdateLinks: (links: FriendlyLink[]) => void;
    onEditPost: (p: Post) => void; 
    onDeletePost: (id: string) => void; 
    avatarUrl: string; 
}> = ({ posts, categories, announcements, links, onUpdatePosts, onUpdateCategories, onUpdateAnnouncements, onUpdateLinks, onEditPost, onDeletePost, avatarUrl }) => {
    const [activeTab, setActiveTab] = useState<'posts' | 'announcements' | 'categories' | 'links'>('posts');
    const [newCategory, setNewCategory] = useState('');
    const [newLink, setNewLink] = useState({ title: '', url: '' });
    const [newAnnouncement, setNewAnnouncement] = useState('');

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
            <div className="bg-white border border-gray-100 shadow-soft p-8 min-h-[600px] flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-64 md:border-r border-gray-100 md:pr-6 space-y-2 shrink-0">
                    <h2 className="text-xl font-serif font-bold text-zine-blue mb-6">控制台</h2>
                    <button onClick={() => setActiveTab('posts')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'posts' ? 'bg-zine-blue/5 text-zine-blue font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>文章管理</button>
                    <button onClick={() => setActiveTab('announcements')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'announcements' ? 'bg-zine-blue/5 text-zine-blue font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>公告管理</button>
                    <button onClick={() => setActiveTab('categories')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'categories' ? 'bg-zine-blue/5 text-zine-blue font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>分区设置</button>
                    <button onClick={() => setActiveTab('links')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'links' ? 'bg-zine-blue/5 text-zine-blue font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>友链设置</button>
                </div>
                <div className="flex-1 overflow-x-auto">
                    {/* Posts Management */}
                    {activeTab === 'posts' && (
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead className="text-xs uppercase text-gray-400 border-b border-gray-100"><tr><th className="py-4">标题</th><th className="py-4">日期</th><th className="py-4 text-right">操作</th></tr></thead>
                            <tbody>
                                {posts.map(post => (
                                    <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 font-serif font-bold text-zine-blue flex items-center gap-2">
                                            {post.isPinned && <Pin size={12} className="text-zine-pink" fill="currentColor"/>}
                                            {post.title}
                                        </td>
                                        <td className="py-4 text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</td>
                                        <td className="py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                              <button onClick={() => onEditPost(post)} className="text-gray-400 hover:text-zine-blue"><Edit3 size={16}/></button>
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
                            <div className="flex gap-2">
                                <input value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} placeholder="发布新公告..." className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-zine-blue text-sm" />
                                <Button onClick={() => { if(newAnnouncement) { onUpdateAnnouncements([...announcements, {id: crypto.randomUUID(), content: newAnnouncement, isActive: true}]); setNewAnnouncement(''); } }} className="!py-2">添加</Button>
                            </div>
                            <div className="space-y-2">
                                {announcements.map((ann, idx) => (
                                    <div key={ann.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg group">
                                        <div className="flex flex-col gap-1 text-gray-400">
                                            <button onClick={() => onUpdateAnnouncements(moveItem(announcements, idx, 'up'))} className="hover:text-zine-blue"><ArrowUp size={14}/></button>
                                            <button onClick={() => onUpdateAnnouncements(moveItem(announcements, idx, 'down'))} className="hover:text-zine-blue"><ArrowDown size={14}/></button>
                                        </div>
                                        <div className="flex-1">
                                            <input value={ann.content} onChange={(e) => { const n = [...announcements]; n[idx].content = e.target.value; onUpdateAnnouncements(n); }} className="w-full bg-transparent outline-none font-serif text-zine-blue" />
                                        </div>
                                        <div className="flex items-center gap-3">
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
                                <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="新分区名称..." className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-zine-blue text-sm" />
                                <Button onClick={() => { if(newCategory && !categories.includes(newCategory)) { onUpdateCategories([...categories, newCategory]); setNewCategory(''); } }} className="!py-2">添加</Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categories.map((cat, idx) => (
                                    <div key={cat} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <span className="font-serif font-bold text-zine-blue">{cat}</span>
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
                                <input value={newLink.title} onChange={e => setNewLink({...newLink, title: e.target.value})} placeholder="网站名称" className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-zine-blue text-sm" />
                                <input value={newLink.url} onChange={e => setNewLink({...newLink, url: e.target.value})} placeholder="URL (https://...)" className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-zine-blue text-sm" />
                                <Button onClick={() => { if(newLink.title && newLink.url) { onUpdateLinks([...links, {id: crypto.randomUUID(), ...newLink}]); setNewLink({title:'', url:''}); } }} className="!py-2">添加友链</Button>
                            </div>
                            <div className="space-y-2">
                                {links.map((link, idx) => (
                                    <div key={link.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex flex-col gap-1 text-gray-400">
                                            <button onClick={() => onUpdateLinks(moveItem(links, idx, 'up'))} className="hover:text-zine-blue"><ArrowUp size={14}/></button>
                                            <button onClick={() => onUpdateLinks(moveItem(links, idx, 'down'))} className="hover:text-zine-blue"><ArrowDown size={14}/></button>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <input value={link.title} onChange={(e) => { const n = [...links]; n[idx].title = e.target.value; onUpdateLinks(n); }} className="w-full bg-transparent outline-none font-bold text-zine-blue" />
                                            <input value={link.url} onChange={(e) => { const n = [...links]; n[idx].url = e.target.value; onUpdateLinks(n); }} className="w-full bg-transparent outline-none text-gray-500 text-sm" />
                                        </div>
                                        <button onClick={() => onUpdateLinks(links.filter(l => l.id !== link.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TableOfContents: React.FC<{ content: string }> = ({ content }) => {
  const headings = content.match(/^(#{1,3})\s+(.*)$/gm);
  if (!headings || headings.length === 0) return null;
  return (
    <div className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-32">
        <h4 className="font-serif font-bold text-zine-blue mb-4 text-sm uppercase tracking-widest">目录</h4>
        <ul className="space-y-3 relative border-l border-gray-200 ml-1">
          {headings.map((heading, index) => {
            const level = heading.match(/^#+/)?.[0].length || 1;
            const text = heading.replace(/^#+\s+/, '');
            return (
              <li key={index} style={{ paddingLeft: `${(level) * 12}px` }} className="relative">
                <span className="block text-sm text-gray-500 hover:text-zine-pink transition-colors font-serif leading-tight cursor-default">{text}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

const PostDetail: React.FC<{ posts: Post[]; isAdmin: boolean; onEdit: (p: Post) => void }> = ({ posts, isAdmin, onEdit }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const post = posts.find(p => String(p.id) === String(id));
  
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  
  if (!post) {
    return (
      <div className="p-20 text-center font-serif">
        <h2 className="text-2xl text-gray-400 mb-4">条目丢失 (ID: {id})</h2>
        <Button onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-white pb-20 animate-in fade-in duration-500">
        {/* Header Area with Image and Gradient Mask */}
        <div className="relative h-[60vh] w-full overflow-hidden group">
            <img 
                src={post.coverImage} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt={post.title} 
            />
            {/* Dark Gradient Mask for Text Readability */}
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
        
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-3 hidden lg:block"><TableOfContents content={post.content} /></div>
            <div className="lg:col-span-8 lg:col-start-4">
                 <div className="prose prose-lg prose-zinc max-w-none font-serif leading-loose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                 </div>
            </div>
        </div>
    </article>
  );
};

const HomePage: React.FC<{ posts: Post[]; categories: string[]; isAdmin: boolean; onEdit: (p: Post) => void; onDelete: (id: string) => void; visitorCount: number; hitokoto: { text: string; from: string } | null; announcements: Announcement[]; }> = ({ posts, categories, isAdmin, onEdit, onDelete, visitorCount, hitokoto, announcements }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredPostsByCat = selectedCategory === 'All' ? posts : posts.filter(p => p.category === selectedCategory);
  const pinnedPosts = filteredPostsByCat.filter(p => p.isPinned);
  const regularPosts = filteredPostsByCat.filter(p => !p.isPinned);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20 flex-1">
        <section className="mb-24 flex flex-col md:flex-row items-start md:items-end justify-between border-b border-zine-blue/10 pb-16">
            <div className="max-w-4xl flex-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zine-blue/5 text-zine-blue text-xs font-bold mb-8 border border-zine-blue/10">今日电波</span>
                <h2 className="text-xl md:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-zine-blue via-zine-pink to-zine-blue py-3">“{hitokoto ? hitokoto.text : '正在接收电波...'}”</h2>
                <p className="text-lg text-gray-500 font-serif italic">—— {hitokoto ? hitokoto.from : '...'}</p>
            </div>
            <div className="text-right shrink-0 hidden md:block">
                <div className="text-6xl font-serif font-light text-zine-blue/20">{posts.length}</div>
                <div className="text-xs text-gray-400">已收录条目</div>
            </div>
        </section>
        
        <AnnouncementGallery announcements={announcements} />

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-12 sticky top-20 z-30 bg-white/80 backdrop-blur-md py-4 -mx-6 px-6 md:mx-0 md:px-0 md:bg-transparent md:static">
             <button 
                onClick={() => setSelectedCategory('All')}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === 'All' ? 'bg-zine-blue text-white shadow-soft' : 'bg-white text-gray-500 hover:text-zine-blue border border-gray-100'}`}
             >
                全部
             </button>
             {categories.map(cat => (
                 <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-zine-blue text-white shadow-soft' : 'bg-white text-gray-500 hover:text-zine-blue border border-gray-100'}`}
                 >
                    {cat}
                 </button>
             ))}
        </div>

        {pinnedPosts.length > 0 && (
            <section className="mb-20 animate-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-sm font-bold text-zine-pink mb-8 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-8 h-px bg-zine-pink"></span> 精选推荐
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {pinnedPosts.map(post => (
                        <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="group cursor-pointer">
                            <div className="aspect-[2/1] overflow-hidden rounded-sm mb-6 bg-gray-100 shadow-sm"><img src={post.coverImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={post.title} /></div>
                            <h4 className="text-3xl font-serif font-bold text-zine-blue group-hover:text-zine-pink transition-colors">{post.title}</h4>
                            <p className="text-gray-500 font-serif line-clamp-2 mt-2">{post.excerpt}</p>
                        </div>
                    ))}
                </div>
            </section>
        )}
        <section className="animate-in slide-in-from-bottom-8 duration-700">
            <h3 className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest">
                {selectedCategory === 'All' ? '最新收录' : `${selectedCategory} 分区`}
            </h3>
            {regularPosts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {regularPosts.map(post => (
                        <GalleryCard key={post.id} post={post} isAdmin={isAdmin} onClick={() => navigate(`/post/${post.id}`)} onEdit={(e) => { e.stopPropagation(); onEdit(post); }} onDelete={(e) => { e.stopPropagation(); onDelete(post.id); }} />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-gray-400 font-serif italic border border-dashed border-gray-200 rounded-2xl">
                    此分区暂无内容...
                </div>
            )}
        </section>
    </main>
  );
};

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [links, setLinks] = useState<FriendlyLink[]>(INITIAL_LINKS);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('admin_logged_in') === 'true');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ isOpen: false, mode: 'create', currentPost: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [hitokoto, setHitokoto] = useState<{ text: string; from: string } | null>(null);
  const [visitorCount, setVisitorCount] = useState(0); // Kept for type compatibility but not used for display
  const avatarUrl = 'https://github.com/Colerith.png';

  const allUsedTags = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [posts]);

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
    try {
      const hash = await digestMessage(key);
      if (hash === ADMIN_HASH) {
        setIsAdmin(true);
        localStorage.setItem('admin_logged_in', 'true');
        setIsLoginModalOpen(false);
      } else {
        alert("密钥错误");
      }
    } catch (e) {
      console.error("Login Error:", e);
      alert("验证出错，请重试");
    }
  };

  const handleSavePost = (post: Post) => {
    if (editor.mode === 'create') setPosts([post, ...posts]);
    else setPosts(posts.map(p => p.id === post.id ? post : p));
  };

  const filteredPosts = posts.filter(post => post.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <HashRouter>
      <div className="min-h-screen bg-white text-gray-800 flex flex-col">
        <Header isAdmin={isAdmin} onLoginClick={() => setIsLoginModalOpen(true)} onLogout={() => { setIsAdmin(false); localStorage.removeItem('admin_logged_in'); }} onNewPost={() => setEditor({ isOpen: true, mode: 'create', currentPost: null })} searchQuery={searchQuery} setSearchQuery={setSearchQuery} avatarUrl={avatarUrl} />
        <Routes>
          <Route path="/" element={<HomePage posts={filteredPosts} categories={categories} isAdmin={isAdmin} onEdit={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} onDelete={id => setPosts(posts.filter(p => p.id !== id))} visitorCount={visitorCount} hitokoto={hitokoto} announcements={announcements} />} />
          <Route path="/post/:id" element={<PostDetail posts={posts} isAdmin={isAdmin} onEdit={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} />} />
          <Route path="/dashboard" element={isAdmin ? <Dashboard posts={posts} categories={categories} announcements={announcements} links={links} onUpdatePosts={setPosts} onUpdateCategories={setCategories} onUpdateAnnouncements={setAnnouncements} onUpdateLinks={setLinks} onEditPost={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} onDeletePost={id => setPosts(posts.filter(p => p.id !== id))} avatarUrl={avatarUrl} /> : <div className="p-20 text-center">无权访问</div>} />
        </Routes>
        <Footer links={links} isAdmin={isAdmin} visitorCount={visitorCount} />
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} />
        <EditorModal isOpen={editor.isOpen} mode={editor.mode} initialData={editor.currentPost} categories={categories} allTags={allUsedTags} onClose={() => setEditor({ ...editor, isOpen: false })} onSave={handleSavePost} />
        <ScrollToTop />
      </div>
    </HashRouter>
  );
};

export default App;
