import type { BlogPageData } from './blog-types';
import { blogImageUrl } from './blog-content';

export interface HeadMeta {
  name?: string;
  property?: string;
  content: string;
}

export interface HeadLink {
  rel: string;
  href: string;
}

export interface HeadHtmlAttrs {
  lang?: string;
}

export interface HeadConfig {
  title?: string;
  meta?: HeadMeta[];
  link?: HeadLink[];
  htmlAttrs?: HeadHtmlAttrs;
}

export function getRouteHead(path: string, blogData: BlogPageData | null = null): HeadConfig {
  if (path === '/blog' || path.startsWith('/blog/')) {
    const post = blogData?.path === path ? blogData.post : null;
    const preview = blogData?.path === path && Boolean(blogData.preview);
    const notFound = blogData?.path === path && blogData.status === 404;
    const title = post ? `${post.title} • DLBR Blog` : path === '/blog' ? 'DLBR Blog — Digital identity insights' : notFound ? 'Article not found — DLBR Blog' : 'DLBR Blog';
    const description = post?.excerpt || (path === '/blog'
      ? 'Insights on European Digital Identity, EUDI Wallets, and identity verification from DLBR.'
      : notFound ? 'This article may have moved or is no longer published.' : 'Insights and updates from DLBR.');
    const canonicalUrl = `https://dlbr.app${path}`;
    const featuredImage = post ? blogImageUrl(post.featuredImage) : null;
    const imageTitle = post?.title ?? title;
    const image = featuredImage
      ? featuredImage.startsWith('https:') ? featuredImage : `https://dlbr.app${featuredImage}`
      : (() => {
          const url = new URL('/og-image', 'https://dlbr.app');
          url.searchParams.set('brand', 'marketing');
          url.searchParams.set('v', '5');
          url.searchParams.set('title', imageTitle);
          url.searchParams.set('description', description);
          return url.toString();
        })();
    const publishedAt = post?.publishedAt && Number.isFinite(new Date(post.publishedAt).getTime())
      ? new Date(post.publishedAt).toISOString()
      : undefined;
    return {
      title,
      meta: [
        { name: 'description', content: description },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: image },
        { property: 'og:site_name', content: 'DLBR EID' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: post ? 'article' : 'website' },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:image', content: image },
        { property: 'og:image:alt', content: imageTitle },
        ...(!featuredImage ? [
          { property: 'og:image:type', content: 'image/png' },
          { property: 'og:image:width', content: '1200' },
          { property: 'og:image:height', content: '1200' },
        ] : []),
        ...(publishedAt ? [{ property: 'article:published_time', content: publishedAt }] : []),
        ...(notFound || blogData?.status === 503 || preview ? [{ name: 'robots', content: preview ? 'noindex, nofollow, noarchive' : 'noindex, follow' }] : []),
      ],
      link: [
        { rel: 'canonical', href: canonicalUrl },
        { rel: 'alternate', href: 'https://dlbr.app/blog/rss.xml' },
      ],
      htmlAttrs: { lang: 'en' },
    };
  }

  if (path === '/') {
    const title = 'EUDI Wallet Verification API for Relying Parties';
    const description = 'Connect OpenID4VP wallet presentations to your onboarding flow with the DLBR EID verification API and TypeScript SDK.';
    const image = new URL('/og-image', 'https://dlbr.app');
    image.searchParams.set('brand', 'marketing');
    image.searchParams.set('v', '5');
    image.searchParams.set('title', title);
    image.searchParams.set('description', description);
    return {
      title: `${title} | DLBR EID`,
      meta: [
        { name: 'description', content: description },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: image.toString() },
        { property: 'og:title', content: `${title} | DLBR EID` },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://dlbr.app/' },
        { property: 'og:image', content: image.toString() },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '1200' },
        { property: 'og:image:alt', content: title },
      ],
      link: [{ rel: 'canonical', href: 'https://dlbr.app/' }],
      htmlAttrs: { lang: 'en' },
    };
  }

  if (path === '/admin') {
    return {
      title: 'Admin Dashboard | DLBR ID',
      meta: [{ name: 'description', content: 'DLBR identity verification operations dashboard.' }],
      htmlAttrs: { lang: 'en' },
    };
  }

  if (path === '/setup') {
    return {
      title: 'Setup | DLBR POS',
      meta: [{ name: 'description', content: 'Configure the local fiscal helper.' }],
      htmlAttrs: { lang: 'en' },
    };
  }

  return {
    title: 'Admin Dashboard | DLBR ID',
    meta: [{ name: 'description', content: 'DLBR identity verification operations dashboard.' }],
    htmlAttrs: { lang: 'en' },
  };
}
