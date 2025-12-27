import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Post } from '../types';
import { Button } from './Button';
import { X, Wand2, Loader2, Image as ImageIcon, Tag, Star } from 'lucide-react';
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
    coverImage: 'https://picsum.photos/800/400',
    isPinned: false
  });
  
  const [tagInput, setTagInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

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
        coverImage: `https://picsum.photos/800/400?random=${Math.floor(Math.random() * 1000)}`,
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
      author: initialData?.author || 'Colerith',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-6xl h-full max-h-[95vh] bg-zine-paper flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 rounded-sm">
        
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="w-2 h-8 bg-zine-blue"></span>
            <h2 className="text-2xl font-serif font-bold text-zine-blue">
              {mode === 'create' ? '新建条目' : '编辑条目'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-zine-blue transition-colors">
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
                className="w-full text-4xl font-serif font-bold border-b border-gray-200 focus:border-zine-pink outline-none py-2 bg-transparent placeholder-gray-300 transition-colors text-zine-blue"
                placeholder="输入标题..."
              />

              <textarea 
                value={formData.excerpt}
                onChange={e => setFormData({...formData, excerpt: e.target.value})}
                className="w-full h-20 p-4 bg-white border border-gray-100 rounded-sm focus:border-zine-pink outline-none text-sm resize-none font-serif text-gray-600 leading-relaxed"
                placeholder="简短摘要..."
              />

              <div className="flex flex-col flex-1 min-h-[400px]">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                  <div className="flex gap-6">
                     <button onClick={() => setViewMode('edit')} className={`text-sm font-bold pb-2 border-b-2 transition-all ${viewMode === 'edit' ? 'border-zine-blue text-zine-blue' : 'border-transparent text-gray-400'}`}>编辑</button>
                     <button onClick={() => setViewMode('preview')} className={`text-sm font-bold pb-2 border-b-2 transition-all ${viewMode === 'preview' ? 'border-zine-blue text-zine-blue' : 'border-transparent text-gray-400'}`}>预览</button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAiInput(!showAiInput)} className={`transition-colors ${showAiInput ? 'text-zine-pink' : 'text-gray-400 hover:text-zine-pink'}`}><Wand2 size={18} /></button>
                  </div>
                </div>

                {showAiInput && (
                  <div className="bg-zine-blue/5 p-4 mb-4 border-l-2 border-zine-blue rounded-r flex gap-2">
                    <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="AI 辅助撰写指令..." className="flex-1 bg-transparent border-none outline-none text-sm" />
                    <button onClick={handleAiGenerate} disabled={isGenerating} className="text-zine-blue font-bold text-xs">{isGenerating ? '处理中...' : '发送'}</button>
                  </div>
                )}

                <div className="flex-1 bg-white border border-gray-100 shadow-sm rounded-sm overflow-hidden">
                    {viewMode === 'edit' ? (
                        <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full h-full p-6 outline-none text-base font-mono leading-relaxed resize-none text-gray-700 min-h-[300px]" placeholder="# 在此输入内容..." />
                    ) : (
                        <div className="w-full h-full p-6 overflow-y-auto prose prose-blue max-w-none font-serif">
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
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 bg-white border border-gray-200 outline-none focus:border-zine-blue font-serif text-sm">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

               <div className="flex items-center gap-3 py-2">
                  <input type="checkbox" id="isPinned" checked={formData.isPinned} onChange={e => setFormData({...formData, isPinned: e.target.checked})} className="w-4 h-4 accent-zine-pink" />
                  <label htmlFor="isPinned" className="text-sm font-serif text-zine-blue">置顶此条目</label>
               </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Tag size={12}/> 标签
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags?.map(tag => (
                    <span key={tag} className="bg-zine-blue/5 px-2 py-1 text-xs text-zine-blue flex items-center gap-1 group">
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
                  className="w-full bg-transparent border-b border-gray-200 focus:border-zine-pink outline-none text-sm p-1"
                  placeholder="输入新标签并回车..."
                />

                {/* Tag Recommendations */}
                {allTags.length > 0 && (
                  <div className="pt-4 border-t border-gray-50">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest block mb-3">常用推荐</span>
                    <div className="flex flex-wrap gap-2">
                      {allTags.filter(t => !formData.tags?.includes(t)).slice(0, 10).map(tag => (
                        <button 
                          key={tag} 
                          onClick={() => addTag(tag)}
                          className="text-[10px] px-2 py-1 bg-gray-50 text-gray-400 hover:bg-zine-pink/10 hover:text-zine-pink border border-gray-100 rounded-sm transition-all"
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

        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-6">
          <button onClick={onClose} className="text-sm font-bold text-gray-400">取消</button>
          <Button onClick={handleSubmit}>保存条目</Button>
        </div>
      </div>
    </div>
  );
};