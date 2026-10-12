<script setup>
import Select from 'primevue/select';
import { computed } from 'vue';
import { useUserStore } from '../stores/user.js';
import { ROLE_LABEL } from '../vocabulary.js';

const userStore = useUserStore();
const options = computed(() =>
  userStore.users.map((user) => ({ id: user.id, label: `${user.name} (${ROLE_LABEL[user.role]})` })),
);
</script>

<template>
  <label class="user-picker">
    <span>Acting as</span>
    <Select
      :model-value="userStore.current?.id"
      :options="options"
      option-label="label"
      option-value="id"
      aria-label="Acting user"
      @update:model-value="userStore.select"
    />
  </label>
</template>
