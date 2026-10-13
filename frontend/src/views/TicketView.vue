<script setup>
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import ConfirmDialog from 'primevue/confirmdialog';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as api from '../api/index.js';
import { fetchFileBlob } from '../api/client.js';
import AuditLog from '../components/AuditLog.vue';
import AuthImage from '../components/AuthImage.vue';
import PriorityTag from '../components/PriorityTag.vue';
import ResultsTable from '../components/ResultsTable.vue';
import StatusTag from '../components/StatusTag.vue';
import { describeMissingResults, describeOperations } from '../describe.js';
import { useReferenceStore } from '../stores/reference.js';
import { useUserStore } from '../stores/user.js';
import { availableActions } from '../ticketActions.js';
import { formatDateTime, RESULT_SLOTS, SLOT_LABEL } from '../vocabulary.js';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();
const userStore = useUserStore();
const referenceStore = useReferenceStore();

const ticket = ref(null);
const audit = ref([]);
const error = ref(null);
const busy = ref(false);

const actions = computed(() => (ticket.value ? availableActions(userStore.current, ticket.value) : []));
const earlierRounds = computed(() =>
  ticket.value ? [...new Set(ticket.value.results.map((r) => r.round))].filter((r) => r < ticket.value.round).sort((a, b) => b - a) : [],
);
const describe = (variant) => describeOperations(variant.operations, referenceStore);
const actorName = (id) => userStore.users.find((user) => user.id === id)?.name ?? id;

async function load() {
  try {
    [ticket.value, audit.value] = await Promise.all([api.getTicket(route.params.id), api.getAudit(route.params.id)]);
  } catch (e) {
    error.value = e.status === 404 ? 'This ticket does not exist, or you cannot see it.' : e.message;
  }
}

// The 422 of deliver lists the missing result images; other 422s have one message per field.
const explain = (errors) =>
  Object.keys(errors).every((path) => path.startsWith('results.'))
    ? describeMissingResults(errors, ticket.value)
    : Object.values(errors).join(' ');

// Runs an action, then shows the changed ticket and its new audit log.
async function run(action, success) {
  busy.value = true;
  try {
    ticket.value = await action();
    audit.value = await api.getAudit(ticket.value.id);
    if (success) toast.add({ severity: 'success', summary: success, life: 2500 });
    return true;
  } catch (e) {
    const detail = e.status === 422 ? explain(e.errors) : e.message;
    toast.add({ severity: 'error', summary: 'That did not work', detail, life: 6000 });
    return false;
  } finally {
    busy.value = false;
  }
}

const send = () => run(() => api.sendTicket(ticket.value.id), 'Sent to the partner');
const acknowledge = () => run(() => api.acknowledgeTicket(ticket.value.id), 'Receipt confirmed');
const deliver = () => run(() => api.deliverTicket(ticket.value.id), 'Delivered');
const uploadResult = (variantId, slot, file) =>
  run(() => api.uploadResultImage(ticket.value.id, variantId, slot, file), 'Result image uploaded');

function askDelete() {
  confirm.require({
    header: 'Delete this ticket?',
    message: `Ticket ${ticket.value.articleNo} and its photos will be deleted.`,
    icon: 'pi pi-exclamation-triangle',
    acceptProps: { label: 'Delete', severity: 'danger' },
    rejectProps: { label: 'Cancel', severity: 'secondary', text: true },
    accept: async () => {
      try {
        await api.deleteTicket(ticket.value.id);
        router.push({ name: 'queue' });
      } catch (e) {
        toast.add({ severity: 'error', summary: 'That did not work', detail: e.message, life: 6000 });
      }
    },
  });
}

// Approve: the manager checks the clipping path first.
const approving = ref(false);
const clippingChecked = ref(false);
async function approve() {
  if (await run(() => api.approveTicket(ticket.value.id), 'Approved')) approving.value = false;
}

const rejecting = ref(false);
const reason = ref('');
const reasonError = ref(null);
async function reject() {
  reasonError.value = null;
  try {
    ticket.value = await api.rejectTicket(ticket.value.id, reason.value);
    audit.value = await api.getAudit(ticket.value.id);
    rejecting.value = false;
    reason.value = '';
    toast.add({ severity: 'success', summary: 'Rejected', life: 2500 });
  } catch (e) {
    if (e.status === 422) reasonError.value = Object.values(e.errors).join(' ');
    else toast.add({ severity: 'error', summary: 'That did not work', detail: e.message, life: 6000 });
  }
}

