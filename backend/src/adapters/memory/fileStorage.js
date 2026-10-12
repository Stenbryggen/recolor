// In-memory FileStorage. Used in tests and when no folder is given.

export function createMemoryFileStorage() {
  const files = new Map();

  return {
    async save(key, buffer) {
      files.set(key, Buffer.from(buffer));
    },

    async read(key) {
      const buffer = files.get(key);
      return buffer ? Buffer.from(buffer) : null;
    },

    async delete(key) {
      files.delete(key);
    },
  };
}
