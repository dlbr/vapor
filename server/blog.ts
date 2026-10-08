import type { C } from './pico-types';
import type { BlogPageData, BlogPost, BlogTerm } from '../src/blog-types';

const CMS_ORIGIN = 'https://cms.dlbr.app';
const MEDIA_PATH = '/_emdash/api/media/file/';
const ARCHIVE_LIMIT = 10;
const API_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
const FEED_CACHE = 'public, max-age=0, s-maxage=300, stale-while-revalidate=600';

interface BlogCmsEnv {
  BLOG_CMS?: Fetcher;
  BLOG_CMS_TOKEN?: string;
}

class BlogCmsUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlogCmsUnavailable';
  }
}

class BlogPostNotFound extends Error {
  constructor() {
    super('Blog post was not found');
    this.name = 'BlogPostNotFound';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getCmsEnvironment(context: C): BlogCmsEnv {
  return (context.env ?? {}) as unknown as BlogCmsEnv;
}

async function getCmsJson(context: C, path: string, params: Record<string, string> = {}) {
  const env = getCmsEnvironment(context);
  if (!env.BLOG_CMS || !env.BLOG_CMS_TOKEN) throw new BlogCmsUnavailable('Missing CMS binding or read token');

  const url = new URL(path, CMS_ORIGIN);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  let response: Response;
  try {
    response = await env.BLOG_CMS.fetch(new Request(url, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${env.BLOG_CMS_TOKEN}`,
      },
    }));
  } catch (error) {
    console.error('Blog CMS request failed', { path, reason: error instanceof Error ? error.name : 'unknown' });
    throw new BlogCmsUnavailable('CMS request could not be completed');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (response.status === 404) throw new BlogPostNotFound();
    console.error('Blog CMS returned invalid JSON', { path, status: response.status });
    throw new BlogCmsUnavailable('CMS response was not valid JSON');
  }

  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : null;
    if (response.status === 404 || error?.code === 'NOT_FOUND') throw new BlogPostNotFound();
    console.error('Blog CMS returned an unsuccessful response', { path, status: response.status });
    throw new BlogCmsUnavailable('CMS returned an unsuccessful response');
  }

  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : null;
    if (error?.code === 'NOT_FOUND') throw new BlogPostNotFound();
    console.error('Blog CMS returned an unsuccessful response', { path, status: response.status });
    throw new BlogCmsUnavailable('CMS returned an unsuccessful response');
  }
  return body.data;
}

function normalizePost(value: unknown, includeContent: boolean, allowDraft = false): BlogPost | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;
  const slug = asString(value.slug);
  const title = asString(value.data.title).trim();
  if (!slug || !title || (value.status !== 'published' && !(allowDraft && value.status === 'draft'))) return null;

  const byline = isRecord(value.byline) ? asString(value.byline.displayName) : '';
  return {
    id: asString(value.id),
    slug,
    title,
    excerpt: asString(value.data.excerpt),
    content: includeContent && Array.isArray(value.data.content) ? value.data.content : [],
    featuredImage: value.data.featured_image,
    publishedAt: typeof value.publishedAt === 'string' ? value.publishedAt : null,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    byline: byline || null,
  };
}

function normalizeTerms(value: unknown): BlogTerm[] {
  if (!Array.isArray(value)) return [];
  const terms = new Map<string, BlogTerm>();
  for (const item of value) {
    if (!isRecord(item)) continue;
    const slug = asString(item.slug).trim();
    const label = asString(item.label).trim();
    if (slug && label) terms.set(slug, { slug, label });
  }
  return [...terms.values()];
}

async function postTerms(context: C, post: BlogPost, taxonomy: 'category' | 'tag') {
  try {
    const data = await getCmsJson(context, `/_emdash/api/content/posts/${encodeURIComponent(post.id || post.slug)}/terms/${taxonomy}`);
    return normalizeTerms(data.terms);
  } catch (error) {
    // Taxonomy availability must not hide an otherwise published article.
    console.error('Blog topics are unavailable', { taxonomy, reason: error instanceof Error ? error.name : 'unknown' });
    return [];
  }
}

async function withPostTopics(context: C, post: BlogPost): Promise<BlogPost> {
  const [categories, tags] = await Promise.all([postTerms(context, post, 'category'), postTerms(context, post, 'tag')]);
  return { ...post, categories, tags };
}

async function fetchPostsPage(context: C, limit: number, cursor?: string, includeContent = false) {
  const data = await getCmsJson(context, '/_emdash/api/content/posts', {
    limit: String(limit),
    orderBy: 'publishedAt',
    order: 'desc',
    status: 'published',
    ...(cursor ? { cursor } : {}),
  });
  if (!Array.isArray(data.items)) throw new BlogCmsUnavailable('CMS content list is malformed');
  return {
    posts: data.items.map((item) => normalizePost(item, includeContent)).filter((post): post is BlogPost => post !== null),
    cursor: typeof data.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null,
  };
}

export async function latestBlogPosts(context: C, limit = 20, includeContent = false): Promise<BlogPost[]> {
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const result = await fetchPostsPage(context, boundedLimit, undefined, includeContent);
  return result.posts;
}

async function allBlogPosts(context: C): Promise<BlogPost[]> {
  const posts: BlogPost[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 500; page += 1) {
    const result = await fetchPostsPage(context, 100, cursor);
    posts.push(...result.posts);
    if (!result.cursor) return posts;
    cursor = result.cursor;
  }
  throw new BlogCmsUnavailable('Sitemap exceeded its supported post count');
}

function detailSlug(path: string): string | null {
  if (!path.startsWith('/blog/')) return null;
  const encodedSlug = path.slice('/blog/'.length);
  let slug: string;
  try {
    slug = decodeURIComponent(encodedSlug);
  } catch {
    return null;
  }
  if (!slug || slug.includes('/') || slug.includes('\\') || slug.length > 200) return null;
  return slug;
}

async function blogPostBySlug(context: C, slug: string, previewToken?: string): Promise<BlogPost> {
  // EmDash resolves the content identifier as either the persisted id or its
  // slug, which avoids fetching every matching full-text result to find one.
  const isPreview = Boolean(previewToken);
  const data = await getCmsJson(
    context,
    isPreview ? `/api/blog/preview/${encodeURIComponent(slug)}` : `/_emdash/api/content/posts/${encodeURIComponent(slug)}`,
    previewToken ? { _preview: previewToken } : {},
  );
  const post = normalizePost(data.item, true, isPreview);
  if (!post) throw new BlogPostNotFound();
  return post;
}

export async function loadBlogPage(context: C, path: string, previewToken?: string): Promise<BlogPageData> {
  try {
    if (path === '/blog') {
      const result = await fetchPostsPage(context, ARCHIVE_LIMIT);
      return { path, status: 200, preview: false, posts: await Promise.all(result.posts.map((post) => withPostTopics(context, post))), post: null };
    }
    const slug = detailSlug(path);
    if (!slug) return { path, status: 404, preview: Boolean(previewToken), posts: [], post: null };
    const post = await blogPostBySlug(context, slug, previewToken);
    return { path, status: 200, preview: Boolean(previewToken), posts: [], post: await withPostTopics(context, post) };
  } catch (error) {
    if (error instanceof BlogPostNotFound) return { path, status: 404, preview: Boolean(previewToken), posts: [], post: null };
    console.error('Blog content is unavailable', { path, reason: error instanceof Error ? error.name : 'unknown' });
    return { path, status: 503, preview: Boolean(previewToken), posts: [], post: null };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] ?? character);
}

function publishedDate(post: BlogPost): Date | null {
  if (!post.publishedAt) return null;
  const date = new Date(post.publishedAt);
  return Number.isFinite(date.getTime()) ? date : null;
}

function plainText(content: unknown[]): string {
  return content.flatMap((block) => {
    if (!isRecord(block) || !Array.isArray(block.children)) return [];
    return block.children.flatMap((span) => isRecord(span) && typeof span.text === 'string' ? [span.text] : []);
  }).join(' ');
}

export async function blogApiRoute(context: C, path: string, headOnly: boolean, security: Record<string, string>): Promise<Response> {
  const requestUrl = new URL(context.req.url);
  const previewToken = requestUrl.searchParams.get('_preview') ?? undefined;
  const data = await loadBlogPage(
    context,
    path === '/api/blog' ? '/blog' : `/blog/${path.slice('/api/blog/'.length)}`,
    previewToken,
  );
  const payload = JSON.stringify(data);
  return new Response(headOnly ? null : payload, {
    status: data.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': previewToken ? 'no-store' : data.status === 200 ? API_CACHE : 'no-store',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      ...(headOnly ? { 'content-length': String(new TextEncoder().encode(payload).byteLength) } : {}),
      ...security,
    },
  });
}

export async function blogFeedRoute(context: C, headOnly: boolean, security: Record<string, string>): Promise<Response> {
  try {
    const posts = await latestBlogPosts(context, 20, true);
    const items = posts.map((post) => {
      const date = publishedDate(post);
      if (!date) return '';
      const url = `https://dlbr.app/blog/${encodeURIComponent(post.slug)}`;
      const description = post.excerpt || plainText(post.content).slice(0, 280);
      return `<item><title>${escapeXml(post.title)}</title><link>${escapeXml(url)}</link><guid isPermaLink="true">${escapeXml(url)}</guid><pubDate>${date.toUTCString()}</pubDate><description>${escapeXml(description)}</description></item>`;
    }).filter(Boolean).join('\n');
    const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>DLBR Blog</title><description>Insights and updates from DLBR.</description><link>https://dlbr.app/blog</link><atom:link href="https://dlbr.app/blog/rss.xml" rel="self" type="application/rss+xml"/><language>en</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}</channel></rss>`;
    return xmlResponse(feed, 200, headOnly, security, 'application/rss+xml; charset=utf-8', FEED_CACHE);
  } catch {
    return textUnavailable(headOnly, security);
  }
}

export async function blogSitemapRoute(context: C, headOnly: boolean, security: Record<string, string>): Promise<Response> {
  try {
    const posts = await allBlogPosts(context);
    const urls = [`https://dlbr.app/blog`, ...posts.map((post) => `https://dlbr.app/blog/${encodeURIComponent(post.slug)}`)];
    const items = [...new Set(urls)].map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join('\n');
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
    return xmlResponse(sitemap, 200, headOnly, security, 'application/xml; charset=utf-8', FEED_CACHE);
  } catch {
    return textUnavailable(headOnly, security);
  }
}

function xmlResponse(body: string, status: number, headOnly: boolean, security: Record<string, string>, contentType: string, cacheControl: string) {
  const payload = new TextEncoder().encode(body);
  return new Response(headOnly ? null : body, {
    status,
    headers: {
      'content-type': contentType,
      'cache-control': cacheControl,
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      ...(headOnly ? { 'content-length': String(payload.byteLength) } : {}),
      ...security,
    },
  });
}

function textUnavailable(headOnly: boolean, security: Record<string, string>) {
  return new Response(headOnly ? null : 'Blog content is temporarily unavailable.', {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...security },
  });
}

function isSafeStorageKey(key: string): boolean {
  if (!key || key.length > 512 || key.startsWith('/') || key.includes('\\') || /[\u0000-\u001f\u007f?#]/.test(key)) return false;
  return key.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

export async function blogMediaRoute(context: C, path: string, headOnly: boolean, security: Record<string, string>): Promise<Response> {
  let key: string;
  try {
    key = decodeURIComponent(path.slice('/blog/media/'.length));
  } catch {
    return new Response(null, { status: 404, headers: { 'cache-control': 'no-store', ...security } });
  }
  if (!isSafeStorageKey(key)) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store', ...security } });

  const env = getCmsEnvironment(context);
  if (!env.BLOG_CMS) return new Response(null, { status: 503, headers: { 'cache-control': 'no-store', ...security } });

  const upstreamPath = `${MEDIA_PATH}${key.split('/').map(encodeURIComponent).join('/')}`;
  let upstream: Response;
  try {
    upstream = await env.BLOG_CMS.fetch(new Request(new URL(upstreamPath, CMS_ORIGIN)));
  } catch {
    return new Response(null, { status: 503, headers: { 'cache-control': 'no-store', ...security } });
  }
  if (!upstream.ok) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store', ...security } });

  const contentType = upstream.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ?? '';
  const safeImageTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/x-icon']);
  if (!safeImageTypes.has(contentType)) return new Response(null, { status: 404, headers: { 'cache-control': 'no-store', ...security } });

  const headers = new Headers({
    'content-type': contentType,
    'cache-control': 'public, max-age=300, s-maxage=3600',
    'content-security-policy': "sandbox; default-src 'none'; img-src 'self'",
    'content-disposition': 'inline',
    'x-content-type-options': 'nosniff',
    ...security,
  });
  const etag = upstream.headers.get('etag');
  const length = upstream.headers.get('content-length');
  if (etag) headers.set('etag', etag);
  if (length) headers.set('content-length', length);
  return new Response(headOnly ? null : upstream.body, { headers });
}

export function loadBlogPageForRender(context: C, path: string, previewToken?: string) {
  return loadBlogPage(context, path, previewToken);
}

export function blogArchiveLimit() {
  return ARCHIVE_LIMIT;
}
