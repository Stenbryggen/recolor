<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listTickets } from '../api/index.js';
import PriorityTag from '../components/PriorityTag.vue';
import StatusTag from '../components/StatusTag.vue';
import { useReferenceStore } from '../stores/reference.js';
import { useUserStore } from '../stores/user.js';
import { formatDateTime, PRIORITY_LABEL, STATUS_LABEL } from '../vocabulary.js';

const route = useRoute();
const router = useRouter();
const referenceStore = useReferenceStore();
const userStore = useUserStore();

const statusOptions = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));
const priorityOptions = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }));

// The dashboard links here with ?status=...
const filters = reactive({
  statuses: route.query.status ? String(route.query.status).split(',') : [],
  priority: null,
  partnerId: null,
  q: '',
  createdFrom: null,
  createdTo: null,
});

const tickets = ref([]);
const total = ref(0);
const loading = ref(false);
const error = ref(null);
const paging = reactive({ page: 1, pageSize: 10, sort: 'createdAt', order: 'desc' });

// A date picker gives the start of a day; the end of the range is the end of that day.
const startOfDay = (date) => (date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString() : undefined);
const endOfDay = (date) =>
  date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString() : undefined;

async function load() {
  loading.value = true;
  try {
    const result = await listTickets({
      status: filters.statuses.join(','),
      priority: filters.priority,
      partnerId: filters.partnerId,
      q: filters.q.trim(),
      createdFrom: startOfDay(filters.createdFrom),
      createdTo: endOfDay(filters.createdTo),
      ...paging,
    });
    tickets.value = result.items;
    total.value = result.total;
    error.value = null;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  paging.page = 1;
  load();
}

function clearFilters() {
  Object.assign(filters, { statuses: [], priority: null, partnerId: null, q: '', createdFrom: null, createdTo: null });
  applyFilters();
}

function onPage(event) {
  paging.page = event.page + 1;
  paging.pageSize = event.rows;
  load();
}

function onSort(event) {
  paging.sort = event.sortField;
  paging.order = event.sortOrder === 1 ? 'asc' : 'desc';
  paging.page = 1;
  load();
}

const open = (event) => router.push({ name: 'ticket', params: { id: event.data.id } });

onMounted(load);
</script>

<template>
  <div class="page-head">
    <h1 class="page-title">Queue</h1>
    <Button v-if="userStore.role === 'OPERATOR'" label="New ticket" icon="pi pi-plus" @click="router.push({ name: 'ticket-new' })" />
  </div>

  <div class="card filters">
    <label>
      Search
      <InputText v-model="filters.q" placeholder="Article or reference number" @keyup.enter="applyFilters" />
    </label>
    <label>
      Status
      <MultiSelect v-model="filters.statuses" :options="statusOptions" option-label="label" option-value="value" placeholder="All" display="chip" />
    </label>
    <label>
      Priority
      <Select v-model="filters.priority" :options="priorityOptions" option-label="label" option-value="value" placeholder="All" show-clear />
    </label>
    <label v-if="userStore.role !== 'PARTNER'">
      Partner
      <Select v-model="filters.partnerId" :options="referenceStore.partners" option-label="name" option-value="id" placeholder="All" show-clear />
    </label>
    <label>
      Created from
      <DatePicker v-model="filters.createdFrom" date-format="dd/mm/yy" show-icon />
    </label>
    <label>
      Created to
      <DatePicker v-model="filters.createdTo" date-format="dd/mm/yy" show-icon />
    </label>
    <Button label="Filter" icon="pi pi-filter" @click="applyFilters" />
    <Button label="Clear" severity="secondary" text @click="clearFilters" />
  </div>

  <Message v-if="error" severity="error">{{ error }}</Message>
  <div class="card">
    <DataTable
      :value="tickets"
      lazy
      paginator
      :rows="paging.pageSize"
      :rows-per-page-options="[10, 25, 50]"
      :total-records="total"
      :loading="loading"
      :sort-field="paging.sort"
      :sort-order="paging.order === 'asc' ? 1 : -1"
      data-key="id"
      row-hover
      selection-mode="single"
      @page="onPage"
      @sort="onSort"
      @row-click="open"
    >
      <template #empty>No tickets match.</template>
      <Column field="articleNo" header="Article number" />
      <Column field="reference" header="Reference number" />
      <Column header="Partner" v-if="userStore.role !== 'PARTNER'">
        <template #body="{ data }">{{ referenceStore.partnerName(data.partnerId) ?? data.partnerId }}</template>
      </Column>
      <Column header="Variants">
        <template #body="{ data }">{{ data.variants.length }}</template>
      </Column>
      <Column field="priority" header="Priority" sortable>
        <template #body="{ data }"><PriorityTag :priority="data.priority" /></template>
      </Column>
      <Column field="status" header="Status" sortable>
        <template #body="{ data }"><StatusTag :status="data.status" /></template>
      </Column>
      <Column field="round" header="Round" />
      <Column field="createdAt" header="Created" sortable>
        <template #body="{ data }">{{ formatDateTime(data.createdAt) }}</template>
      </Column>
      <Column field="updatedAt" header="Updated" sortable>
        <template #body="{ data }">{{ formatDateTime(data.updatedAt) }}</template>
      </Column>
    </DataTable>
  </div>
</template>
