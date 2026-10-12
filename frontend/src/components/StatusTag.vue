<script setup>
import Tag from 'primevue/tag';
import { STATUS_LABEL } from '../vocabulary.js';

defineProps({ status: { type: String, required: true } });

const SEVERITY = {
  PENDING: 'secondary',
  SENT: 'info',
  IN_PROGRESS: 'warn',
  COMPLETED: 'contrast',
  APPROVED: 'success',
  REJECTED: 'danger',
};
</script>

<template>
  <Tag :value="STATUS_LABEL[status]" :severity="SEVERITY[status]" />
</template>
