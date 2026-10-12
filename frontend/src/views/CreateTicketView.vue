<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { createTicket } from '../api/index.js';
import { buildTicketRequest, emptyForm, emptyVariant, needsReferenceImage, otherErrors } from '../ticketForm.js';
import { useReferenceStore } from '../stores/reference.js';
import { PRIORITY_LABEL, SLOT_LABEL } from '../vocabulary.js';

const router = useRouter();
const toast = useToast();
const referenceStore = useReferenceStore();

const form = reactive(emptyForm());
const errors = ref({});
const failure = ref(null);
const saving = ref(false);

const priorityOptions = Object.entries(PRIORITY_LABEL).map(([value, label]) => ({ value, label }));
const slots = computed(() => (needsReferenceImage(form) ? ['FRONT', 'BACK', 'STYLE', 'REFERENCE'] : ['FRONT', 'BACK', 'STYLE']));
const unplaced = computed(() => otherErrors(errors.value, form));

const addVariant = () => form.variants.push(emptyVariant());
const removeVariant = (index) => form.variants.splice(index, 1);

function chooseFile(slot, event) {
  form.files[slot] = event.target.files[0] ?? null;
}

async function save() {
  saving.value = true;
  errors.value = {};
  failure.value = null;
  try {
    const ticket = await createTicket(buildTicketRequest(form));
    toast.add({ severity: 'success', summary: 'Ticket created', detail: `Article ${ticket.articleNo}`, life: 3000 });
    router.push({ name: 'ticket', params: { id: ticket.id } });
  } catch (e) {
    if (e.status === 422) errors.value = e.errors;
    else failure.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <h1 class="page-title">New ticket</h1>

  <form class="stack" novalidate @submit.prevent="save">
    <Message v-if="failure" severity="error">{{ failure }}</Message>
    <Message v-if="Object.keys(errors).length" severity="error">
      The ticket could not be created. Please correct the fields marked below.
      <ul v-if="unplaced.length">
        <li v-for="[path, message] in unplaced" :key="path">{{ message }}</li>
      </ul>
    </Message>

    <section class="card stack">
      <h2>Ticket</h2>
      <div class="form-grid">
        <div class="field">
          <label for="articleNo">Article number</label>
          <InputText id="articleNo" v-model="form.articleNo" :invalid="!!errors.articleNo" />
          <span v-if="errors.articleNo" class="field-error">{{ errors.articleNo }}</span>
        </div>
        <div class="field">
          <label for="reference">Reference number</label>
          <InputText id="reference" v-model="form.reference" :invalid="!!errors.reference" />
          <span v-if="errors.reference" class="field-error">{{ errors.reference }}</span>
        </div>
        <div class="field">
          <label for="priority">Priority</label>
          <Select input-id="priority" v-model="form.priority" :options="priorityOptions" option-label="label" option-value="value" />
          <span v-if="errors.priority" class="field-error">{{ errors.priority }}</span>
        </div>
        <div class="field">
          <label for="partner">Partner</label>
          <Select
            input-id="partner"
            v-model="form.partnerId"
            :options="referenceStore.partners"
            option-label="name"
            option-value="id"
            placeholder="Choose a partner"
            :invalid="!!errors.partnerId"
          />
          <span v-if="errors.partnerId" class="field-error">{{ errors.partnerId }}</span>
        </div>
      </div>
      <div class="field">
        <label for="guideline">Guideline</label>
        <Textarea id="guideline" v-model="form.guidelineText" rows="6" auto-resize :invalid="!!errors.guidelineText" />
        <span v-if="errors.guidelineText" class="field-error">{{ errors.guidelineText }}</span>
      </div>
      <div class="row">
        <Checkbox v-model="form.singleClippingPath" input-id="clipping" binary />
        <label for="clipping">The images have a single clipping path</label>
      </div>
    </section>

    <section class="card stack">
      <h2>Variants</h2>
      <p class="muted">A variant is one requested version of the garment: a colour, and optionally an all-over print (AOP).</p>
      <div v-for="(variant, index) in form.variants" :key="index" class="variant">
        <div class="row">
          <strong>Variant {{ index + 1 }}</strong>
          <Button
            v-if="form.variants.length > 1"
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            :aria-label="`Remove variant ${index + 1}`"
            @click="removeVariant(index)"
          />
        </div>
        <div class="form-grid">
          <div class="field">
            <label :for="`colour-${index}`">Colour</label>
            <Select
              :input-id="`colour-${index}`"
              v-model="variant.colourId"
              :options="referenceStore.colours"
              option-label="pantoneName"
              option-value="id"
              placeholder="Choose a colour"
              :invalid="!!errors[`variants.${index}.operations.0.colourId`]"
            />
            <span v-if="errors[`variants.${index}.operations.0.colourId`]" class="field-error">
              {{ errors[`variants.${index}.operations.0.colourId`] }}
            </span>
          </div>
          <div class="field">
            <span class="label">All-over print</span>
            <div class="row">
              <Checkbox v-model="variant.aop" :input-id="`aop-${index}`" binary />
              <label :for="`aop-${index}`">AOP</label>
            </div>
          </div>
          <div v-if="variant.aop" class="field">
            <label :for="`pattern-${index}`">Pattern</label>
            <Select
              :input-id="`pattern-${index}`"
              v-model="variant.patternId"
              :options="referenceStore.patterns"
              option-label="name"
              option-value="id"
              placeholder="Choose a pattern"
              :invalid="!!errors[`variants.${index}.operations.1.patternId`]"
            />
            <span v-if="errors[`variants.${index}.operations.1.patternId`]" class="field-error">
              {{ errors[`variants.${index}.operations.1.patternId`] }}
            </span>
          </div>
        </div>
        <div class="field">
          <label :for="`notes-${index}`">Notes (optional)</label>
          <InputText :id="`notes-${index}`" v-model="variant.notes" placeholder="e.g. Night Sky, not black" />
        </div>
      </div>
      <span v-if="errors.variants" class="field-error">{{ errors.variants }}</span>
      <div><Button label="Add variant" icon="pi pi-plus" severity="secondary" @click="addVariant" /></div>
    </section>

    <section class="card stack">
      <h2>Photos</h2>
      <p class="muted">JPEG or PNG, at most 30 MB each. The photo ID is taken from the file name.</p>
      <div class="form-grid">
        <div v-for="slot in slots" :key="slot" class="field">
          <label :for="`file-${slot}`">{{ SLOT_LABEL[slot] }}</label>
          <input :id="`file-${slot}`" type="file" accept="image/jpeg,image/png" @change="chooseFile(slot, $event)" />
          <span v-if="errors[`files.${slot}`]" class="field-error">{{ errors[`files.${slot}`] }}</span>
        </div>
      </div>
    </section>

    <div class="row">
      <Button type="submit" label="Create ticket" icon="pi pi-check" :loading="saving" />
      <Button label="Cancel" severity="secondary" text @click="router.push({ name: 'queue' })" />
    </div>
  </form>
</template>
