<script setup vapor lang="ts">
import { computed } from 'vue';
import { useRouter } from '../router';
import privacy from '../content/privacy.md?raw';
import terms from '../content/terms.md?raw';
import '../styles/legal.css';

const { currentPath } = useRouter();
const brandLogo = '/dlbr-logo.svg';
const isPrivacy = computed(() => currentPath.value === '/privacy');
const title = computed(() => isPrivacy.value ? 'Privacy Policy' : 'Terms of Service');
const source = computed(() => isPrivacy.value ? privacy : terms);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function renderMarkdown(markdown: string) {
  const lines = markdown.trim().split(/\r?\n/);
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`);
    list = [];
  };
  const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const next = lines[index + 1] ?? '';
    if (line.includes('|') && next.includes('|') && cells(next).every((cell) => /^:?-{3,}:?$/.test(cell))) {
      flushParagraph();
      flushList();
      const headers = cells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index]?.includes('|')) rows.push(cells(lines[index++] ?? ''));
      index -= 1;
      html.push(`<div class="legal-table-wrap" role="region" aria-label="Policy data table" tabindex="0"><table><thead><tr>${headers.map((cell) => `<th scope="col">${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((_, cellIndex) => `<td>${inlineMarkdown(row[cellIndex] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (/^#{1,3} /.test(line)) {
      flushParagraph();
      flushList();
      const level = line.match(/^#+/)?.[0].length ?? 2;
      const content = inlineMarkdown(line.replace(/^#{1,3} /, ''));
      if (level === 1 && html.length === 0) continue;
      html.push(`<h${level}>${content}</h${level}>`);
    } else if (line.startsWith('- ')) {
      flushParagraph();
      list.push(line.slice(2));
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return html.join('');
}

const renderedContent = computed(() => renderMarkdown(source.value));
</script>

<template>
  <main class="legal-shell">
    <header class="legal-header"><a class="legal-brand" href="/" aria-label="DLBR EID home"><img :src="brandLogo" width="42" height="26" alt="" aria-hidden="true"></a><a href="https://console.dlbr.app/">Log in ↗</a></header>
    <article class="legal-content">
      <p class="legal-eyebrow">DLBR / LEGAL</p>
      <h1>{{ title }}</h1>
      <div class="legal-markdown" v-html="renderedContent"></div>
      <nav class="legal-switch" aria-label="Legal pages"><a href="/privacy" :aria-current="isPrivacy ? 'page' : undefined">Privacy</a><a href="/terms" :aria-current="!isPrivacy ? 'page' : undefined">Terms</a></nav>
    </article>
    <footer class="legal-footer"><a href="/">DLBR EID</a><span>© 2026 DLBR</span></footer>
  </main>
</template>