// Demo shortcut for a partner: fills every empty place with the ticket's own photo of that view.
async function fillWithPlaceholders() {
  busy.value = true;
  try {
    for (const variant of ticket.value.variants) {
      for (const slot of RESULT_SLOTS) {
        const filled = ticket.value.results.some(
          (r) => r.variantId === variant.id && r.slot === slot && r.round === ticket.value.round,
        );
        if (filled) continue;
        const source = ticket.value.files.find((file) => file.slot === slot);
        const blob = await fetchFileBlob(source.url);
        const file = new File([blob], `${variant.id}-${slot.toLowerCase()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`, { type: blob.type });
        ticket.value = await api.uploadResultImage(ticket.value.id, variant.id, slot, file);
      }
    }
    audit.value = await api.getAudit(ticket.value.id);
  } catch (e) {
    toast.add({ severity: 'error', summary: 'That did not work', detail: e.message, life: 6000 });
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Message v-if="error" severity="error">{{ error }}</Message>
  <template v-else-if="ticket">
    <ConfirmDialog />

    <div class="page-head">
      <div class="row">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded aria-label="Back to the queue" @click="router.push({ name: 'queue' })" />
        <h1 class="page-title">Article {{ ticket.articleNo }}</h1>
        <StatusTag :status="ticket.status" />
        <PriorityTag :priority="ticket.priority" />
      </div>
      <div class="row">
        <Button v-if="actions.includes('send')" :label="ticket.status === 'REJECTED' ? 'Send again' : 'Send to partner'" icon="pi pi-send" :loading="busy" @click="send" />
        <Button v-if="actions.includes('delete')" label="Delete" icon="pi pi-trash" severity="danger" outlined @click="askDelete" />
        <Button v-if="actions.includes('acknowledge')" label="Confirm receipt" icon="pi pi-inbox" :loading="busy" @click="acknowledge" />
        <Button v-if="actions.includes('deliver')" label="Deliver" icon="pi pi-check" :loading="busy" @click="deliver" />
        <Button v-if="actions.includes('approve')" label="Approve" icon="pi pi-check-circle" severity="success" @click="approving = true; clippingChecked = false" />
        <Button v-if="actions.includes('reject')" label="Reject" icon="pi pi-times-circle" severity="danger" outlined @click="rejecting = true" />
      </div>
    </div>

    <Message v-if="ticket.rejectionReason && ticket.status !== 'APPROVED'" severity="warn">
      <strong>Rejected:</strong> {{ ticket.rejectionReason }}
    </Message>

    <div class="grid-2">
      <section class="card">
        <h2>Ticket</h2>
        <dl class="facts">
          <dt>Reference number</dt><dd>{{ ticket.reference }}</dd>
          <dt v-if="referenceStore.partnerName(ticket.partnerId)">Partner</dt>
          <dd v-if="referenceStore.partnerName(ticket.partnerId)">{{ referenceStore.partnerName(ticket.partnerId) }}</dd>
          <dt>Round</dt><dd>{{ ticket.round }}</dd>
          <dt>Created</dt><dd>{{ formatDateTime(ticket.createdAt) }} by {{ actorName(ticket.createdBy) }}</dd>
          <dt>Sent</dt><dd>{{ formatDateTime(ticket.sentAt) }}</dd>
          <dt>Receipt</dt><dd>{{ formatDateTime(ticket.receivedAt) }}</dd>
          <dt>Completed</dt><dd>{{ formatDateTime(ticket.completedAt) }}</dd>
          <dt v-if="ticket.approvedAt">Approved</dt>
          <dd v-if="ticket.approvedAt">{{ formatDateTime(ticket.approvedAt) }} by {{ actorName(ticket.approvedBy) }}</dd>
          <dt>Clipping path</dt><dd>{{ ticket.singleClippingPath ? 'A single clipping path' : 'Not specified' }}</dd>
        </dl>
      </section>
      <section class="card stack">
        <h2>Guideline</h2>
        <pre class="guideline">{{ ticket.guidelineText }}</pre>
      </section>
    </div>

    <section class="card">
      <h2>Photos</h2>
      <div class="photos">
        <div v-for="file in ticket.files" :key="file.id" class="photo">
          <AuthImage :url="file.url" :alt="`${SLOT_LABEL[file.slot]}: ${file.photoId}`" zoomable />
          <strong>{{ SLOT_LABEL[file.slot] }}</strong>
          <span class="caption">{{ file.photoId }}</span>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Variants</h2>
      <ol>
        <li v-for="variant in ticket.variants" :key="variant.id">
          {{ describe(variant) }}<span v-if="variant.notes" class="muted"> – {{ variant.notes }}</span>
        </li>
      </ol>
    </section>

    <section v-if="ticket.round > 0" class="card stack">
      <div class="page-head">
        <h2>Result images (round {{ ticket.round }})</h2>
        <Button
          v-if="actions.includes('uploadResults')"
          label="Fill with placeholder images (demo)"
          icon="pi pi-images"
          severity="secondary"
          size="small"
          :loading="busy"
          @click="fillWithPlaceholders"
        />
      </div>
      <p v-if="actions.includes('uploadResults')" class="muted">
        Upload a front, back and style image for every variant, then deliver the ticket.
      </p>
      <ResultsTable :ticket="ticket" :round="ticket.round" :editable="actions.includes('uploadResults')" @upload="uploadResult" />
    </section>

    <section v-for="round in earlierRounds" :key="round" class="card stack">
      <h2>Result images (round {{ round }})</h2>
      <ResultsTable :ticket="ticket" :round="round" />
    </section>

    <section class="card">
      <h2>Audit log</h2>
      <AuditLog :events="audit" />
    </section>

    <Dialog v-model:visible="approving" modal header="Approve this ticket" :style="{ width: '28rem' }">
      <div class="stack">
        <p>Check the results before you approve. The whole ticket is approved, not single variants.</p>
        <div v-if="ticket.singleClippingPath" class="row">
          <Checkbox v-model="clippingChecked" input-id="clipping-ok" binary />
          <label for="clipping-ok">Every image has the original, single clipping path</label>
        </div>
        <div class="row">
          <Button label="Approve" icon="pi pi-check-circle" severity="success" :disabled="ticket.singleClippingPath && !clippingChecked" :loading="busy" @click="approve" />
          <Button label="Cancel" severity="secondary" text @click="approving = false" />
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="rejecting" modal header="Reject this ticket" :style="{ width: '28rem' }">
      <div class="stack">
        <label for="reason">What must the partner correct?</label>
        <Textarea id="reason" v-model="reason" rows="4" :invalid="!!reasonError" />
        <span v-if="reasonError" class="field-error">{{ reasonError }}</span>
        <div class="row">
          <Button label="Reject" icon="pi pi-times-circle" severity="danger" @click="reject" />
          <Button label="Cancel" severity="secondary" text @click="rejecting = false" />
        </div>
      </div>
    </Dialog>
  </template>
</template>
