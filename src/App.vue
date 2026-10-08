<script setup vapor lang="ts">
import { useRouter } from './router';
import { getRouteHead } from './head';
import { useHead } from './use-head';
import { inject } from 'vue';
import { blogPageDataKey } from './blog-state';

const { currentComponent, currentPath } = useRouter();
const blogData = inject(blogPageDataKey, null);
useHead(() => getRouteHead(currentPath.value, blogData?.value ?? null));
</script>

<template>
  <Component v-if="currentComponent" :is="currentComponent" />
</template>
