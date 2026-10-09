<script setup vapor lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from '../router';
import privacy from '../content/privacy.md?raw';
import terms from '../content/terms.md?raw';
import declaredSet from '../content/declared-set.md?raw';
import impressum from '../content/impressum.md?raw';
import privacy20261001 from '../content/policy-history/privacy/2026-10-01.md?raw';
import terms20261001 from '../content/policy-history/terms/2026-10-01.md?raw';
import terms20261008 from '../content/policy-history/terms/2026-10-08.md?raw';
import '../styles/legal.css';

const { currentPath } = useRouter();
const brandLogo = '/dlbr-logo.svg';
const isDeclaredSet = computed(() => currentPath.value === '/declared');
const isImpressum = computed(() => currentPath.value === '/impressum');
const isPrivacy = computed(() => currentPath.value === '/privacy');
const title = computed(() => isDeclaredSet.value
  ? 'A request outside the declared use never gets a QR code'
  : isImpressum.value ? 'Impressum'
  : isPrivacy.value ? 'PRIVACY POLICY' : 'TERMS OF SERVICE');
const source = computed(() => isDeclaredSet.value ? declaredSet : isImpressum.value ? impressum : isPrivacy.value ? privacy : terms);
const selectedRevision = ref('current');
watch(isPrivacy, () => { selectedRevision.value = 'current'; });

function publishedDate(markdown: string) {
  return markdown.match(/^\*\*Last updated:\*\*\s*(.+)$/m)?.[1]?.trim() ?? 'Undated';
}

function dateKey(date: string) {
  const parsed = new Date(`${date} UTC`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : '';
}

const history = computed(() => {
  const currentDate = publishedDate(source.value);
  const currentKey = dateKey(currentDate);
  const archived = isPrivacy.value
    ? [{ key: '2026-10-01', date: '1 October 2026', content: privacy20261001 }]
    : [
        { key: '2026-10-08', date: '8 October 2026', content: terms20261008 },
        { key: '2026-10-01', date: '1 October 2026', content: terms20261001 },
      ];
  return [
    { key: 'current', date: currentDate, label: `Current · ${currentDate}`, content: source.value },
    ...archived.filter((revision) => revision.key !== currentKey).map((revision) => ({
      key: revision.key,
      date: revision.date,
      label: revision.date,
      content: revision.content,
    })),
  ];
});

const selectedIndex = computed(() => Math.max(0, history.value.findIndex((revision) => revision.key === selectedRevision.value)));
const activeRevision = computed(() => history.value[selectedIndex.value]!);
const previousRevision = computed(() => history.value[selectedIndex.value + 1] ?? null);
const activeSource = computed(() => activeRevision.value.content);

function chooseRevision(event: Event) {
  selectedRevision.value = (event.target as HTMLSelectElement).value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

function inlineMarkdown(value: string) {
  return escapeHtml(value).split(/(`[^`]+`)/g).map((part) => {
    if (part.startsWith('`') && part.endsWith('`')) return `<code>${part.slice(1, -1)}</code>`;
    return part
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>');
  }).join('');
}

function renderMarkdown(markdown: string) {
  const lines = markdown.trim().split(/\r?\n/);
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let listType: 'ul' | 'ol' = 'ul';
  let codeBlock: string[] | null = null;
  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) html.push(`<${listType}>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`);
    list = [];
  };
  const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const next = lines[index + 1] ?? '';
    if (codeBlock !== null) {
      if (line.startsWith('```')) {
        html.push(`<pre><code>${escapeHtml(codeBlock.join('\n'))}</code></pre>`);
        codeBlock = null;
      } else {
        codeBlock.push(line);
      }
    } else if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      codeBlock = [];
    } else if (line.includes('|') && next.includes('|') && cells(next).every((cell) => /^:?-{3,}:?$/.test(cell))) {
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
    } else if (/^\d+\. /.test(line) || line.startsWith('- ')) {
      flushParagraph();
      const nextListType = /^\d+\. /.test(line) ? 'ol' : 'ul';
      if (list.length && nextListType !== listType) flushList();
      listType = nextListType;
      list.push(line.replace(/^(?:\d+\. |\- )/, ''));
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  if (codeBlock !== null) html.push(`<pre><code>${escapeHtml(codeBlock.join('\n'))}</code></pre>`);
  return html.join('');
}

const renderedContent = computed(() => renderMarkdown(activeSource.value));

interface DiffLine {
  type: 'context' | 'added' | 'removed' | 'gap';
  text: string;
}

function lineDiff(before: string, after: string): DiffLine[] {
  const oldLines = before.trimEnd().split(/\r?\n/);
  const newLines = after.trimEnd().split(/\r?\n/);
  const rows = Array.from({ length: oldLines.length + 1 }, () => new Uint32Array(newLines.length + 1));

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      rows[oldIndex]![newIndex] = oldLines[oldIndex] === newLines[newIndex]
        ? rows[oldIndex + 1]![newIndex + 1]! + 1
        : Math.max(rows[oldIndex + 1]![newIndex]!, rows[oldIndex]![newIndex + 1]!);
    }
  }

  const operations: DiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex < oldLines.length && newIndex < newLines.length && oldLines[oldIndex] === newLines[newIndex]) {
      operations.push({ type: 'context', text: oldLines[oldIndex]! });
      oldIndex += 1;
      newIndex += 1;
    } else if (oldIndex < oldLines.length && (newIndex >= newLines.length || rows[oldIndex + 1]![newIndex]! >= rows[oldIndex]![newIndex + 1]!)) {
      operations.push({ type: 'removed', text: oldLines[oldIndex]! });
      oldIndex += 1;
    } else {
      operations.push({ type: 'added', text: newLines[newIndex]! });
      newIndex += 1;
    }
  }

  const changedIndexes = operations.flatMap((line, index) => line.type === 'context' ? [] : [index]);
  if (!changedIndexes.length) return [];
  const included = new Set<number>();
  for (const index of changedIndexes) {
    for (let contextIndex = Math.max(0, index - 3); contextIndex <= Math.min(operations.length - 1, index + 3); contextIndex += 1) {
      included.add(contextIndex);
    }
  }

  const output: DiffLine[] = [];
  let previousIndex = -1;
  for (const index of [...included].sort((a, b) => a - b)) {
    if (previousIndex >= 0 && index > previousIndex + 1) {
      output.push({ type: 'gap', text: `… ${index - previousIndex - 1} unchanged lines …` });
    }
    output.push(operations[index]!);
    previousIndex = index;
  }
  return output;
}

