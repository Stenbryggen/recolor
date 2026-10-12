<script setup>
import { useUserStore } from '../stores/user.js';
import { formatDateTime } from '../vocabulary.js';

defineProps({ events: { type: Array, required: true } });

const userStore = useUserStore();
const actorName = (id) => userStore.users.find((user) => user.id === id)?.name ?? id;

const ACTION_LABEL = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  FILE_REPLACED: 'Replaced a photo',
  DELETED: 'Deleted',
  SENT: 'Sent to the partner',
  ACKNOWLEDGED: 'Confirmed receipt',
  RESULT_UPLOADED: 'Uploaded a result image',
  DELIVERED: 'Delivered',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
</script>

<template>
  <ul class="audit">
    <li v-for="(event, index) in events" :key="index">
      <span class="when">{{ formatDateTime(event.at) }}</span>
      <strong>{{ ACTION_LABEL[event.action] ?? event.action }}</strong>
      <span class="muted">by {{ actorName(event.actorId) }}</span>
      <span v-if="event.comment">“{{ event.comment }}”</span>
    </li>
  </ul>
</template>
