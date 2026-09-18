<script setup vapor lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import '../styles/routes/admin.css';

interface Metrics {
  total_estimated: number;
  verified_estimated: number;
  failed_estimated: number;
  success_rate: number | null;
  latency_ms_p50: number | null;
  latency_ms_p95: number | null;
  processing_latency_ms_p50: number | null;
  processing_latency_ms_p95: number | null;
  by_credential_type: CredentialBreakdown[];
}

interface CredentialBreakdown {
  credentialTypes: string;
  estimatedCount: number;
  verifiedCount: number;
  failedCount: number;
  successRate: number | null;
  latencyMsP50: number | null;
  latencyMsP95: number | null;
}

const metrics = ref<Metrics | null>(null);
const error = ref(false);
const isLoading = ref(false);
const updatedAt = ref<Date | null>(null);
const environment = ref<'production' | 'staging'>('staging');
const totalSessions = computed(() => metrics.value == null ? '—' : formatNumber(metrics.value.total_estimated));
const verifiedSessions = computed(() => metrics.value == null ? '—' : formatNumber(metrics.value.verified_estimated));
const failedSessions = computed(() => metrics.value == null ? '—' : formatNumber(metrics.value.failed_estimated));
const successRate = computed(() => {
  const value = metrics.value?.success_rate;
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
});
const p50Latency = computed(() => formatLatency(metrics.value?.latency_ms_p50));
const p95Latency = computed(() => formatLatency(metrics.value?.latency_ms_p95));
const p50ProcessingLatency = computed(() => formatLatency(metrics.value?.processing_latency_ms_p50));
const p95ProcessingLatency = computed(() => formatLatency(metrics.value?.processing_latency_ms_p95));
const breakdown = computed(() => metrics.value?.by_credential_type ?? []);
const updatedLabel = computed(() => updatedAt.value ? `Updated ${updatedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not loaded');
const environmentLabel = computed(() => environment.value === 'staging' ? 'Staging' : 'Production');

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value));
}

function formatLatency(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value)} ms`;
}

async function loadMetrics() {
  metrics.value = null;
  error.value = false;
  isLoading.value = true;
  try {
    const response = await fetch(`/admin/api/metrics?environment=${environment.value}`);
    if (response.status === 401) {
      window.location.assign('/login');
      return;
    }
    if (!response.ok) throw new Error('Metrics unavailable');
    metrics.value = (await response.json()) as Metrics;
    updatedAt.value = new Date();
  } catch {
    error.value = true;
  } finally {
    isLoading.value = false;
  }
}

function selectEnvironment(next: 'production' | 'staging') {
  environment.value = next;
  void loadMetrics();
}

let refreshTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  void loadMetrics();
  refreshTimer = setInterval(() => void loadMetrics(), 60_000);
});
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <main class="admin-shell">
    <header class="admin-header">
      <div class="brand-lockup"><span class="brand-mark">ID</span><div><p class="eyebrow">DLBR / OPERATIONS</p><h1>Verification dashboard</h1><p class="subtitle">Identity verification health at a glance.</p></div></div>
      <div class="header-actions"><span class="user-badge"><span class="status-dot"></span> Admin</span><form method="get" action="/admin/logout"><button class="secondary-button" type="submit">Sign out</button></form></div>
    </header>
    <section class="toolbar" aria-label="Dashboard controls">
      <div class="environment-switcher" aria-label="Environment"><span class="switcher-label">Environment</span><button class="environment-button unavailable" type="button" disabled>Production <small>offline</small></button><button class="environment-button" :class="{ active: environment === 'staging' }" type="button" @click="selectEnvironment('staging')">Staging</button></div>
      <div class="toolbar-actions"><span class="updated-label" aria-live="polite">{{ updatedLabel }}</span><button class="refresh-button" type="button" :disabled="isLoading" @click="loadMetrics"><span :class="{ spinning: isLoading }">↻</span> Refresh</button></div>
    </section>
    <section class="hero-panel">
      <div><p class="eyebrow">{{ environmentLabel }} / Last 24 hours</p><h2>Verification activity</h2><p>Aggregated, privacy-preserving operational metrics.</p></div><span class="live-pill"><span class="status-dot"></span> Live</span>
    </section>
    <p v-if="error" class="error-banner" role="alert"><strong>Metrics unavailable.</strong> Check the Analytics Engine connection and try again.</p>
    <section v-else class="metrics-grid" :class="{ loading: isLoading }" aria-label="Verification metrics">
      <article class="metric-card metric-primary"><span class="metric-label">Total sessions</span><strong>{{ totalSessions }}</strong><span class="metric-note">All verification attempts</span></article>
      <article class="metric-card"><span class="metric-label">Verified</span><strong>{{ verifiedSessions }}</strong><span class="metric-note positive">Successful outcomes</span></article>
      <article class="metric-card"><span class="metric-label">Failed</span><strong>{{ failedSessions }}</strong><span class="metric-note">Needs attention</span></article>
      <article class="metric-card"><span class="metric-label">Success rate</span><strong>{{ successRate }}</strong><span class="metric-note">Across all credentials</span></article>
    </section>
    <section v-if="!error" class="lower-grid">
      <article class="panel-card latency-card"><div class="panel-heading"><div><p class="eyebrow">Performance</p><h2>Verification latency</h2><p class="panel-note">End-to-end includes wallet and network time. Processing is backend-only.</p></div></div><div class="latency-group"><h3>End-to-end completion</h3><div class="latency-values"><div><span>P50</span><strong>{{ p50Latency }}</strong><small>Typical session</small></div><div><span>P95</span><strong>{{ p95Latency }}</strong><small>Tail session</small></div></div></div><div class="latency-group"><h3>Backend processing</h3><div class="latency-values"><div><span>P50</span><strong>{{ p50ProcessingLatency }}</strong><small>Typical verification</small></div><div><span>P95</span><strong>{{ p95ProcessingLatency }}</strong><small>Tail verification</small></div></div></div></article>
      <article class="panel-card"><div class="panel-heading"><div><p class="eyebrow">Coverage</p><h2>Credential types</h2></div></div><div v-if="breakdown.length" class="credential-list"><div v-for="entry in breakdown" :key="entry.credentialTypes" class="credential-row"><div><strong>{{ entry.credentialTypes }}</strong><small>{{ formatNumber(entry.estimatedCount) }} sessions</small></div><span>{{ entry.successRate == null ? '—' : `${(entry.successRate * 100).toFixed(1)}%` }}</span></div></div><p v-else class="empty-state">No verification data in this window.</p></article>
    </section>
  </main>
</template>
