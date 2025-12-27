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
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-10 right-10 z-40 p-3 bg-white text-zine-blue border border-gray-200 shadow-soft rounded-full transition-all duration-500 hover:scale-110 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
    >
      <ArrowUp size={20} strokeWidth={1} />
    </button>
  );
};

// --- Login Modal ---
const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: (key: string) => void }> = ({ isOpen, onClose, onLogin }) => {
  const [key, setKey] = useState('');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-zine-blue text-white rounded-full flex items-center justify-center mb-6 shadow-lg">
          <Github size={32} />
        </div>
        <h2 className="text-xl font-serif font-bold text-zine-blue mb-2">管理权认证</h2>
        <p className="text-xs text-gray-400 text-center mb-8 uppercase tracking-widest">Linked to Github Account</p>
        
        <div className="w-full space-y-4">
          <div className="relative">
            <input 
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="输入管理密钥..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 ring-zine-pink/20 focus:border-zine-pink transition-all font-serif text-center"
              onKeyDown={(e) => e.key === 'Enter' && onLogin(key)}
            />
            <Key className="absolute left-4 top-3.5 text-gray-300" size={18} />
          </div>
          <Button 
            onClick={() => onLogin(key)} 
            className="w-full !py-3 !rounded-xl !text-base"
          >
            授权登录
          </Button>
          <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-zine-blue transition-colors py-2 uppercase tracking-widest">
            取消访问
          </button>
        </div>
        
        <p className="mt-8 text-[10px] text-gray-300 text-center">
          由于本页面为静态展示，密钥仅用于开启本地管理界面。
        </p>
      </div>
    </div>
  );
};

