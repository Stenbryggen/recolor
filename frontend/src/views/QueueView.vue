<script setup>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';
import { useRouter } from 'vue-router';
import { listTickets } from '../api/index.js';
import PriorityTag from '../components/PriorityTag.vue';
import StatusTag from '../components/StatusTag.vue';
import { useFilteredList } from '../composables/useFilteredList.js';
import { endOfDay, startOfDay } from '../dates.js';
import { useReferenceStore } from '../stores/reference.js';
import { useUserStore } from '../stores/user.js';
import { formatDateTime, PRIORITY_LABEL, STATUS_LABEL } from '../vocabulary.js';

const router = useRouter();
const referenceStore = useReferenceStore();
const userStore = useUserStore();

const statusOptions = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));
const priorityOptions = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }));

// How the filters are written in the URL, for example /queue?statuses=SENT,IN_PROGRESS&priority=HIGH
const fields = { statuses: 'list', priority: 'text', partnerId: 'text', q: 'text', createdFrom: 'date', createdTo: 'date' };

const emptyFilters = () => ({
  statuses: [],
  priority: null,
  partnerId: null,
  q: '',
  createdFrom: null,
  createdTo: null,
});

const toQuery = (filters) => ({
  status: filters.statuses.join(','),
  priority: filters.priority,
  partnerId: filters.partnerId,
  q: filters.q.trim(),
  createdFrom: startOfDay(filters.createdFrom),
  createdTo: endOfDay(filters.createdTo),
});

const { filters, paging, items: tickets, total, loading, error, applyFilters, clearFilters, onPage, onSort } = useFilteredList({
  fields,
  emptyFilters,
  toQuery,
  fetchPage: listTickets,
  paging: { pageSize: 10, sort: 'createdAt', order: 'desc' },
});

const open = (event) => router.push({ name: 'ticket', params: { id: event.data.id } });
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
      :first="(paging.page - 1) * paging.pageSize"
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
