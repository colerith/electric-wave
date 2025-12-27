
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

export const DEFAULT_CATEGORIES = ['指南', '脚本', '设定', '资源'];

export const DEFAULT_SITE_CONFIG: SiteConfig = {
    siteName: '电波FM',
    avatarUrl: 'https://github.com/Colerith.png',
    startDate: '2025-12-27'
};

export const INITIAL_POSTS: Post[] = [
  {
    id: '1',
    title: 'ST 正则脚本大全',
    excerpt: '用于格式化 AI 输出的必备正则替换脚本。',
    content: '# ST 正则脚本大全\n\n本指南涵盖了清理 SillyTavern 中模型输出所需的基础正则脚本。\n\n## 去除前缀\n包括去除 "As an AI..." 前缀和格式修复。\n\n```regex\n/^(As an AI|I cannot).*?/\n```\n\n## 格式化\n确保你的文本显示正确。',
    tags: ['技术', '正则'],
    coverImage: 'https://picsum.photos/800/400?random=1',
    createdAt: Date.now(),
    author: 'Colerith',
    category: '脚本',
    isPinned: true
  },
  {
    id: '2',
    title: '角色卡设计指南',
    excerpt: '如何构建你的角色卡以获得最大的遵循度。',
    content: '# 角色卡设计\n\n创建一个强大的角色卡需要平衡个性特征、场景定义和对话示例。\n\n![示例图](https://picsum.photos/800/400?random=2)\n\n## P.L.A.C.E 方法\n这篇文章探讨了 **P.L.A.C.E** 方法。\n* P: Personality\n* L: Location\n* ...',
    tags: ['设计', '创意'],
    coverImage: 'https://picsum.photos/800/400?random=2',
    createdAt: Date.now() - 86400000,
    author: 'Colerith',
    category: '指南'
  },
  {
    id: '3',
    title: '世界书 (World Info) 设置',
    excerpt: '为你的角色扮演会话建立一致的设定集。',
    content: '# 世界书设置\n\n设定集 (World Info) 对于长期的连贯性至关重要。\n\n> 提示：了解如何有效地使用递归扫描和关键字激活。',
    tags: ['设定', '进阶'],
    coverImage: 'https://picsum.photos/800/400?random=3',
    createdAt: Date.now() - 172800000,
    author: 'Colerith',
    category: '设定'
  }
];

export const INITIAL_LINKS: FriendlyLink[] = [
  { id: '1', title: 'SillyTavern 文档', url: 'https://docs.sillytavern.app/' },
  { id: '2', title: 'RisuAI', url: 'https://github.com/kwaroran/RisuAI' },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
    { id: '1', content: '欢迎来到电波FM，这里是你的精神角落。', isActive: true },
    { id: '2', content: '请理性讨论，享受 Roleplay 的乐趣。', isActive: true }
];
