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
  if (path === '/setup') {
    return {
      title: 'Setup | DLBR POS',
      meta: [{ name: 'description', content: 'Configure the local fiscal helper.' }],
      htmlAttrs: { lang: 'en' },
    };
  }

  return {
    title: 'Register | DLBR POS',
    meta: [{ name: 'description', content: 'DLBR point of sale register.' }],
    htmlAttrs: { lang: 'en' },
  };
}
