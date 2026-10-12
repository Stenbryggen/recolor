<script setup>
import Message from 'primevue/message';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { getKpis } from '../api/index.js';
import { STATUS_HINT, STATUS_LABEL, STATUSES } from '../vocabulary.js';

const kpis = ref(null);
const error = ref(null);

const COLOUR = {
  PENDING: '#94a3b8',
  SENT: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#6366f1',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
};

onMounted(async () => {
  try {
    kpis.value = await getKpis();
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <h1 class="page-title">Dashboard</h1>
  <Message v-if="error" severity="error">{{ error }}</Message>
  <div v-else-if="kpis" class="kpis">
    <RouterLink :to="{ name: 'queue' }" class="kpi" style="--kpi: #1f2430">
      <div class="number">{{ kpis.total }}</div>
      <div class="name">Tickets</div>
      <div class="hint">All statuses</div>
    </RouterLink>
    <RouterLink
      v-for="status in STATUSES"
      :key="status"
      :to="{ name: 'queue', query: { status } }"
      class="kpi"
      :style="{ '--kpi': COLOUR[status] }"
    >
      <div class="number">{{ kpis.byStatus[status] }}</div>
      <div class="name">{{ STATUS_LABEL[status] }}</div>
      <div class="hint">{{ STATUS_HINT[status] ?? ' ' }}</div>
    </RouterLink>
  </div>
</template>
