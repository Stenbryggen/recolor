<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router';

const router = useRouter();
const links = router.getRoutes().filter((r) => r.meta?.title);
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">Recolour Tickets</div>
      <nav class="nav">
        <RouterLink v-for="link in links" :key="link.name" :to="link.path">
          <i :class="link.meta.icon" />
          <span>{{ link.meta.title }}</span>
        </RouterLink>
      </nav>
    </aside>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>
