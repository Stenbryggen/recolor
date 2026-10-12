import { systemClock } from './adapters/clock.js';
import { createMemoryApprovedPhotoReader } from './adapters/memory/approvedPhotoReader.js';
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
import { makeListApprovedPhotos } from './application/listApprovedPhotos.js';
import { makeGetKpis, makeGetPartner, makeListPartners } from './application/overview.js';
import { makeIdentifyUser, makeListColours, makeListPatterns, makeListUsers } from './application/reference.js';
import { makeReplaceTicketFile } from './application/replaceTicketFile.js';
import { makeUpdateTicket } from './application/updateTicket.js';
import { makeUploadResultImage } from './application/uploadResultImage.js';
import {
  makeAcknowledgeTicket,
  makeApproveTicket,
  makeDeliverTicket,
  makeRejectTicket,
  makeSendTicket,
} from './application/workflow.js';
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
  const approvedPhotos = createMemoryApprovedPhotoReader(tickets);
  const workflowDeps = { tickets, audit, clock };

  return {
    repositories: { tickets, users, partners, catalog, audit, approvedPhotos },
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
      sendTicket: makeSendTicket(workflowDeps),
      acknowledgeTicket: makeAcknowledgeTicket(workflowDeps),
      uploadResultImage: makeUploadResultImage({ tickets, audit, fileStorage, clock }),
      deliverTicket: makeDeliverTicket(workflowDeps),
      approveTicket: makeApproveTicket(workflowDeps),
      rejectTicket: makeRejectTicket(workflowDeps),
      getKpis: makeGetKpis({ tickets }),
      listPartners: makeListPartners({ partners, tickets }),
      getPartner: makeGetPartner({ partners, tickets }),
      listApprovedPhotos: makeListApprovedPhotos({ approvedPhotos }),
    },
  };
}
