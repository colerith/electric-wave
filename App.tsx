import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { LayoutGrid, List, Plus, LogIn, LogOut, ChevronLeft, ArrowRight, Github, ExternalLink, Trash2, PlusCircle, Eye, Search, ArrowUp, Pin, Settings, LayoutDashboard, Menu, X, RefreshCw, GripVertical, Bell, ChevronRight, Megaphone, Radio, Edit3, Key } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Post, INITIAL_POSTS, INITIAL_LINKS, FriendlyLink, EditorState, ViewMode, Announcement, INITIAL_ANNOUNCEMENTS, DEFAULT_CATEGORIES } from './types';
import { GalleryCard } from './components/GalleryCard';
import { Button } from './components/Button';
import { EditorModal } from './components/EditorModal';

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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-zine-blue text-white rounded-full flex items-center justify-center mb-6 shadow-lg"><Github size={32} /></div>
        <h2 className="text-xl font-serif font-bold text-zine-blue mb-2">管理权认证</h2>
        <div className="w-full space-y-4">
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="输入管理密钥..." className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-center" onKeyDown={(e) => e.key === 'Enter' && onLogin(key)} />
          <Button onClick={() => onLogin(key)} className="w-full !py-3 !rounded-xl">授权登录</Button>
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

const Dashboard: React.FC<{ posts: Post[]; categories: string[]; announcements: Announcement[]; onUpdatePosts: (posts: Post[]) => void; onUpdateCategories: (cats: string[]) => void; onUpdateAnnouncements: (anns: Announcement[]) => void; onEditPost: (p: Post) => void; onDeletePost: (id: string) => void; avatarUrl: string; }> = ({ posts, categories, announcements, onUpdatePosts, onUpdateCategories, onUpdateAnnouncements, onEditPost, onDeletePost, avatarUrl }) => {
    const [activeTab, setActiveTab] = useState<'posts' | 'announcements'>('posts');
    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="bg-white border border-gray-100 shadow-soft p-8 min-h-[600px] flex gap-8">
                <div className="w-64 border-r border-gray-100 pr-6 space-y-2">
                    <h2 className="text-xl font-serif font-bold text-zine-blue mb-6">控制台</h2>
                    <button onClick={() => setActiveTab('posts')} className={`w-full text-left px-4 py-2 rounded-lg text-sm ${activeTab === 'posts' ? 'bg-zine-blue/5 text-zine-blue font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>帖子管理</button>
                </div>
                <div className="flex-1">
                    {activeTab === 'posts' && (
                        <table className="w-full text-left border-collapse">
                            <thead className="text-xs uppercase text-gray-400 border-b border-gray-100"><tr><th className="py-4">标题</th><th className="py-4 text-right">操作</th></tr></thead>
                            <tbody>
                                {posts.map(post => (
                                    <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 font-serif font-bold text-zine-blue">{post.title}</td>
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
                </div>
            </div>
        </div>
    );
};

const PostDetail: React.FC<{ posts: Post[]; isAdmin: boolean; onEdit: (p: Post) => void }> = ({ posts, isAdmin, onEdit }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const post = posts.find(p => p.id === id);
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  if (!post) return <div className="p-20 text-center font-serif">条目丢失 <br/> <Button onClick={() => navigate('/')} className="mt-4">返回首页</Button></div>;
  return (
    <article className="min-h-screen bg-white pb-20 animate-in fade-in duration-500">
        <div className="relative h-[60vh] w-full overflow-hidden">
            <div className="absolute inset-0 bg-zine-blue/30 z-10"></div>
            <img src={post.coverImage} className="w-full h-full object-cover" alt={post.title} />
            <div className="absolute bottom-0 left-0 w-full z-30 p-6 md:p-12 max-w-7xl mx-auto">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/10 backdrop-blur rounded-full text-white mb-6 hover:bg-white hover:text-zine-blue transition-colors group"><ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" /></button>
                <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">{post.title}</h1>
                <div className="text-white/80 font-serif italic">{new Date(post.createdAt).toLocaleDateString()} by {post.author}</div>
            </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-12 prose prose-lg prose-zinc font-serif"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown></div>
    </article>
  );
};

const HomePage: React.FC<{ posts: Post[]; isAdmin: boolean; onEdit: (p: Post) => void; onDelete: (id: string) => void; visitorCount: number; hitokoto: { text: string; from: string } | null; announcements: Announcement[]; }> = ({ posts, isAdmin, onEdit, onDelete, visitorCount, hitokoto, announcements }) => {
  const navigate = useNavigate();
  const pinnedPosts = posts.filter(p => p.isPinned);
  const regularPosts = posts.filter(p => !p.isPinned);
  return (
    <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <section className="mb-24 flex flex-col md:flex-row items-start md:items-end justify-between border-b border-zine-blue/10 pb-16">
            <div className="max-w-4xl flex-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zine-blue/5 text-zine-blue text-xs font-bold mb-8 border border-zine-blue/10">今日电波</span>
                <h2 className="text-xl md:text-3xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-zine-blue via-zine-pink to-zine-blue py-3">“{hitokoto ? hitokoto.text : '正在接收电波...'}”</h2>
                <p className="text-lg text-gray-500 font-serif italic">—— {hitokoto ? hitokoto.from : '...'}</p>
            </div>
            <div className="text-right shrink-0">
                <div className="text-6xl font-serif font-light text-zine-blue/20">{posts.length}</div>
                <div className="text-xs text-gray-400">已收录条目</div>
            </div>
        </section>
        <AnnouncementGallery announcements={announcements} />
        {pinnedPosts.length > 0 && (
            <section className="mb-20">
                <h3 className="text-sm font-bold text-zine-pink mb-8 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-8 h-px bg-zine-pink"></span> 精选推荐
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {pinnedPosts.map(post => (
                        <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="group cursor-pointer">
                            <div className="aspect-[2/1] overflow-hidden rounded-sm mb-6 bg-gray-100"><img src={post.coverImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={post.title} /></div>
                            <h4 className="text-3xl font-serif font-bold text-zine-blue group-hover:text-zine-pink transition-colors">{post.title}</h4>
                            <p className="text-gray-500 font-serif line-clamp-2 mt-2">{post.excerpt}</p>
                        </div>
                    ))}
                </div>
            </section>
        )}
        <section>
            <h3 className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest">最新收录</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularPosts.map(post => (
                    <GalleryCard key={post.id} post={post} isAdmin={isAdmin} onClick={() => navigate(`/post/${post.id}`)} onEdit={(e) => { e.stopPropagation(); onEdit(post); }} onDelete={(e) => { e.stopPropagation(); onDelete(post.id); }} />
                ))}
            </div>
        </section>
    </main>
  );
};

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [categories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('admin_logged_in') === 'true');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ isOpen: false, mode: 'create', currentPost: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [hitokoto, setHitokoto] = useState<{ text: string; from: string } | null>(null);
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

  const handleLogin = (key: string) => {
    if (key === 'fishy0517home') {
      setIsAdmin(true);
      localStorage.setItem('admin_logged_in', 'true');
      setIsLoginModalOpen(false);
    } else alert("密钥错误");
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
          <Route path="/" element={<HomePage posts={filteredPosts} isAdmin={isAdmin} onEdit={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} onDelete={id => setPosts(posts.filter(p => p.id !== id))} visitorCount={0} hitokoto={hitokoto} announcements={announcements} />} />
          <Route path="/post/:id" element={<PostDetail posts={posts} isAdmin={isAdmin} onEdit={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} />} />
          <Route path="/dashboard" element={isAdmin ? <Dashboard posts={posts} categories={categories} announcements={announcements} onUpdatePosts={setPosts} onUpdateCategories={() => {}} onUpdateAnnouncements={setAnnouncements} onEditPost={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} onDeletePost={id => setPosts(posts.filter(p => p.id !== id))} avatarUrl={avatarUrl} /> : <div className="p-20 text-center">无权访问</div>} />
        </Routes>
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} />
        <EditorModal isOpen={editor.isOpen} mode={editor.mode} initialData={editor.currentPost} categories={categories} allTags={allUsedTags} onClose={() => setEditor({ ...editor, isOpen: false })} onSave={handleSavePost} />
        <ScrollToTop />
      </div>
    </HashRouter>
  );
};

export default App;
