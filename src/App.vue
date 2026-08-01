<script setup vapor lang="ts">
import { useRouter } from './router';
import { getRouteHead } from './head';
import { useHead } from './use-head';

const { currentComponent, currentPath } = useRouter();
useHead(() => getRouteHead(currentPath.value));
</script>

<template>
  <Component v-if="currentComponent" :is="currentComponent" />
</template>