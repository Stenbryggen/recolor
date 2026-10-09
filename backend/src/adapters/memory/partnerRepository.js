// In-memory PartnerRepository, filled from the reference data.

export function createMemoryPartnerRepository(partners) {
  return {
    async list() {
      return structuredClone(partners);
    },

    async get(id) {
      const partner = partners.find((candidate) => candidate.id === id);
      return partner ? structuredClone(partner) : null;
    },
  };
}
