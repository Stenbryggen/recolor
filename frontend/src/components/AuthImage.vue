<script setup>
import Dialog from 'primevue/dialog';
import { onBeforeUnmount, ref, watch } from 'vue';
import { fetchFileUrl } from '../api/client.js';

// Shows a stored photo. The file is fetched with the X-User-Id header and shown from an object URL.
// With `zoomable`, a click opens the photo large.
const props = defineProps({
  url: { type: String, required: true },
  alt: { type: String, default: '' },
  zoomable: { type: Boolean, default: false },
});

const src = ref(null);
const failed = ref(false);
const zoomed = ref(false);

async function load() {
  release();
  failed.value = false;
  try {
    src.value = await fetchFileUrl(props.url);
  } catch {
    failed.value = true;
  }
}

function release() {
  if (src.value) URL.revokeObjectURL(src.value);
  src.value = null;
}

watch(() => props.url, load, { immediate: true });
onBeforeUnmount(release);
</script>

<template>
  <div class="auth-image">
    <img v-if="src" :src="src" :alt="alt" :class="{ zoomable }" @click="zoomable && (zoomed = true)" />
    <span v-else-if="failed" class="auth-image-missing">Could not load</span>
    <span v-else class="auth-image-missing">Loading…</span>
    <Dialog v-if="zoomable" v-model:visible="zoomed" modal :header="alt" :style="{ width: 'min(90vw, 900px)' }" dismissable-mask>
      <img v-if="src" :src="src" :alt="alt" class="auth-image-large" />
    </Dialog>
  </div>
</template>
