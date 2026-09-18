<script setup vapor lang="ts">
import { computed, onMounted, ref } from 'vue';
import '../styles/routes/admin.css';

interface Metrics {
  total_estimated: number;
  verified_estimated: number;
  failed_estimated: number;
  success_rate: number | null;
}

const metrics = ref<Metrics | null>(null);
const error = ref(false);
const environment = ref<'production' | 'staging'>('staging');
const totalSessions = computed(() => metrics.value?.total_estimated ?? '—');
const verifiedSessions = computed(() => metrics.value?.verified_estimated ?? '—');
const failedSessions = computed(() => metrics.value?.failed_estimated ?? '—');
const successRate = computed(() => {
  const value = metrics.value?.success_rate;
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
});

async function loadMetrics() {
  metrics.value = null;
  error.value = false;
  try {
    const response = await fetch(`/admin/api/metrics?environment=${environment.value}`);
    if (response.status === 401) {
      window.location.assign('/auth/github');
      return;
    }
    if (!response.ok) throw new Error('Metrics unavailable');
    metrics.value = (await response.json()) as Metrics;
  } catch {
    error.value = true;
  }
}

function selectEnvironment(next: 'production' | 'staging') {
  environment.value = next;
  void loadMetrics();
}

onMounted(() => void loadMetrics());
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div>
        <p class="eyebrow">DLBR ID</p>
        <h1>Verification dashboard</h1>
        <p class="subtitle">Operational overview for the selected environment.</p>
      </div>
      <form method="get" action="/admin/logout">
        <button class="secondary-button" type="submit">Sign out</button>
      </form>
    </header>
    <section class="environment-switcher" aria-label="Environment">
      <span class="switcher-label">Environment</span>
      <button class="environment-button unavailable" type="button" disabled>Production <small>(not deployed)</small></button>
      <button class="environment-button" :class="{ active: environment === 'staging' }" type="button" @click="selectEnvironment('staging')">Staging</button>
    </section>
    <section class="metrics-panel">
      <div class="panel-heading"><div><p class="eyebrow">Last 24 hours</p><h2>Verification activity</h2></div></div>
      <p v-if="error" class="error" role="alert">Metrics are temporarily unavailable.</p>
      <div v-else class="metrics-grid">
        <article><span>Total sessions</span><strong>{{ totalSessions }}</strong></article>
        <article><span>Verified</span><strong>{{ verifiedSessions }}</strong></article>
        <article><span>Failed</span><strong>{{ failedSessions }}</strong></article>
        <article><span>Success rate</span><strong>{{ successRate }}</strong></article>
      </div>
    </section>
  </main>
</template>
