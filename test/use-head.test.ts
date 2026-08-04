// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { useHead } from '../src/use-head';

beforeEach(() => {
  document.head.innerHTML = '';
  document.documentElement.removeAttribute('lang');
  document.title = '';
});

describe('useHead', () => {
  it('adopts SSR tags and reconciles metadata during navigation', async () => {
    document.head.innerHTML = '<meta name="description" content="server" data-head><link rel="canonical" href="/register" data-head>';
    const setup = ref(false);
    const dispose = useHead(() => setup.value
      ? {
        title: 'Setup',
        meta: [{ name: 'description', content: 'Configure the fiscal helper.' }],
        htmlAttrs: { lang: 'en' },
      }
      : {
        title: 'Register',
        meta: [{ name: 'description', content: 'Run the register.' }],
        link: [{ rel: 'canonical', href: '/register' }],
      });

    expect(document.head.querySelectorAll('meta[data-head]')).toHaveLength(1);
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Run the register.');

    setup.value = true;
    await nextTick();

    expect(document.title).toBe('Setup');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Configure the fiscal helper.');
    expect(document.documentElement.getAttribute('lang')).toBe('en');

    dispose();
  });

  it('removes managed html attributes when disposed', () => {
    const dispose = useHead({ htmlAttrs: { lang: 'en' } });

    expect(document.documentElement.getAttribute('lang')).toBe('en');

    dispose();

    expect(document.documentElement.hasAttribute('lang')).toBe(false);
  });

  it('clears an html attribute when its value becomes undefined', async () => {
    const lang = ref<string | undefined>('en');
    const dispose = useHead(() => ({ htmlAttrs: { lang: lang.value } }));

    lang.value = undefined;
    await nextTick();

    expect(document.documentElement.hasAttribute('lang')).toBe(false);
    dispose();
  });

  it('keeps tags from separate useHead instances independent', () => {
    const disposeDescription = useHead({
      meta: [{ name: 'description', content: 'Register' }],
    });
    const disposeSocial = useHead({
      meta: [{ property: 'og:title', content: 'DLBR POS' }],
    });

    expect(document.querySelector('meta[name="description"]')).not.toBeNull();
    expect(document.querySelector('meta[property="og:title"]')).not.toBeNull();

    disposeDescription();
    expect(document.querySelector('meta[property="og:title"]')).not.toBeNull();

    disposeSocial();
  });
});