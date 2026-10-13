import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import { useFilteredList } from '../src/composables/useFilteredList.js';

const fields = { statuses: 'list', q: 'text' };

async function mountList(url) {
  const fetchPage = vi.fn().mockResolvedValue({ items: [], total: 0 });
  let list;
  const Page = defineComponent({
    setup() {
      list = useFilteredList({
        fields,
        emptyFilters: () => ({ statuses: [], q: '' }),
        toQuery: (filters) => ({ status: filters.statuses.join(','), q: filters.q }),
        fetchPage,
        paging: { pageSize: 10, sort: 'createdAt', order: 'desc' },
      });
      return () => h('div');
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/queue', name: 'queue', component: Page },
      { path: '/other', name: 'other', component: { render: () => h('p') } },
    ],
  });
  router.push(url);
  await router.isReady();
  const wrapper = mount({ render: () => h(RouterView) }, { global: { plugins: [router] } });
  await flushPromises();
  return { list, router, fetchPage, wrapper };
}

describe('useFilteredList: the view lives in the URL', () => {
  it('starts from the filters, the page and the sorting in the URL', async () => {
    const { list, fetchPage } = await mountList('/queue?statuses=SENT,COMPLETED&q=1537&page=2&order=asc');

    expect(list.filters.statuses).toEqual(['SENT', 'COMPLETED']);
    expect(fetchPage).toHaveBeenCalledWith({
      status: 'SENT,COMPLETED',
      q: '1537',
      page: 2,
      pageSize: 10,
      sort: 'createdAt',
      order: 'asc',
    });
  });

  it('writes a change of filter to the URL, from page 1', async () => {
    const { list, router } = await mountList('/queue?page=3');

    list.filters.statuses = ['REJECTED'];
    await list.applyFilters();
    await flushPromises();

    expect(router.currentRoute.value.query).toEqual({ statuses: 'REJECTED' });
  });

  it('writes the page and the sorting', async () => {
    const { list, router } = await mountList('/queue');

    await list.onPage({ page: 1, rows: 10 });
    await list.onSort({ sortField: 'status', sortOrder: 1 });
    await flushPromises();

    expect(router.currentRoute.value.query).toEqual({ sort: 'status', order: 'asc' });
  });

  it('follows a link to the same page with other filters', async () => {
    const { list, router, fetchPage } = await mountList('/queue');
    fetchPage.mockClear();

    await router.push('/queue?statuses=SENT');
    await flushPromises();

    expect(list.filters.statuses).toEqual(['SENT']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('clears the filters', async () => {
    const { list, router } = await mountList('/queue?q=abc');

    await list.clearFilters();
    await flushPromises();

    expect(router.currentRoute.value.query).toEqual({});
  });

  it('leaves the URL of the next page alone when the page is left', async () => {
    const { router, fetchPage } = await mountList('/queue?q=abc');
    fetchPage.mockClear();

    await router.push('/other');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/other');
    expect(router.currentRoute.value.query).toEqual({});
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
