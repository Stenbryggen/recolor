import { defineStore } from 'pinia';
import { ref } from 'vue';
import { listColours, listPartners, listPatterns } from '../api/index.js';

// The lookup lists the pages need: colours, patterns and partners.
// Partner users may not list partners, so for them the list stays empty.
export const useReferenceStore = defineStore('reference', () => {
  const colours = ref([]);
  const patterns = ref([]);
  const partners = ref([]);

  async function load(user) {
    const [loadedColours, loadedPatterns] = await Promise.all([listColours(), listPatterns()]);
    colours.value = loadedColours;
    patterns.value = loadedPatterns;
    partners.value = user.role === 'PARTNER' ? [] : await listPartners();
  }

  const partnerName = (id) => partners.value.find((partner) => partner.id === id)?.name ?? null;

  return { colours, patterns, partners, load, partnerName };
});
