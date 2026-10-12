import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/client.js';
import * as api from '../src/api/index.js';
import { useReferenceStore } from '../src/stores/reference.js';
import CreateTicketView from '../src/views/CreateTicketView.vue';

vi.mock('../src/api/index.js', () => ({ createTicket: vi.fn() }));
const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

// jsdom has no matchMedia or ResizeObserver, which PrimeVue asks for.
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useReferenceStore();
  store.partners = [{ id: 'partner-pixelworks', name: 'Pixelworks' }];
  store.colours = [{ id: 'granita', pantoneName: 'Granita' }];
  store.patterns = [{ id: 'block-libre', name: 'Block Libre' }];
  return mount(CreateTicketView, { global: { plugins: [pinia, PrimeVue, ToastService] } });
}

describe('CreateTicketView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with one variant and no reference image field', () => {
    const view = mountView();

    expect(view.findAll('.variant')).toHaveLength(1);
    expect(view.find('#file-REFERENCE').exists()).toBe(false);
  });

  it('asks for the reference image when a variant has AOP', async () => {
    const view = mountView();

    await view.find('#aop-0').setValue(true);

    expect(view.find('#file-REFERENCE').exists()).toBe(true);
    expect(view.find('#pattern-0').exists()).toBe(true);
  });

  it('adds and removes variants', async () => {
    const view = mountView();

    await view.findAll('button').find((b) => b.text() === 'Add variant').trigger('click');
    expect(view.findAll('.variant')).toHaveLength(2);

    await view.find('[aria-label="Remove variant 2"]').trigger('click');
    expect(view.findAll('.variant')).toHaveLength(1);
  });

  it('shows the errors of the API at the fields they belong to', async () => {
    api.createTicket.mockRejectedValue(
      new ApiError(422, 'Validation failed', {
        articleNo: 'An article number is required',
        'variants.0.operations.0.colourId': 'A colour is required for RECOLOUR',
        'files.FRONT': 'A FRONT file is required',
      }),
    );
    const view = mountView();

    await view.find('form').trigger('submit');
    await flushPromises();

    const messages = view.findAll('.field-error').map((e) => e.text());
    expect(messages).toEqual([
      'An article number is required',
      'A colour is required for RECOLOUR',
      'A FRONT file is required',
    ]);
    expect(push).not.toHaveBeenCalled();
  });

  it('opens the new ticket after it is created', async () => {
    api.createTicket.mockResolvedValue({ id: 'ticket-9', articleNo: '9' });
    const view = mountView();

    await view.find('form').trigger('submit');
    await flushPromises();

    expect(push).toHaveBeenCalledWith({ name: 'ticket', params: { id: 'ticket-9' } });
  });
});
