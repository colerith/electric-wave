
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Post } from '../types';
import { Button } from './Button';
import { X, Wand2, Loader2, Image as ImageIcon, Tag, Star, Bold, Italic, Link, Quote, Code, List, Heading1, Heading2, Minus, Upload } from 'lucide-react';
import { generatePostEnhancement } from '../services/geminiService';

interface EditorModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData: Post | null;
  categories: string[];
  allTags: string[]; // Receive available tags
  onClose: () => void;
  onSave: (post: Post) => void;
}

export const EditorModal: React.FC<EditorModalProps> = ({
  isOpen,
  mode,
  initialData,
  categories,
  allTags,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Post>>({
    title: '',
    excerpt: '',
    content: '',
    tags: [],
    category: categories[0] || '指南',
    coverImage: '',
    isPinned: false
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'cover' | 'content' | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        title: '',
        excerpt: '',
        content: '',
        tags: [],
        category: categories[0] || '指南',
        coverImage: '', // Default to empty
        isPinned: false
      });
    }
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    const postToSave: Post = {
      id: initialData?.id || crypto.randomUUID(),
      title: formData.title,
      excerpt: formData.excerpt || '',
      content: formData.content,
      tags: formData.tags || [],
      category: formData.category || categories[0],
      coverImage: formData.coverImage || '',
      createdAt: initialData?.createdAt || Date.now(),
      author: '电波系', // Fixed author name
      isPinned: formData.isPinned
    };

    onSave(postToSave);
    onClose();
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const enhanced = await generatePostEnhancement(formData.content || '', aiPrompt);
      setFormData(prev => ({ ...prev, content: enhanced }));
      setShowAiInput(false);
      setAiPrompt('');
    } catch (error) {
      alert('内容生成失败，请检查 API Key。');
    } finally {
      setIsGenerating(false);
    }
  };

  const addTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim();
    if (cleanTag && !formData.tags?.includes(cleanTag)) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), cleanTag] }));
    }
    setTagInput('');
  };

  // Helper to insert markdown at cursor
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = formData.content || '';
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setFormData({ ...formData, content: newText });
    
    // Defer cursor update slightly
    setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
        }
    }, 0);
  };

  const triggerUpload = (target: 'cover' | 'content') => {
      setUploadTarget(target);
      if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset
          fileInputRef.current.click();
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const result = event.target?.result as string;
          if (uploadTarget === 'cover') {
              setFormData(prev => ({ ...prev, coverImage: result }));
          } else if (uploadTarget === 'content') {
              insertMarkdown(`\n![图片](${result})\n`);
          }
      };
      reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 sm:p-6">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      
      <div className="w-full max-w-6xl h-full max-h-[95vh] bg-zine-paper dark:bg-dark-paper flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 rounded-sm">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="w-2 h-8 bg-zine-blue dark:bg-zine-pink"></span>
            <h2 className="text-2xl font-serif font-bold text-zine-blue dark:text-white">
              {mode === 'create' ? '新建条目' : '编辑条目'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-zine-blue dark:hover:text-white transition-colors">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-10 relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* Main Editor */}
            <div className="md:col-span-8 flex flex-col gap-8">
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full text-4xl font-serif font-bold border-b border-gray-200 dark:border-gray-700 focus:border-zine-pink outline-none py-2 bg-transparent placeholder-gray-300 transition-colors text-zine-blue dark:text-white"
                placeholder="输入标题..."
              />

              <textarea 
                value={formData.excerpt}
                onChange={e => setFormData({...formData, excerpt: e.target.value})}
                className="w-full h-20 p-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-sm focus:border-zine-pink outline-none text-sm resize-none font-serif text-gray-600 dark:text-gray-300 leading-relaxed"
                placeholder="简短摘要..."
              />

              <div className="flex flex-col flex-1 min-h-[500px]">
                {/* Toolbar Area */}
                <div className="flex justify-between items-center mb-2 pb-2">
                  <div className="flex gap-4 items-center">
                     <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                        <button onClick={() => setViewMode('edit')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-slate-700 text-zine-blue dark:text-white shadow-sm' : 'text-gray-400'}`}>编辑</button>
                        <button onClick={() => setViewMode('preview')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-slate-700 text-zine-blue dark:text-white shadow-sm' : 'text-gray-400'}`}>预览</button>
                     </div>
                     
                     {/* Markdown Toolbar */}
                     {viewMode === 'edit' && (
                         <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-4">
                             <button onClick={() => insertMarkdown('**', '**')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="加粗"><Bold size={14}/></button>
                             <button onClick={() => insertMarkdown('*', '*')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="斜体"><Italic size={14}/></button>
                             <button onClick={() => insertMarkdown('# ', '')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="标题1"><Heading1 size={14}/></button>
                             <button onClick={() => insertMarkdown('## ', '')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="标题2"><Heading2 size={14}/></button>
                             <button onClick={() => insertMarkdown('> ', '')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="引用"><Quote size={14}/></button>
                             <button onClick={() => insertMarkdown('[链接文字](url)')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="链接"><Link size={14}/></button>
                             <button onClick={() => insertMarkdown('```\n', '\n```')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="代码块"><Code size={14}/></button>
                             <button onClick={() => insertMarkdown('\n\n---\n\n')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="分割线"><Minus size={14}/></button>
                             <button onClick={() => triggerUpload('content')} className="p-1.5 text-gray-400 hover:text-zine-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 rounded" title="插入图片"><ImageIcon size={14}/></button>
                         </div>
                     )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button onClick={() => setShowAiInput(!showAiInput)} className={`transition-colors ${showAiInput ? 'text-zine-pink' : 'text-gray-400 hover:text-zine-pink'}`} title="AI 辅助"><Wand2 size={18} /></button>
                  </div>
                </div>

                {showAiInput && (
                  <div className="bg-zine-blue/5 dark:bg-zine-pink/10 p-4 mb-4 border-l-2 border-zine-blue dark:border-zine-pink rounded-r flex gap-2">
                    <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="AI 辅助撰写指令..." className="flex-1 bg-transparent border-none outline-none text-sm dark:text-gray-200" />
                    <button onClick={handleAiGenerate} disabled={isGenerating} className="text-zine-blue dark:text-zine-pink font-bold text-xs">{isGenerating ? '处理中...' : '发送'}</button>
                  </div>
                )}

                <div className="flex-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-sm overflow-hidden flex flex-col">
                    {viewMode === 'edit' ? (
                        <textarea 
                            ref={textareaRef}
                            value={formData.content} 
                            onChange={e => setFormData({...formData, content: e.target.value})} 
                            className="w-full h-full p-6 outline-none text-base font-sans font-medium leading-relaxed resize-none text-gray-700 dark:text-gray-200 min-h-[400px]" 
                            placeholder="# 在此输入内容 (支持 Markdown)..." 
                        />
                    ) : (
                        <div className="w-full h-full p-6 overflow-y-auto prose prose-blue dark:prose-invert max-w-none">
                             <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.content || ''}</ReactMarkdown>
                        </div>
                    )}
                </div>
              </div>
            </div>

            {/* Sidebar Meta */}
            <div className="md:col-span-4 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">分类</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-gray-700 outline-none focus:border-zine-blue font-serif text-sm">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              
              <div className="space-y-3">
                 <label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2"><ImageIcon size={12}/> 封面图片</label>
                 <div className="flex gap-2">
                     <input 
                        type="text" 
                        value={formData.coverImage} 
                        onChange={e => setFormData({...formData, coverImage: e.target.value})}
                        placeholder="https://... 或点击上传"
                        className="flex-1 p-3 bg-white dark:bg-slate-800 dark:text-white border border-gray-200 dark:border-gray-700 outline-none focus:border-zine-blue text-sm truncate"
                     />
                     <Button type="button" variant="secondary" onClick={() => triggerUpload('cover')} className="!px-3" title="上传本地图片">
                        <Upload size={14} />
                        <span className="hidden sm:inline ml-1">上传</span>
                     </Button>
                 </div>
                 
                 {formData.coverImage && (
                     <div className="aspect-video w-full rounded overflow-hidden bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-gray-700">
                         <img src={formData.coverImage} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display='none')} />
                     </div>
                 )}
              </div>

               <div className="flex items-center gap-3 py-2 bg-gray-50 dark:bg-slate-800/50 p-3 rounded">
                  <input type="checkbox" id="isPinned" checked={formData.isPinned} onChange={e => setFormData({...formData, isPinned: e.target.checked})} className="w-4 h-4 accent-zine-pink" />
                  <label htmlFor="isPinned" className="text-sm font-serif text-zine-blue dark:text-zine-pink cursor-pointer">置顶此条目</label>
               </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Tag size={12}/> 标签
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags?.map(tag => (
                    <span key={tag} className="bg-zine-blue/5 dark:bg-zine-blue/20 px-2 py-1 text-xs text-zine-blue dark:text-blue-300 flex items-center gap-1 group">
                      #{tag}
                      <button onClick={() => setFormData(prev => ({...prev, tags: prev.tags?.filter(t => t !== tag)}))} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag(tagInput)}
                  className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-zine-pink outline-none text-sm p-1 dark:text-white"
                  placeholder="输入新标签并回车..."
                />

                {/* Tag Recommendations */}
                {allTags.length > 0 && (
                  <div className="pt-4 border-t border-gray-50 dark:border-gray-800">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block mb-3">常用推荐</span>
                    <div className="flex flex-wrap gap-2">
                      {allTags.filter(t => !formData.tags?.includes(t)).slice(0, 10).map(tag => (
                        <button 
                          key={tag} 
                          onClick={() => addTag(tag)}
                          className="text-[10px] px-2 py-1 bg-gray-50 dark:bg-slate-800 text-gray-400 hover:bg-zine-pink/10 hover:text-zine-pink border border-gray-100 dark:border-gray-700 rounded-sm transition-all"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 flex justify-end gap-6">
          <button onClick={onClose} className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">取消</button>
          <Button onClick={handleSubmit}>保存条目</Button>
        </div>
      </div>
    </div>
  );
};