const changes = computed(() => previousRevision.value ? lineDiff(previousRevision.value.content, activeSource.value) : []);
</script>

<template>
  <main class="legal-shell">
    <header class="legal-header"><a class="legal-brand" href="/" aria-label="DLBR EID home"><img :src="brandLogo" width="42" height="26" alt="" aria-hidden="true"></a><a href="https://console.dlbr.app/">Log in ↗</a></header>
    <article class="legal-content">
      <p class="legal-eyebrow">{{ isDeclaredSet ? 'DLBR / GATEWAY CONTROL' : 'DLBR / LEGAL' }}</p>
      <h1>{{ title }}</h1>
      <label v-if="!isDeclaredSet && !isImpressum" class="policy-version-control"><span>Policy history</span><select :value="selectedRevision" @change="chooseRevision"><option v-for="revision in history" :key="revision.key" :value="revision.key">{{ revision.label }}</option></select></label>
      <div class="legal-markdown" v-html="renderedContent"></div>
      <section v-if="!isDeclaredSet && !isImpressum" class="policy-changes" aria-labelledby="policy-changes-heading">
        <h2 id="policy-changes-heading">Revision changes</h2>
        <p v-if="previousRevision" class="policy-changes-intro">{{ title }} · {{ previousRevision.date }} → {{ activeRevision.date }}</p>
        <p v-else class="policy-no-changes">This is the earliest saved revision; there is no earlier version to compare.</p>
        <p v-if="previousRevision && !changes.length" class="policy-no-changes">No text changes from the previous revision.</p>
        <div v-if="changes.length" class="policy-diff" role="region" :aria-label="`${title} line-by-line changes`">
          <div v-for="(line, index) in changes" :key="index" class="policy-diff-line" :class="`policy-diff-line--${line.type}`">
            <span class="policy-diff-marker" aria-hidden="true">{{ line.type === 'added' ? '+' : line.type === 'removed' ? '−' : line.type === 'gap' ? '·' : ' ' }}</span>
            <code>{{ line.text }}</code>
          </div>
        </div>
      </section>
      <nav class="legal-switch" :aria-label="isDeclaredSet || isImpressum ? 'Page navigation' : 'Legal pages'"><a v-if="isDeclaredSet || isImpressum" href="/">Home</a><template v-else><a href="/privacy" :aria-current="isPrivacy ? 'page' : undefined">Privacy</a><a href="/terms" :aria-current="!isPrivacy ? 'page' : undefined">Terms</a></template></nav>
    </article>
    <footer class="legal-footer"><a href="/">DLBR EID</a><a href="/declared">Declared use</a><span>© 2026 DLBR</span></footer>
  </main>
</template>
