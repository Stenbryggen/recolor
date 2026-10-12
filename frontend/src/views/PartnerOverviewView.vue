<script setup>
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getPartner, listPartners } from '../api/index.js';
import StatusTag from '../components/StatusTag.vue';
import { formatDateTime } from '../vocabulary.js';

const router = useRouter();
const partners = ref([]);
const selected = ref(null);
const error = ref(null);

async function choose(id) {
  try {
    selected.value = await getPartner(id);
    error.value = null;
  } catch (e) {
    error.value = e.message;
  }
}

onMounted(async () => {
  try {
    partners.value = await listPartners();
    if (partners.value.length) await choose(partners.value[0].id);
  } catch (e) {
    error.value = e.message;
  }
});
</script>

<template>
  <h1 class="page-title">Partner Overview</h1>
  <Message v-if="error" severity="error">{{ error }}</Message>

  <div class="kpis">
    <button
      v-for="partner in partners"
      :key="partner.id"
      type="button"
      class="kpi partner-card"
      :class="{ selected: selected?.id === partner.id }"
      @click="choose(partner.id)"
    >
      <div class="name">{{ partner.name }}</div>
      <div class="number">{{ partner.total }}</div>
      <div class="hint">tickets</div>
      <div class="row partner-counts">
        <Tag v-if="partner.counts.SENT" severity="info" :value="`${partner.counts.SENT} awaiting receipt`" />
        <Tag v-if="partner.counts.IN_PROGRESS" severity="warn" :value="`${partner.counts.IN_PROGRESS} in progress`" />
        <Tag v-if="partner.counts.COMPLETED" severity="contrast" :value="`${partner.counts.COMPLETED} awaiting approval`" />
      </div>
    </button>
  </div>

  <div v-if="selected" class="card">
    <h2>{{ selected.name }}</h2>
    <DataTable :value="selected.tickets" data-key="id" row-hover selection-mode="single" @row-click="router.push({ name: 'ticket', params: { id: $event.data.id } })">
      <template #empty>This partner has no tickets.</template>
      <Column field="articleNo" header="Article number" />
      <Column field="reference" header="Reference number" />
      <Column header="Status">
        <template #body="{ data }"><StatusTag :status="data.status" /></template>
      </Column>
      <Column field="round" header="Round" />
      <Column header="Sent">
        <template #body="{ data }">{{ formatDateTime(data.sentAt) }}</template>
      </Column>
      <Column header="Receipt">
        <template #body="{ data }">
          <Tag v-if="data.status === 'SENT'" severity="info" value="Awaiting receipt" />
          <template v-else>{{ formatDateTime(data.receivedAt) }}</template>
        </template>
      </Column>
      <Column header="Completed">
        <template #body="{ data }">{{ formatDateTime(data.completedAt) }}</template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.partner-card { text-align: left; cursor: pointer; border: 0; font: inherit; --kpi: #94a3b8; }
.partner-card.selected { --kpi: #2f5fd0; outline: 2px solid #2f5fd0; }
.partner-counts { margin-top: .5rem; }
</style>
