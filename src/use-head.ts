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
const elementOwners = new WeakMap<Element, object>();
const htmlAttributeOwners = new Map<string, object>();

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
  // Ownership lives per call. The module-level maps are written only when a
  // browser document exists, so they cannot carry server-request state between
  // reused Worker isolates.
  const owner = {};
  const owned = new Map<string, Element>();
  const ownedHtmlAttrs = new Set<string>();
  let adoptedServerTags = false;

  function apply(config: HeadConfig) {
    if (typeof document === 'undefined') return;

    if (!adoptedServerTags) {
      adoptedServerTags = true;
      for (const element of document.head.querySelectorAll(`[${OWNED}]`)) {
        if (elementOwners.has(element)) continue;
        const key = elementKey(element);
        if (owned.has(key)) {
          element.remove();
          continue;
        }
        elementOwners.set(element, owner);
        owned.set(key, element);
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
        elementOwners.set(element, owner);
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
      elementOwners.set(element, owner);
      owned.set(key, element);
    }

    // The part that was missing: drop what this module added for a previous
    // route and the current one does not declare. Without it the head becomes
    // the union of every route visited, which is how a stale `rel=canonical`
    // or `og:title` ends up describing the wrong screen.
    for (const [key, element] of owned) {
      if (declared.has(key)) continue;
      element.remove();
      elementOwners.delete(element);
      owned.delete(key);
    }

    const htmlAttrs = config.htmlAttrs ?? {};
    for (const attribute of ownedHtmlAttrs) {
      const value = htmlAttrs[attribute as keyof typeof htmlAttrs];
      if (value !== undefined) continue;
      if (htmlAttributeOwners.get(attribute) === owner) {
        document.documentElement.removeAttribute(attribute);
        htmlAttributeOwners.delete(attribute);
      }
      ownedHtmlAttrs.delete(attribute);
    }
    for (const [name, value] of Object.entries(htmlAttrs)) {
      if (value === undefined) continue;
      document.documentElement.setAttribute(name, value);
      ownedHtmlAttrs.add(name);
      htmlAttributeOwners.set(name, owner);
    }
  }

  const stop = watchEffect(() => {
    apply(typeof input === 'function' ? input() : input);
  });

  function dispose() {
    stop();
    for (const element of owned.values()) {
      element.remove();
      elementOwners.delete(element);
    }
    owned.clear();
    for (const attribute of ownedHtmlAttrs) {
      if (htmlAttributeOwners.get(attribute) !== owner) continue;
      document.documentElement.removeAttribute(attribute);
      htmlAttributeOwners.delete(attribute);
    }
    ownedHtmlAttrs.clear();
  }

  // `useHead` is called from component setup today, but guarding keeps it
  // usable outside one without Vue warning about a missing instance.
  if (getCurrentInstance()) onBeforeUnmount(dispose);

  return dispose;
}
