import type { InjectionKey, Ref } from 'vue';
import type { BlogPageData } from './blog-types';

export const blogPageDataKey: InjectionKey<Ref<BlogPageData | null>> = Symbol('blog-page-data');

export function readBlogPageDataFromDom(): BlogPageData | null {
  if (typeof document === 'undefined') return null;
  const element = document.getElementById('blog-page-data');
  const encoded = element?.getAttribute('data-json');
  if (!encoded) return null;

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(encoded));
    if (!parsed || typeof parsed !== 'object') return null;
    const data = parsed as Partial<BlogPageData>;
    if (typeof data.path !== 'string' || (data.status !== 200 && data.status !== 404 && data.status !== 503)) return null;
    if (!Array.isArray(data.posts) || (data.post !== null && typeof data.post !== 'object')) return null;
    return data as BlogPageData;
  } catch {
    return null;
  }
}
