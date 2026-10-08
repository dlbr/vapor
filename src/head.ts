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
