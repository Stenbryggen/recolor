<script setup>
import Tag from 'primevue/tag';
import { PRIORITY_LABEL } from '../vocabulary.js';

defineProps({ priority: { type: String, required: true } });

const SEVERITY = { LOW: 'secondary', NORMAL: 'info', HIGH: 'danger' };
</script>

<template>
  <Tag :value="PRIORITY_LABEL[priority]" :severity="SEVERITY[priority]" rounded />
</template>
