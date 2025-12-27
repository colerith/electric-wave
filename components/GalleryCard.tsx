import React from 'react';
import { Post } from '../types';
import { FileText, Edit2, Trash2, Pin } from 'lucide-react';

interface GalleryCardProps {
  post: Post;
  isAdmin: boolean;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({ 
  post, 
  isAdmin, 
  onClick, 
  onEdit, 
  onDelete 
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        group relative flex flex-col bg-white transition-all duration-500 cursor-pointer h-full
        ${post.isPinned ? 'shadow-soft ring-1 ring-zine-pink/50' : 'hover:shadow-soft'}
      `}
    >
      {/* Pinned Indicator - Elegant Tag */}
      {post.isPinned && (
        <div className="absolute top-0 left-0 z-20 bg-zine-pink text-white px-3 py-1 text-xs font-serif italic">
            Featured
        </div>
      )}

      {/* Cover Image Area - 3:2 Aspect Ratio often used in photography */}
      <div className="aspect-[3/2] w-full overflow-hidden bg-zine-gray relative">
        <div className="absolute inset-0 bg-zine-blue/10 mix-blend-multiply transition-opacity opacity-0 group-hover:opacity-100 z-10"></div>
        {post.coverImage ? (
          <img 
            src={post.coverImage} 
            alt={post.title} 
            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zine-blue/20">
            <FileText size={48} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col gap-4 border border-t-0 border-transparent group-hover:border-zine-gray/30 transition-colors">
        <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zine-blue/50 font-sans font-bold">
                {post.category}
            </span>
            <span className="text-[10px] font-serif italic text-zine-blue/40">
                {new Date(post.createdAt).toLocaleDateString()}
            </span>
        </div>

        <h3 className="text-xl font-serif font-bold leading-tight text-zine-blue group-hover:text-zine-pink transition-colors line-clamp-2">
          {post.title}
        </h3>
        
        <p className="text-sm text-gray-500 font-serif leading-relaxed line-clamp-3 flex-1">
          {post.excerpt}
        </p>
        
        <div className="pt-4 mt-auto flex items-center justify-between border-t border-gray-100">
             <div className="flex gap-2">
                {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] text-gray-400 font-sans uppercase">
                    #{tag}
                    </span>
                ))}
            </div>

            {isAdmin && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={onEdit} className="text-gray-400 hover:text-zine-blue"><Edit2 size={14} /></button>
                    <button onClick={onDelete} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};