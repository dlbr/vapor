export interface RichNode {
  key: string;
  tag: string;
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  children?: RichNode[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeLink(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const candidate = value.trim();
  if ((candidate.startsWith('/') && !candidate.startsWith('//')) || candidate.startsWith('#')) return candidate;
  try {
    const url = new URL(candidate);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function blogImageUrl(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const candidate = stringValue(value.src) || stringValue(value.url) || stringValue(value.previewUrl) || stringValue(value.href);
  const meta = isRecord(value.meta) ? value.meta : null;
  const storageKey = stringValue(value.storageKey) || stringValue(meta?.storageKey);
  if (storageKey) return `/blog/media/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate, 'https://cms.dlbr.app');
  } catch {
    return null;
  }
  if (url.origin === 'https://cms.dlbr.app' && url.pathname.startsWith('/_emdash/api/media/file/')) {
    return `/blog/media/${url.pathname.slice('/_emdash/api/media/file/'.length)}`;
  }
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return `${url.pathname}${url.search}`;
  return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
}

function nextKeyFactory() {
  let index = 0;
  return (prefix: string) => `${prefix}-${index++}`;
}

function spanNodes(block: Record<string, unknown>, nextKey: (prefix: string) => string): RichNode[] {
  if (!Array.isArray(block.children)) return [];
  const definitions = Array.isArray(block.markDefs) ? block.markDefs.filter(isRecord) : [];
  const nodes: RichNode[] = [];

  for (const child of block.children) {
    if (!isRecord(child) || child._type !== 'span') continue;
    let node: RichNode = { key: nextKey('span'), tag: 'span', text: stringValue(child.text) };
    const marks = Array.isArray(child.marks) ? child.marks.filter((mark): mark is string => typeof mark === 'string') : [];
    for (const mark of marks) {
      let tag: string | null = null;
      let href: string | null = null;
      if (mark === 'strong') tag = 'strong';
      else if (mark === 'em') tag = 'em';
      else if (mark === 'code') tag = 'code';
      else if (mark === 'underline') tag = 'u';
      else if (mark === 'strike-through' || mark === 'strikethrough') tag = 's';
      else {
        const definition = definitions.find((entry) => entry._key === mark && entry._type === 'link');
        href = safeLink(definition?.href);
        if (href) tag = 'a';
      }
      if (tag) node = { key: nextKey(tag), tag, ...(href ? { href } : {}), children: [node] };
    }
    nodes.push(node);
  }
  return nodes;
}

export function portableTextNodes(content: unknown[]): RichNode[] {
  const nextKey = nextKeyFactory();
  const nodes: RichNode[] = [];
  for (let index = 0; index < content.length; index += 1) {
    const raw = content[index];
    if (!isRecord(raw)) continue;

    if (raw._type === 'image') {
      const asset = isRecord(raw.asset) ? raw.asset : raw;
      const src = blogImageUrl(asset);
      if (!src) continue;
      nodes.push({ key: nextKey('image'), tag: 'figure', children: [{ key: nextKey('img'), tag: 'img', src, alt: stringValue(raw.alt) || stringValue(asset.alt) }] });
      continue;
    }

    if (raw._type === 'code') {
      const code = stringValue(raw.code);
      if (!code) continue;
      nodes.push({ key: nextKey('code'), tag: 'pre', children: [{ key: nextKey('code-content'), tag: 'code', text: code }] });
      continue;
    }

    if (raw._type !== 'block') continue;
    if (raw.listItem === 'bullet' || raw.listItem === 'number') {
      const listType = raw.listItem;
      const items: RichNode[] = [];
      while (index < content.length) {
        const item = content[index];
        if (!isRecord(item) || item._type !== 'block' || item.listItem !== listType) break;
        items.push({ key: nextKey('li'), tag: 'li', children: spanNodes(item, nextKey) });
        index += 1;
      }
      index -= 1;
      nodes.push({ key: nextKey('list'), tag: listType === 'number' ? 'ol' : 'ul', children: items });
      continue;
    }

    const children = spanNodes(raw, nextKey);
    if (!children.length) continue;
    const style = stringValue(raw.style);
    const tag = /^h[2-6]$/.test(style) ? style : style === 'blockquote' ? 'blockquote' : 'p';
    nodes.push({ key: nextKey('block'), tag, children: tag === 'blockquote' ? [{ key: nextKey('quote'), tag: 'p', children }] : children });
  }
  return nodes;
}

export function portableTextWords(content: unknown[]): string[] {
  return content.flatMap((block) => {
    if (!isRecord(block) || !Array.isArray(block.children)) return [];
    return block.children.flatMap((span) => isRecord(span) && typeof span.text === 'string' ? [span.text] : []);
  }).join(' ').trim().split(/\s+/).filter(Boolean);
}
