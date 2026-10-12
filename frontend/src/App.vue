<script setup>
import Message from 'primevue/message';
import Toast from 'primevue/toast';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import UserPicker from './components/UserPicker.vue';
import { isAllowed, routes } from './router';
import { useReferenceStore } from './stores/reference.js';
import { useUserStore } from './stores/user.js';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const referenceStore = useReferenceStore();

const ready = ref(false);
const loadError = ref(null);

// The menu only shows the pages the acting user may open.
const links = computed(() =>
  routes.filter((r) => r.meta?.title && userStore.current && isAllowed(r, userStore.current)),
);

async function loadForUser() {
  try {
    await referenceStore.load(userStore.current);
    loadError.value = null;
  } catch (error) {
    loadError.value = error.message;
  }
  ready.value = true;
}

onMounted(async () => {
  try {
    await userStore.load();
    await loadForUser();
  } catch {
    loadError.value = 'The API could not be reached. Is the backend running?';
    ready.value = true;
  }
});

// Switching user reloads the lists, and leaves a page the new user may not open.
// `flush: 'sync'` hides the page at once, so it never loads data for the wrong user.
watch(
  () => userStore.current?.id,
  async (id, previous) => {
    if (!previous) return;
    ready.value = false;
    await loadForUser();
    if (!isAllowed(route, userStore.current)) router.push({ name: 'queue' });
  },
  { flush: 'sync' },
);
</script>

<template>
  <Toast position="bottom-right" />
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">Recolour Tickets</div>
      <nav class="nav">
        <RouterLink v-for="link in links" :key="link.name" :to="{ name: link.name }">
          <i :class="link.meta.icon" />
          <span>{{ link.meta.title }}</span>
        </RouterLink>
      </nav>
    </aside>
    <div class="main">
      <header class="topbar"><UserPicker /></header>
      <main class="content">
        <Message v-if="loadError" severity="error">{{ loadError }}</Message>
        <!-- The key makes every page load its data again when the acting user changes. -->
        <RouterView v-else-if="ready && userStore.current && isAllowed(route, userStore.current)" :key="userStore.current.id" />
      </main>
    </div>
  </div>
</template>
