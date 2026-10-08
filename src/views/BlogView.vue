<script setup vapor lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import type { BlogPageData, BlogPost, BlogTerm } from '../blog-types';
import { blogPageDataKey } from '../blog-state';
import { blogImageUrl, portableTextNodes, portableTextWords } from '../blog-content';
import { useRouter } from '../router';
import PortableTextNode from '../components/PortableTextNode.vue';
import '../styles/blog.css';

const router = useRouter();
const brandLogo = '/dlbr-logo.svg';
const providedData = inject(blogPageDataKey, null);
const initialData = providedData?.value?.path === router.currentPath.value ? providedData.value : null;
const pageData = shallowRef<BlogPageData | null>(initialData);
const loading = ref(!initialData);
const currentPath = router.currentPath;

const matchesPath = computed(() => pageData.value?.path === currentPath.value);
const activeData = computed(() => matchesPath.value ? pageData.value : null);
const isArchive = computed(() => currentPath.value === '/blog');
const isArticle = computed(() => currentPath.value.startsWith('/blog/') && currentPath.value !== '/blog/');
const bootstrapData = computed(() => pageData.value ? encodeURIComponent(JSON.stringify(pageData.value)) : '');

const selectedCategory = ref('');
const selectedTag = ref('');
const categories = computed(() => archiveTerms('categories'));
const tags = computed(() => archiveTerms('tags'));
const filteredPosts = computed(() => (activeData.value?.posts ?? []).filter((post) =>
  (!selectedCategory.value || post.categories?.some((term) => term.slug === selectedCategory.value))
  && (!selectedTag.value || post.tags?.some((term) => term.slug === selectedTag.value)),
));

function archiveTerms(kind: 'categories' | 'tags'): BlogTerm[] {
  const terms = new Map<string, BlogTerm>();
  for (const post of activeData.value?.posts ?? []) {
    for (const term of post[kind] ?? []) terms.set(term.slug, term);
  }
  return [...terms.values()].sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

function topicHref(kind: 'category' | 'tag', slug: string) {
  return `/blog#${new URLSearchParams({ [kind]: slug })}`;
}

function readTopicFilters() {
  const filters = new URLSearchParams(window.location.hash.slice(1));
  selectedCategory.value = filters.get('category') ?? '';
  selectedTag.value = filters.get('tag') ?? '';
}

function changeTag(event: Event) {
  const tag = (event.target as HTMLSelectElement).value;
  const filters = new URLSearchParams();
  if (selectedCategory.value) filters.set('category', selectedCategory.value);
  if (tag) filters.set('tag', tag);
  window.location.hash = filters.toString() || 'all';
}

function postPath(post: BlogPost) {
  return `/blog/${encodeURIComponent(post.slug)}`;
}

function imageSource(post: BlogPost) {
  return blogImageUrl(post.featuredImage);
}

function imageAlt(post: BlogPost) {
  const image = post.featuredImage;
  return image && typeof image === 'object' && 'alt' in image && typeof image.alt === 'string' ? image.alt : '';
}

function postDate(post: BlogPost) {
  if (!post.publishedAt) return null;
  const date = new Date(post.publishedAt);
  if (!Number.isFinite(date.getTime())) return null;
  return {
    machine: date.toISOString(),
    display: new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(date),
  };
}

function readingMinutes(post: BlogPost) {
  return Math.max(1, Math.ceil(portableTextWords(post.content).length / 220));
}

const articleNodes = computed(() => activeData.value?.post ? portableTextNodes(activeData.value.post.content) : []);

async function fetchPage(path: string, signal: AbortSignal) {
  const endpoint = new URL(path === '/blog' ? '/api/blog' : `/api/blog/${path.slice('/blog/'.length)}`, window.location.origin);
  const previewToken = new URLSearchParams(window.location.search).get('_preview');
  if (previewToken) endpoint.searchParams.set('_preview', previewToken);
  const response = await fetch(endpoint, { headers: { accept: 'application/json' }, signal });
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('path' in payload) || !('status' in payload)) {
    throw new Error('Invalid blog response');
  }
  return payload as BlogPageData;
}

