import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { listUsers } from '../api/index.js';
import { setActingUser } from '../api/client.js';

const STORAGE_KEY = 'recolour.userId';

// Who is acting. There is no login: the user is chosen in the top bar and remembered in the browser.
export const useUserStore = defineStore('user', () => {
  const users = ref([]);
  const current = ref(null);

  const role = computed(() => current.value?.role ?? null);

  function select(id) {
    const user = users.value.find((candidate) => candidate.id === id);
    if (!user) return;
    current.value = user;
    setActingUser(user.id);
    try {
      localStorage.setItem(STORAGE_KEY, user.id);
    } catch {
      // storage can be blocked; the choice is then just not remembered
    }
  }

  async function load() {
    users.value = await listUsers();
    let remembered = null;
    try {
      remembered = localStorage.getItem(STORAGE_KEY);
    } catch {
      // see above
    }
    const first = users.value.find((user) => user.role === 'OPERATOR') ?? users.value[0];
    select(users.value.some((user) => user.id === remembered) ? remembered : first?.id);
  }

  return { users, current, role, load, select };
});
