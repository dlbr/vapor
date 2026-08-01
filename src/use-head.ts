import { getCurrentInstance, onBeforeUnmount, watchEffect } from 'vue';
import type { HeadConfig, HeadLink, HeadMeta } from './head';

export type HeadInput = HeadConfig | (() => HeadConfig);

/**
 * Marks the head elements this module manages.
 *
 * `renderHead` on the server stamps the same attribute, so on the first client
 * run the server's tags are adopted rather than duplicated — and, more to the
 * point, become removable. Anything without it (charset, viewport, the
 * stylesheet, third-party tags) is never touched.
 */
const OWNED = 'data-head';

function metaKey(meta: Pick<HeadMeta, 'name' | 'property'>) {
  return meta.name ? `meta:name:${meta.name}` : `meta:property:${meta.property ?? ''}`;
}

function linkKey(link: Pick<HeadLink, 'rel' | 'href'>) {
  return `link:${link.rel}:${link.href}`;
}

/** Keys an existing element the same way, by reading attributes rather than
 * building a selector — so no value is ever interpolated into a query. */
function elementKey(element: Element) {
  if (element.tagName === 'META') {
    return metaKey({
      name: element.getAttribute('name') ?? undefined,
      property: element.getAttribute('property') ?? undefined,
    });
  }
  return linkKey({
    rel: element.getAttribute('rel') ?? '',
    href: element.getAttribute('href') ?? '',
  });
}

export function useHead(input: HeadInput) {
  // Tracking lives in the closure rather than module scope: this file is
  // bundled into the Worker as well, where module-level mutable state is shared
  // across requests. It is only ever written in the browser, but keeping it
  // per-call means that cannot quietly change.
  const owned = new Map<string, Element>();
  const ownedHtmlAttrs = new Set<string>();
  let adoptedServerTags = false;

  function apply(config: HeadConfig) {
    if (typeof document === 'undefined') return;

    if (!adoptedServerTags) {
      adoptedServerTags = true;
      for (const element of document.head.querySelectorAll(`[${OWNED}]`)) {
        owned.set(elementKey(element), element);
      }
    }

    // `undefined` means "not managed by this route", which is different from an
    // empty string — that deliberately clears the title.
    if (config.title !== undefined) document.title = config.title;

    const declared = new Set<string>();

    for (const meta of config.meta ?? []) {
      const key = metaKey(meta);
      declared.add(key);

      let element = owned.get(key) as HTMLMetaElement | undefined;
      if (!element) {
        element = document.createElement('meta');
        if (meta.name) element.name = meta.name;
        if (meta.property) element.setAttribute('property', meta.property);
        element.setAttribute(OWNED, '');
        document.head.appendChild(element);
        owned.set(key, element);
      }
      element.content = meta.content;
    }

    for (const link of config.link ?? []) {
      const key = linkKey(link);
      declared.add(key);
      if (owned.has(key)) continue;

      const element = document.createElement('link');
      element.rel = link.rel;
      element.href = link.href;
      element.setAttribute(OWNED, '');
      document.head.appendChild(element);
      owned.set(key, element);
    }

    // The part that was missing: drop what this module added for a previous
    // route and the current one does not declare. Without it the head becomes
    // the union of every route visited, which is how a stale `rel=canonical`
    // or `og:title` ends up describing the wrong screen.
    for (const [key, element] of owned) {
      if (declared.has(key)) continue;
      element.remove();
      owned.delete(key);
    }

    const htmlAttrs = config.htmlAttrs ?? {};
    for (const attribute of ownedHtmlAttrs) {
      if (attribute in htmlAttrs) continue;
      document.documentElement.removeAttribute(attribute);
      ownedHtmlAttrs.delete(attribute);
    }
    for (const [name, value] of Object.entries(htmlAttrs)) {
      if (value === undefined) continue;
      document.documentElement.setAttribute(name, value);
      ownedHtmlAttrs.add(name);
    }
  }

  const stop = watchEffect(() => {
    apply(typeof input === 'function' ? input() : input);
  });

  function dispose() {
    stop();
    for (const element of owned.values()) element.remove();
    owned.clear();
  }

  // `useHead` is called from component setup today, but guarding keeps it
  // usable outside one without Vue warning about a missing instance.
  if (getCurrentInstance()) onBeforeUnmount(dispose);

  return dispose;
}
