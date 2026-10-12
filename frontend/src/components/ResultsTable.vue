<script setup>
import AuthImage from './AuthImage.vue';
import { describeOperation } from '../describe.js';
import { useReferenceStore } from '../stores/reference.js';
import { RESULT_SLOTS, SLOT_LABEL } from '../vocabulary.js';

// The partner's result images of one round: a row per variant, a column per view.
// With `editable` a partner can upload a file into each place.
const props = defineProps({
  ticket: { type: Object, required: true },
  round: { type: Number, required: true },
  editable: { type: Boolean, default: false },
});
const emit = defineEmits(['upload']);

const referenceStore = useReferenceStore();

const resultFor = (variantId, slot) =>
  props.ticket.results.find((r) => r.variantId === variantId && r.slot === slot && r.round === props.round);

const describe = (variant) => variant.operations.map((operation) => describeOperation(operation, referenceStore)).join(' + ');

function chosen(variantId, slot, event) {
  const file = event.target.files[0];
  if (file) emit('upload', variantId, slot, file);
  event.target.value = '';
}
</script>

<template>
  <table class="results-table">
    <thead>
      <tr>
        <th>Variant</th>
        <th v-for="slot in RESULT_SLOTS" :key="slot">{{ SLOT_LABEL[slot] }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(variant, index) in ticket.variants" :key="variant.id">
        <td>
          <strong>{{ index + 1 }}. {{ describe(variant) }}</strong>
          <div v-if="variant.notes" class="muted">{{ variant.notes }}</div>
        </td>
        <td v-for="slot in RESULT_SLOTS" :key="slot">
          <div class="photo">
            <AuthImage
              v-if="resultFor(variant.id, slot)"
              :url="resultFor(variant.id, slot).url"
              :alt="`${describe(variant)}, ${SLOT_LABEL[slot]}`"
              zoomable
            />
            <span v-else class="muted">No image</span>
            <input
              v-if="editable"
              type="file"
              accept="image/jpeg,image/png"
              :aria-label="`Result image: variant ${index + 1}, ${SLOT_LABEL[slot]}`"
              @change="chosen(variant.id, slot, $event)"
            />
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
