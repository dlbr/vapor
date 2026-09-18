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

export function getRouteHead(path: string): HeadConfig {
  if (path === '/' || path === '/admin') {
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
