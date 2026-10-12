import { systemClock } from './adapters/clock.js';
import { createMemoryAuditLog } from './adapters/memory/auditLog.js';
import { createMemoryCatalogRepository } from './adapters/memory/catalogRepository.js';
import { createMemoryFileStorage } from './adapters/memory/fileStorage.js';
import { createMemoryPartnerRepository } from './adapters/memory/partnerRepository.js';
import { createMemoryTicketRepository } from './adapters/memory/ticketRepository.js';
import { createMemoryUserRepository } from './adapters/memory/userRepository.js';
import { makeCreateTicket } from './application/createTicket.js';
import { makeDeleteTicket } from './application/deleteTicket.js';
import { makeGetFile } from './application/getFile.js';
import { makeGetTicket } from './application/getTicket.js';
import { makeListAudit } from './application/listAudit.js';
import { makeListTickets } from './application/listTickets.js';
import { makeIdentifyUser, makeListColours, makeListPatterns, makeListUsers } from './application/reference.js';
import { makeReplaceTicketFile } from './application/replaceTicketFile.js';
import { makeUpdateTicket } from './application/updateTicket.js';
import { referenceData as defaultReferenceData } from './seed/referenceData.js';

// The composition root: the one place that decides which adapter fills which port.
// Everything else only knows the ports. To use a database, change the lines below.
export function createContainer({
  clock = systemClock,
  referenceData = defaultReferenceData,
  fileStorage = createMemoryFileStorage(),
} = {}) {
  const tickets = createMemoryTicketRepository();
  const users = createMemoryUserRepository(referenceData.users);
  const partners = createMemoryPartnerRepository(referenceData.partners);
  const catalog = createMemoryCatalogRepository(referenceData);
  const audit = createMemoryAuditLog();

  return {
    repositories: { tickets, users, partners, catalog, audit },
    useCases: {
      identifyUser: makeIdentifyUser({ users }),
      listUsers: makeListUsers({ users }),
      listColours: makeListColours({ catalog }),
      listPatterns: makeListPatterns({ catalog }),
      createTicket: makeCreateTicket({ tickets, partners, catalog, audit, fileStorage, clock }),
      getTicket: makeGetTicket({ tickets }),
      listTickets: makeListTickets({ tickets }),
      updateTicket: makeUpdateTicket({ tickets, partners, catalog, audit, clock }),
      deleteTicket: makeDeleteTicket({ tickets, audit, fileStorage, clock }),
      replaceTicketFile: makeReplaceTicketFile({ tickets, audit, fileStorage, clock }),
      listAudit: makeListAudit({ tickets, audit }),
      getFile: makeGetFile({ tickets, fileStorage }),
    },
  };
}
