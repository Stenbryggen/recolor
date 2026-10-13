import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { filtersFromQuery, filtersToQuery, pagingFromQuery, pagingToQuery } from '../urlState.js';

// The shared logic of the pages that list things with filters and paging (Queue, Approved Library).
// The filters, the page and the sorting are kept in the URL, so a link gives the same view.
//
//   fields              how each filter is written in the URL (see urlState.js)
//   emptyFilters()      the filters with no value set
//   toQuery(filters)    the query for the API (a part of what the API accepts)
//   fetchPage(query)    calls the API and returns { items, total }
//   paging              the starting page size and, if the list is sortable, sort and order
export function useFilteredList({ fields, emptyFilters, toQuery, fetchPage, paging: startPaging }) {
  const route = useRoute();
  const router = useRouter();
  // While the page is left, the route already changes; the URL then belongs to the next page.
  const pageName = route.name;

  const defaults = { page: 1, ...startPaging };
  const filters = reactive(emptyFilters());
  const paging = reactive({ ...defaults });

  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);

  // What the URL says right now, and what the state says it should be.
  const readUrl = (query) => {
    Object.assign(filters, emptyFilters(), filtersFromQuery(fields, query));
    Object.assign(paging, defaults, pagingFromQuery(query));
  };
  const stateQuery = () => ({ ...filtersToQuery(fields, filters), ...pagingToQuery(paging, defaults) });
  const sameQuery = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

  async function load() {
    loading.value = true;
    if (route.name === pageName) router.replace({ query: stateQuery() });
    try {
      const result = await fetchPage({ ...toQuery(filters), ...paging });
      items.value = result.items;
      total.value = result.total;
      error.value = null;
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  function applyFilters() {
    paging.page = 1;
    return load();
  }

  function clearFilters() {
    Object.assign(filters, emptyFilters());
    return applyFilters();
  }

  // PrimeVue's page event has page (from 0) and rows.
  function onPage(event) {
    paging.page = event.page + 1;
    paging.pageSize = event.rows;
    return load();
  }

  function onSort(event) {
    paging.sort = event.sortField;
    paging.order = event.sortOrder === 1 ? 'asc' : 'desc';
    paging.page = 1;
    return load();
  }

  // A link to the same page with other filters (for example from the dashboard) changes the URL
  // without making a new page; the view then follows the URL.
  watch(
    () => route.query,
    (query) => {
      if (route.name !== pageName || sameQuery(query, stateQuery())) return;
      readUrl(query);
      load();
    },
  );

  readUrl(route.query);
  onMounted(load);

  return { filters, paging, items, total, loading, error, load, applyFilters, clearFilters, onPage, onSort };
}
