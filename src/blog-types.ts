export interface BlogTerm {
  slug: string;
  label: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: unknown[];
  featuredImage: unknown;
  publishedAt: string | null;
  updatedAt: string | null;
  byline: string | null;
  categories?: BlogTerm[];
  tags?: BlogTerm[];
}

export interface BlogPageData {
  path: string;
  status: 200 | 404 | 503;
  preview?: boolean;
  posts: BlogPost[];
  post: BlogPost | null;
}
