<script setup vapor lang="ts">
import type { RichNode } from '../blog-content';

defineProps<{ node: RichNode }>();
</script>

<template>
  <component :is="node.tag" :key="node.key" :href="node.href" :src="node.src" :alt="node.alt" :loading="node.tag === 'img' ? 'lazy' : undefined" :decoding="node.tag === 'img' ? 'async' : undefined">
    <template v-if="node.text !== undefined">{{ node.text }}</template>
    <PortableTextNode v-for="child in node.children ?? []" :key="child.key" :node="child" />
  </component>
</template>
