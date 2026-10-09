<script setup>
import { onMounted, ref } from 'vue';

const api = ref('checking...');

onMounted(async () => {
  try {
    const res = await fetch('/api/v1/health');
    api.value = res.ok ? 'connected' : `error ${res.status}`;
  } catch {
    api.value = 'unreachable';
  }
});
</script>

<template>
  <h1 class="page-title">Dashboard</h1>
  <div class="card">
    <p>KPIs will appear here.</p>
    <p>API status: <strong>{{ api }}</strong></p>
  </div>
</template>