watch(currentPath, (path, _previous, onCleanup) => {
  if (!path.startsWith('/blog')) return;
  if (pageData.value?.path === path) {
    loading.value = false;
    return;
  }

  const controller = new AbortController();
  onCleanup(() => controller.abort());
  loading.value = true;
  if (typeof window === 'undefined') return;

  void fetchPage(path, controller.signal).then((data) => {
    pageData.value = data;
    if (providedData) providedData.value = data;
    loading.value = false;
  }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    pageData.value = { path, status: 503, posts: [], post: null };
    loading.value = false;
  });
}, { immediate: true });

onMounted(() => {
  readTopicFilters();
  window.addEventListener('hashchange', readTopicFilters);
  if (currentPath.value.startsWith('/blog') && !matchesPath.value && providedData?.value?.path === currentPath.value) {
    pageData.value = providedData.value;
    loading.value = false;
  }
});
watch(currentPath, () => { if (typeof window !== 'undefined') readTopicFilters(); });

onUnmounted(() => window.removeEventListener('hashchange', readTopicFilters));
</script>

<template>
  <div class="blog-page">
    <div id="blog-page-data" class="blog-bootstrap" aria-hidden="true" :data-json="bootstrapData"></div>
    <main id="main" class="blog-shell">
      <header class="blog-site-header"><a class="blog-brand" href="/" aria-label="DLBR EID home"><img :src="brandLogo" width="42" height="26" alt="" aria-hidden="true"></a><a href="https://console.dlbr.app/">Log in ↗</a></header>
      <template v-if="isArchive">
        <section class="blog-intro">
          <p class="blog-eyebrow">DLBR / INSIGHTS</p>
          <h1>EUDI Wallet insights for your business.</h1>
          <p class="blog-intro-copy">Practical guidance on wallet acceptance, customer onboarding and age verification from the DLBR team.</p>
        </section>
        <div v-if="activeData?.status === 200 && (categories.length || tags.length)" class="blog-filters">
          <nav aria-label="Filter latest articles by category" class="blog-category-filters">
            <a href="/blog#all" :aria-current="!selectedCategory && !selectedTag ? 'true' : undefined">All articles</a>
            <a v-for="category in categories" :key="category.slug" :href="topicHref('category', category.slug)" :aria-current="selectedCategory === category.slug ? 'true' : undefined">{{ category.label }}</a>
          </nav>
          <label v-if="tags.length" class="blog-tag-filter">Topic
            <select :value="selectedTag" @change="changeTag"><option value="">All topics</option><option v-for="tag in tags" :key="tag.slug" :value="tag.slug">{{ tag.label }}</option></select>
          </label>
          <p v-if="selectedCategory || selectedTag" class="blog-filter-status" role="status">{{ filteredPosts.length }} {{ filteredPosts.length === 1 ? 'article' : 'articles' }} in the latest posts <a href="/blog#all">Clear filters</a></p>
        </div>
        <section v-if="activeData?.status === 200 && filteredPosts.length" class="blog-post-grid" aria-label="Latest articles">
          <article v-for="post in filteredPosts" :key="post.id || post.slug" class="blog-card">
            <a v-if="imageSource(post)" class="blog-card-image" :href="postPath(post)" tabindex="-1" aria-hidden="true"><img :src="imageSource(post) ?? ''" :alt="imageAlt(post)" loading="lazy" decoding="async"></a>
            <div class="blog-card-content">
              <div class="blog-meta"><time v-if="postDate(post)" :datetime="postDate(post)?.machine">{{ postDate(post)?.display }}</time><span v-if="postDate(post)" aria-hidden="true">·</span><span>{{ readingMinutes(post) }} min read</span></div>
              <nav v-if="post.categories?.length" class="blog-topics" aria-label="Article categories"><a v-for="category in post.categories" :key="category.slug" :href="topicHref('category', category.slug)">{{ category.label }}</a></nav>
              <h2><a :href="postPath(post)">{{ post.title }}</a></h2>
              <p v-if="post.excerpt" class="blog-card-excerpt">{{ post.excerpt }}</p>
              <nav v-if="post.tags?.length" class="blog-topics blog-tags" aria-label="Article tags"><a v-for="tag in post.tags" :key="tag.slug" :href="topicHref('tag', tag.slug)">{{ tag.label }}</a></nav>
              <a class="blog-card-link" :href="postPath(post)">Read article <span aria-hidden="true">→</span></a>
            </div>
          </article>
        </section>
        <section v-else-if="activeData?.status === 200 && activeData.posts.length" class="blog-empty"><h2>No articles match these filters.</h2><p>Try another topic or <a href="/blog#all">show all articles</a>.</p></section>
        <section v-else-if="activeData?.status === 200" class="blog-empty"><p class="blog-eyebrow">THE BLOG</p><h2>New articles are on the way.</h2><p>Check back soon for updates from DLBR.</p></section>
        <section v-else-if="loading" class="blog-empty" aria-live="polite"><p class="blog-eyebrow">DLBR / INSIGHTS</p><h2>Loading the latest articles…</h2></section>
        <section v-else class="blog-error" role="status"><p class="blog-eyebrow">TEMPORARILY UNAVAILABLE</p><h2>We could not load the blog.</h2><p>Please try again in a moment.</p><a href="/blog">Reload the blog</a></section>
      </template>

      <article v-else-if="isArticle && activeData?.status === 200 && activeData.post" class="blog-article">
        <p v-if="activeData.preview" class="blog-preview-notice" role="status">Draft preview · anyone with this expiring link can view this unpublished article.</p>
        <a class="blog-back-link" href="/blog">← All articles</a>
        <header class="blog-article-heading">
          <p class="blog-eyebrow">DLBR / INSIGHTS</p>
          <nav v-if="activeData.post.categories?.length" class="blog-topics" aria-label="Article categories"><a v-for="category in activeData.post.categories" :key="category.slug" :href="topicHref('category', category.slug)">{{ category.label }}</a></nav>
          <h1>{{ activeData.post.title }}</h1>
          <p v-if="activeData.post.excerpt" class="blog-article-excerpt">{{ activeData.post.excerpt }}</p>
          <div class="blog-meta blog-article-meta"><span v-if="activeData.post.byline">{{ activeData.post.byline }}</span><span v-if="activeData.post.byline && postDate(activeData.post)" aria-hidden="true">·</span><time v-if="postDate(activeData.post)" :datetime="postDate(activeData.post)?.machine">{{ postDate(activeData.post)?.display }}</time><span aria-hidden="true">·</span><span>{{ readingMinutes(activeData.post) }} min read</span></div>
        </header>
        <figure v-if="imageSource(activeData.post)" class="blog-article-hero"><img :src="imageSource(activeData.post) ?? ''" :alt="imageAlt(activeData.post)" fetchpriority="high"></figure>
        <div class="blog-article-content typeset"><PortableTextNode v-for="node in articleNodes" :key="node.key" :node="node" /></div>
        <footer class="blog-article-end"><nav v-if="activeData.post.tags?.length" class="blog-topics blog-tags" aria-label="Article tags"><a v-for="tag in activeData.post.tags" :key="tag.slug" :href="topicHref('tag', tag.slug)">{{ tag.label }}</a></nav><a href="/blog">Read more from DLBR <span aria-hidden="true">→</span></a></footer>
      </article>

      <section v-else-if="isArticle && loading" class="blog-empty" aria-live="polite"><p class="blog-eyebrow">DLBR / INSIGHTS</p><h1>Loading article…</h1></section>
      <section v-else-if="isArticle && activeData?.status === 404" class="blog-error"><p class="blog-eyebrow">404</p><h1>Article not found.</h1><p>This article may have moved or is no longer published.</p><a href="/blog">Browse the blog</a></section>
      <section v-else-if="isArticle" class="blog-error" role="status"><p class="blog-eyebrow">TEMPORARILY UNAVAILABLE</p><h1>We could not load this article.</h1><p>Please try again in a moment.</p><a :href="currentPath">Retry</a></section>
    </main>
  </div>
</template>