const Header: React.FC<{ 
  isAdmin: boolean; 
  onLoginClick: () => void;
  onLogout: () => void;
  onNewPost: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  avatarUrl: string;
}> = ({ isAdmin, onLoginClick, onLogout, onNewPost, searchQuery, setSearchQuery, avatarUrl }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        <Link to="/" className="group flex flex-col justify-center">
          <h1 className="text-2xl font-serif font-black tracking-tight text-zine-blue">
            电波FM<span className="text-zine-pink">.</span>
          </h1>
          <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 group-hover:text-zine-blue transition-colors">
            Electric Wave
          </span>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-sm hidden sm:block relative group">
            <input 
                type="text" 
                placeholder="搜索频道..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 border-b border-gray-300 bg-transparent focus:border-zine-blue outline-none transition-colors text-sm font-serif placeholder-gray-400"
            />
            <Search className="absolute left-0 top-1.5 text-gray-400 group-focus-within:text-zine-blue" size={16} />
        </div>

        <div className="flex items-center gap-6">
           <a href="https://github.com/Colerith/sillytavern-helper" target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity text-zine-blue">
              <Github size={20} strokeWidth={1.5} />
           </a>

          <div className="h-6 w-px bg-gray-200"></div>

          <div className="flex items-center gap-4">
            {isAdmin ? (
               <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4">
                  <Link to="/dashboard" className="w-9 h-9 rounded-full overflow-hidden border-2 border-zine-pink shadow-sm hover:scale-105 transition-transform" title="管理中心">
                      <img src={avatarUrl} alt="Admin" className="w-full h-full object-cover" />
                  </Link>
                  <button onClick={onLogout} title="登出" className="text-gray-400 hover:text-red-500 transition-colors">
                    <LogOut size={18} />
                  </button>
                  <Button onClick={onNewPost} variant="primary" icon={<Plus size={16} />} className="!py-1.5 !px-4 !text-xs !rounded-full hidden sm:flex">
                    发布
                  </Button>
               </div>
            ) : (
               <button 
                  onClick={onLoginClick}
                  className="text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-zine-blue transition-colors flex items-center gap-2"
                >
                  <LogIn size={14} /> 登录
                </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const AnnouncementGallery: React.FC<{ announcements: Announcement[] }> = ({ announcements }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const activeAnnouncements = announcements.filter(a => a.isActive);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % activeAnnouncements.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
    };

    useEffect(() => {
        if (activeAnnouncements.length <= 1) return;
        const interval = setInterval(nextSlide, 8000);
        return () => clearInterval(interval);
    }, [activeAnnouncements.length]);

    if (activeAnnouncements.length === 0) return null;

    return (
        <section className="mb-20">
             <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                <Megaphone size={14} className="text-zine-pink"/> 公告板
            </h3>
            <div className="relative bg-white border border-gray-100 shadow-soft rounded-2xl p-8 md:p-12 overflow-hidden group min-h-[280px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Megaphone size={80} className="text-zine-blue rotate-[-15deg]" />
                </div>
                
                <div className="relative z-10 w-full">
                    {activeAnnouncements.map((ann, idx) => (
                        <div 
                            key={ann.id}
                            className={`transition-all duration-700 absolute top-1/2 left-0 -translate-y-1/2 w-full flex flex-col justify-center ${
                                idx === currentIndex 
                                ? 'opacity-100 translate-x-0 scale-100 z-10' 
                                : 'opacity-0 translate-x-12 scale-95 z-0 pointer-events-none'
                            }`}
                            style={{ position: idx === currentIndex ? 'relative' : 'absolute', transform: idx === currentIndex ? 'none' : undefined }}
                        >
                            <div className="font-serif text-2xl md:text-3xl font-bold text-zine-blue leading-relaxed">
                                {ann.content}
                            </div>
                            <div className="mt-6 flex gap-2 items-center">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zine-pink/10 text-zine-pink">
                                    <Radio size={12} />
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">NEWS FLASH</span>
                            </div>
                        </div>
                    ))}
                </div>

                {activeAnnouncements.length > 1 && (
                    <div className="absolute bottom-6 right-8 flex gap-3 z-20">
                        <button onClick={prevSlide} className="p-2 border border-gray-200 rounded-full hover:bg-zine-blue hover:text-white transition-colors text-gray-400 bg-white">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={nextSlide} className="p-2 border border-gray-200 rounded-full hover:bg-zine-blue hover:text-white transition-colors text-gray-400 bg-white">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
                
                 {activeAnnouncements.length > 1 && (
                    <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full">
                        <div 
                            className="h-full bg-zine-pink transition-all duration-500 ease-out"
                            style={{ width: `${((currentIndex + 1) / activeAnnouncements.length) * 100}%` }}
                        ></div>
                    </div>
                 )}
            </div>
        </section>
    );
};

const Dashboard: React.FC<{ 
    posts: Post[]; 
    categories: string[];
    announcements: Announcement[];
    onUpdatePosts: (posts: Post[]) => void;
    onUpdateCategories: (cats: string[]) => void;
    onUpdateAnnouncements: (anns: Announcement[]) => void;
    onEditPost: (p: Post) => void; 
    onDeletePost: (id: string) => void;
    avatarUrl: string;
}> = ({ posts, categories, announcements, onUpdatePosts, onUpdateCategories, onUpdateAnnouncements, onEditPost, onDeletePost, avatarUrl }) => {
    const [activeTab, setActiveTab] = useState<'posts' | 'categories' | 'announcements'>('posts');
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleSortPosts = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        const _posts = [...posts];
        const draggedItemContent = _posts.splice(dragItem.current, 1)[0];
        _posts.splice(dragOverItem.current, 0, draggedItemContent);
        dragItem.current = null;
        dragOverItem.current = null;
        onUpdatePosts(_posts);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white border border-gray-100 shadow-soft p-8 min-h-[600px] flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-64 shrink-0 space-y-2 border-r border-gray-100 pr-6">
                    <h2 className="text-xl font-serif font-bold text-zine-blue mb-6">控制台</h2>
                    <button onClick={() => setActiveTab('posts')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'posts' ? 'bg-zine-blue/5 text-zine-blue font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>帖子管理</button>
                    <button onClick={() => setActiveTab('announcements')} className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'announcements' ? 'bg-zine-blue/5 text-zine-blue font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>公告管理</button>
                </div>
                <div className="flex-1 overflow-x-auto">
                    {activeTab === 'posts' && (
                        <div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs uppercase tracking-widest text-gray-400 border-b border-gray-100">
                                        <th className="py-4 w-10"></th>
                                        <th className="py-4 font-normal">标题</th>
                                        <th className="py-4 font-normal text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {posts.map((post, index) => (
                                        <tr key={post.id} draggable onDragStart={() => dragItem.current = index} onDragEnter={() => dragOverItem.current = index} onDragEnd={handleSortPosts} onDragOver={e => e.preventDefault()} className="group border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-move">
                                            <td className="py-4 text-gray-300"><GripVertical size={16} /></td>
                                            <td className="py-4 font-serif font-bold text-zine-blue">{post.title}</td>
                                            <td className="py-4 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => onEditPost(post)} className="text-gray-400 hover:text-zine-blue"><Edit3 size={16} /></button>
                                                    <button onClick={() => onDeletePost(post.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                <a href="#" className="block text-sm text-gray-500 hover:text-zine-pink transition-colors font-serif leading-tight">{text}</a>
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
  const post = posts.find(p => p.id === id);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  if (!post) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <h2 className="text-2xl font-serif font-bold text-gray-300 mb-4">条目丢失</h2>
            <Button onClick={() => navigate('/')}>返回首页</Button>
        </div>
    );
  }

  return (
    <article className="min-h-screen bg-white pb-20 animate-in fade-in duration-500">
        <div className="relative h-[60vh] w-full overflow-hidden">
            <div className="absolute inset-0 bg-zine-blue/30 mix-blend-multiply z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-20"></div>
            <img src={post.coverImage} className="w-full h-full object-cover" alt={post.title} />
            <div className="absolute bottom-0 left-0 w-full z-30 p-6 md:p-12 max-w-7xl mx-auto">
                <div className="flex gap-4 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 backdrop-blur rounded-full text-white hover:bg-white hover:text-zine-blue transition-colors group">
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    {isAdmin && (
                        <button onClick={() => onEdit(post)} className="p-2 bg-white/10 backdrop-blur rounded-full text-white hover:bg-white hover:text-zine-blue transition-colors">
                            <Edit3 size={24} />
                        </button>
                    )}
                </div>
                <span className="inline-block px-3 py-1 bg-zine-pink text-white text-xs font-bold uppercase tracking-widest mb-4">{post.category}</span>
                <h1 className="text-4xl md:text-6xl font-serif font-bold text-zine-blue mb-4 leading-tight">{post.title}</h1>
                <div className="flex items-center gap-6 text-gray-600 font-serif italic text-sm md:text-base">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>by {post.author}</span>
                </div>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-3 hidden lg:block"><TableOfContents content={post.content} /></div>
            <div className="lg:col-span-8 lg:col-start-4">
                 <div className="prose prose-lg prose-zinc max-w-none font-serif">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                 </div>
            </div>
        </div>
    </article>
  );
};

const HomePage: React.FC<{
  posts: Post[];
  isAdmin: boolean;
  onEdit: (p: Post) => void;
  onDelete: (id: string) => void;
  visitorCount: number;
  hitokoto: { text: string; from: string } | null;
  announcements: Announcement[];
}> = ({ posts, isAdmin, onEdit, onDelete, visitorCount, hitokoto, announcements }) => {
  const navigate = useNavigate();
  const pinnedPosts = posts.filter(p => p.isPinned);
  const regularPosts = posts.filter(p => !p.isPinned);

  return (
    <main>
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <section className="mb-24 flex flex-col md:flex-row items-start md:items-end justify-between gap-12 border-b border-zine-blue/10 pb-16">
            <div className="max-w-4xl relative group flex-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zine-blue/5 text-zine-blue text-xs font-bold uppercase tracking-widest mb-8 border border-zine-blue/10">
                    <span className="w-2 h-2 rounded-full bg-zine-pink"></span>
                    今日电波
                </span>
                <h2 className="text-xl md:text-3xl font-serif font-black leading-relaxed tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-r from-zine-blue via-zine-pink to-zine-blue py-3 drop-shadow-sm">
                “{hitokoto ? hitokoto.text : '正在接收电波...'}”
                </h2>
                <p className="text-lg text-gray-500 font-serif leading-relaxed italic">—— {hitokoto ? hitokoto.from : '...'}</p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right shrink-0">
                <div className="text-6xl font-serif font-light text-zine-blue/20">{posts.length}</div>
                <div className="text-xs uppercase tracking-widest text-gray-400">已收录条目</div>
                <div className="text-xs text-gray-300 font-mono mt-2">访客: {visitorCount}</div>
            </div>
        </section>

        <AnnouncementGallery announcements={announcements} />

        {pinnedPosts.length > 0 && (
            <section className="mb-20">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zine-pink mb-8 flex items-center gap-2">
                    <span className="w-8 h-px bg-zine-pink"></span> 精选推荐
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {pinnedPosts.map(post => (
                        <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="group cursor-pointer">
                            <div className="aspect-[2/1] bg-gray-100 overflow-hidden mb-6 relative rounded-sm">
                                <img src={post.coverImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                            </div>
                            <h4 className="text-3xl font-serif font-bold text-zine-blue mb-2 group-hover:text-zine-pink transition-colors">{post.title}</h4>
                            <p className="text-gray-500 font-serif line-clamp-2">{post.excerpt}</p>
                        </div>
                    ))}
                </div>
            </section>
        )}

        <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-8">最新收录</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                {regularPosts.map(post => (
                    <GalleryCard key={post.id} post={post} isAdmin={isAdmin} onClick={() => navigate(`/post/${post.id}`)} onEdit={(e) => { e.stopPropagation(); onEdit(post); }} onDelete={(e) => { e.stopPropagation(); onDelete(post.id); }} />
                ))}
            </div>
        </section>
      </div>
    </main>
  );
};

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('admin_logged_in') === 'true');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ isOpen: false, mode: 'create', currentPost: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [hitokoto, setHitokoto] = useState<{ text: string; from: string } | null>(null);
  const [avatarUrl] = useState('https://github.com/Colerith.png');
  const [visitorCount] = useState(Math.floor(Math.random() * 5000) + 1200);

  const allUsedTags = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [posts]);

  useEffect(() => {
    fetchHitokoto();
    const interval = setInterval(fetchHitokoto, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchHitokoto = async () => {
      try {
          const res = await fetch('https://v1.hitokoto.cn/?c=d&c=h&c=k');
          const data = await res.json();
          setHitokoto({ text: data.hitokoto, from: data.from });
      } catch (e) {
          setHitokoto({ text: "人类的悲欢并不相通，我只觉得他们吵闹。", from: "鲁迅" });
      }
  };

  const handleLogin = (key: string) => {
    if (key === 'admin' || key === 'sillytavern') {
      setIsAdmin(true);
      localStorage.setItem('admin_logged_in', 'true');
      setIsLoginModalOpen(false);
    } else { alert("密钥错误"); }
  };

  const handleSavePost = (post: Post) => {
    if (editor.mode === 'create') setPosts([post, ...posts]);
    else setPosts(posts.map(p => p.id === post.id ? post : p));
  };

  const filteredPosts = posts.filter(post => 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <HashRouter>
      <div className="min-h-screen bg-white text-gray-800 flex flex-col">
        <Header 
            isAdmin={isAdmin} 
            onLoginClick={() => setIsLoginModalOpen(true)}
            onLogout={() => { setIsAdmin(false); localStorage.removeItem('admin_logged_in'); }}
            onNewPost={() => setEditor({ isOpen: true, mode: 'create', currentPost: null })}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            avatarUrl={avatarUrl}
        />
        <Routes>
          <Route path="/" element={<HomePage posts={filteredPosts} isAdmin={isAdmin} onEdit={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} onDelete={id => setPosts(posts.filter(p => p.id !== id))} visitorCount={visitorCount} hitokoto={hitokoto} announcements={announcements} />} />
          <Route path="/post/:id" element={<PostDetail posts={posts} isAdmin={isAdmin} onEdit={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} />} />
          <Route path="/dashboard" element={isAdmin ? <Dashboard posts={posts} categories={categories} announcements={announcements} onUpdatePosts={setPosts} onUpdateCategories={setCategories} onUpdateAnnouncements={setAnnouncements} onEditPost={p => setEditor({ isOpen: true, mode: 'edit', currentPost: p })} onDeletePost={id => setPosts(posts.filter(p => p.id !== id))} avatarUrl={avatarUrl} /> : <div className="p-20 text-center">无权访问</div>} />
        </Routes>
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} />
        <EditorModal isOpen={editor.isOpen} mode={editor.mode} initialData={editor.currentPost} categories={categories} allTags={allUsedTags} onClose={() => setEditor({ ...editor, isOpen: false })} onSave={handleSavePost} />
        <ScrollToTop />
      </div>
    </HashRouter>
  );
};

export default App;