// In-memory CatalogRepository: the colour and pattern lists.

export function createMemoryCatalogRepository({ colours, patterns }) {
  const lists = { colour: colours, pattern: patterns };

  return {
    async list(kind) {
      return structuredClone(lists[kind] ?? []);
    },

    async exists(kind, id) {
      return (lists[kind] ?? []).some((item) => item.id === id);
    },
  };
}
