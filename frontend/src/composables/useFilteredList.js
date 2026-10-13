import { onMounted, reactive, ref } from 'vue';

// The shared logic of the pages that list things with filters and paging (Queue, Approved Library).
//
//   emptyFilters()      the filters with no value set
//   toQuery(filters)    the query for the API (a part of what the API accepts)
//   fetchPage(query)    calls the API and returns { items, total }
//   paging              the starting page, page size and, if the list is sortable, sort and order
export function useFilteredList({ emptyFilters, toQuery, fetchPage, paging: startPaging }) {
  const filters = reactive(emptyFilters());
  const paging = reactive({ page: 1, ...startPaging });

  const items = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref(null);

  async function load() {
    loading.value = true;
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

  onMounted(load);

  return { filters, paging, items, total, loading, error, load, applyFilters, clearFilters, onPage, onSort };
}
