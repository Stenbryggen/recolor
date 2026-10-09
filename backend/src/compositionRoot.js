import { systemClock } from './adapters/clock.js';
import { createMemoryAuditLog } from './adapters/memory/auditLog.js';
import { createMemoryCatalogRepository } from './adapters/memory/catalogRepository.js';
import { createMemoryPartnerRepository } from './adapters/memory/partnerRepository.js';
import { createMemoryTicketRepository } from './adapters/memory/ticketRepository.js';
import { createMemoryUserRepository } from './adapters/memory/userRepository.js';
import { makeCreateTicket } from './application/createTicket.js';
import { makeGetTicket } from './application/getTicket.js';
import { makeListTickets } from './application/listTickets.js';
import { referenceData as defaultReferenceData } from './seed/referenceData.js';

// The composition root: the one place that decides which adapter fills which port.
// Everything else only knows the ports. To use a database, change the lines below.
export function createContainer({ clock = systemClock, referenceData = defaultReferenceData } = {}) {
  const tickets = createMemoryTicketRepository();
  const users = createMemoryUserRepository(referenceData.users);
  const partners = createMemoryPartnerRepository(referenceData.partners);
  const catalog = createMemoryCatalogRepository(referenceData);
  const audit = createMemoryAuditLog();

  return {
    repositories: { tickets, users, partners, catalog, audit },
    useCases: {
      createTicket: makeCreateTicket({ tickets, partners, catalog, audit, clock }),
      getTicket: makeGetTicket({ tickets }),
      listTickets: makeListTickets({ tickets }),
    },
  };
}
