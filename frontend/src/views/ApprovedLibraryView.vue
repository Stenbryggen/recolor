<script setup>
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Paginator from 'primevue/paginator';
import Select from 'primevue/select';
import { RouterLink } from 'vue-router';
import { listApprovedPhotos } from '../api/index.js';
import AuthImage from '../components/AuthImage.vue';
import { useFilteredList } from '../composables/useFilteredList.js';
import { endOfDay, startOfDay } from '../dates.js';
import { describeOperations } from '../describe.js';
import { useReferenceStore } from '../stores/reference.js';
import { useUserStore } from '../stores/user.js';
import { formatDate, OPERATION_LABEL, SLOT_LABEL } from '../vocabulary.js';

const referenceStore = useReferenceStore();
const userStore = useUserStore();

const operationOptions = Object.entries(OPERATION_LABEL).map(([value, label]) => ({ value, label }));

const fields = { q: 'text', partnerId: 'text', operation: 'text', colourId: 'text', approvedFrom: 'date', approvedTo: 'date' };

const emptyFilters = () => ({ q: '', partnerId: null, operation: null, colourId: null, approvedFrom: null, approvedTo: null });

const toQuery = (filters) => ({
  q: filters.q.trim(),
  partnerId: filters.partnerId,
  operation: filters.operation,
  colourId: filters.colourId,
  approvedFrom: startOfDay(filters.approvedFrom),
  approvedTo: endOfDay(filters.approvedTo),
});

const { filters, paging, items: photos, total, loading, error, applyFilters, clearFilters, onPage } = useFilteredList({
  fields,
  emptyFilters,
  toQuery,
  fetchPage: listApprovedPhotos,
  paging: { pageSize: 12 },
});

const describe = (item) => describeOperations(item.operations, referenceStore);
</script>

<template>
  <h1 class="page-title">Approved Library</h1>

  <div class="card filters">
    <label>
      Search
      <InputText v-model="filters.q" placeholder="Article or reference number" @keyup.enter="applyFilters" />
    </label>
    <label v-if="userStore.role !== 'PARTNER'">
      Partner
      <Select v-model="filters.partnerId" :options="referenceStore.partners" option-label="name" option-value="id" placeholder="All" show-clear />
    </label>
    <label>
      Operation
      <Select v-model="filters.operation" :options="operationOptions" option-label="label" option-value="value" placeholder="All" show-clear />
    </label>
    <label>
      Colour
      <Select v-model="filters.colourId" :options="referenceStore.colours" option-label="pantoneName" option-value="id" placeholder="All" show-clear />
    </label>
    <label>
      Approved from
      <DatePicker v-model="filters.approvedFrom" date-format="dd/mm/yy" show-icon />
    </label>
    <label>
      Approved to
      <DatePicker v-model="filters.approvedTo" date-format="dd/mm/yy" show-icon />
    </label>
    <Button label="Filter" icon="pi pi-filter" @click="applyFilters" />
    <Button label="Clear" severity="secondary" text @click="clearFilters" />
  </div>

  <Message v-if="error" severity="error">{{ error }}</Message>
  <p v-else-if="!loading && photos.length === 0" class="card muted">
    Nothing is approved yet. Approved tickets show their result images here.
  </p>

  <div class="stack">
    <article v-for="item in photos" :key="`${item.ticketId}-${item.variantId}`" class="card stack">
      <div class="page-head">
        <h2>{{ describe(item) }}</h2>
        <RouterLink :to="{ name: 'ticket', params: { id: item.ticketId } }">
          Article {{ item.articleNo }} · reference {{ item.reference }}
        </RouterLink>
      </div>
      <div class="muted">
        <span v-if="referenceStore.partnerName(item.partnerId)">{{ referenceStore.partnerName(item.partnerId) }} · </span>
        approved {{ formatDate(item.approvedAt) }}<span v-if="item.notes"> · {{ item.notes }}</span>
      </div>
      <div class="photos">
        <div v-for="image in item.images" :key="image.id" class="photo">
          <AuthImage :url="image.url" :alt="`${describe(item)}, ${SLOT_LABEL[image.slot]}`" zoomable />
          <strong>{{ SLOT_LABEL[image.slot] }}</strong>
          <span class="caption">{{ image.photoId }}</span>
        </div>
      </div>
    </article>
  </div>

  <Paginator v-if="total > paging.pageSize" :rows="paging.pageSize" :total-records="total" :first="(paging.page - 1) * paging.pageSize" :rows-per-page-options="[12, 24, 48]" @page="onPage" />
</template>
