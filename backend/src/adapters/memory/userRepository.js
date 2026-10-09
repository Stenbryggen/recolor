// In-memory UserRepository, filled from the reference data.

export function createMemoryUserRepository(users) {
  return {
    async list() {
      return structuredClone(users);
    },

    async get(id) {
      const user = users.find((candidate) => candidate.id === id);
      return user ? structuredClone(user) : null;
    },
  };
}
