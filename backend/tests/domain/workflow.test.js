import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../../src/domain/errors.js';
import { buildTicket, parseTicketInput } from '../../src/domain/ticket.js';
import {
  acknowledgeTicket,
  approveTicket,
  currentResults,
  deliverTicket,
  parseRejection,
  putResultImage,
  rejectTicket,
  sendTicket,
} from '../../src/domain/workflow.js';
import { NOW, catchError, validInput } from '../helpers.js';

const T1 = '2026-10-10T08:00:00.000Z';
const T2 = '2026-10-11T09:00:00.000Z';
const ctx = (actorId, at) => ({ actorId, now: new Date(at) });

const newTicket = () =>
  buildTicket({ id: 'ticket-1', input: parseTicketInput(validInput()), actorId: 'user-maria', now: new Date(NOW) });

// Gives the ticket a result image for every variant and view in its current round.
function withAllResults(ticket) {
  const results = ticket.variants.flatMap((variant) =>
    ['FRONT', 'BACK', 'STYLE'].map((slot) => ({
      id: `${variant.id}-${slot.toLowerCase()}-r${ticket.round}`,
      ticketId: ticket.id,
      variantId: variant.id,
      slot,
      round: ticket.round,
      photoId: 'p',
      file: 'f',
      uploadedAt: T1,
    })),
  );
  return { ...ticket, results };
}

describe('sendTicket', () => {
  it('moves a PENDING ticket to SENT and starts round 1', () => {
    const { ticket, changes } = sendTicket(newTicket(), ctx('user-maria', T1));

    expect(ticket).toMatchObject({ status: 'SENT', round: 1, sentAt: T1, receivedAt: null, completedAt: null });
    expect(ticket).toMatchObject({ updatedBy: 'user-maria', updatedAt: T1 });
    expect(changes).toEqual([
      { field: 'status', from: 'PENDING', to: 'SENT' },
      { field: 'round', from: 0, to: 1 },
      { field: 'sentAt', from: null, to: T1 },
    ]);
  });

  it('can send a REJECTED ticket again, which starts the next round', () => {
    const rejected = { ...newTicket(), status: 'REJECTED', round: 1, sentAt: NOW, receivedAt: NOW, completedAt: NOW, rejectionReason: 'Too dark' };

    const { ticket } = sendTicket(rejected, ctx('user-maria', T2));

    expect(ticket).toMatchObject({ status: 'SENT', round: 2, sentAt: T2, receivedAt: null, completedAt: null, rejectionReason: 'Too dark' });
  });

  it.each(['SENT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED'])('refuses a %s ticket', async (status) => {
    const error = await catchError(() => sendTicket({ ...newTicket(), status }, ctx('user-maria', T1)));
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe(`A ticket can only be sent while it is PENDING or REJECTED (this one is ${status})`);
  });

  it('does not change the ticket it was given', () => {
    const original = newTicket();
    sendTicket(original, ctx('user-maria', T1));
    expect(original).toMatchObject({ status: 'PENDING', round: 0 });
  });
});

describe('acknowledgeTicket', () => {
  it('moves a SENT ticket to IN_PROGRESS and stamps the receipt', () => {
    const sent = sendTicket(newTicket(), ctx('user-maria', T1)).ticket;

    const { ticket, changes } = acknowledgeTicket(sent, ctx('user-ravi', T2));

    expect(ticket).toMatchObject({ status: 'IN_PROGRESS', receivedAt: T2, updatedBy: 'user-ravi' });
    expect(changes).toEqual([
      { field: 'status', from: 'SENT', to: 'IN_PROGRESS' },
      { field: 'receivedAt', from: null, to: T2 },
    ]);
  });

  it('refuses a ticket that is not SENT', async () => {
    const error = await catchError(() => acknowledgeTicket(newTicket(), ctx('user-ravi', T2)));
    expect(error).toBeInstanceOf(ConflictError);
  });
});

describe('putResultImage', () => {
  const inProgress = () => ({ ...newTicket(), status: 'IN_PROGRESS', round: 1 });
  const image = { variantId: 'ticket-1-v1', slot: 'FRONT', photoId: 'front_done', file: 'ticket-1/results/r1-front.png' };

  it('adds a result image for a variant and view in the current round', () => {
    const { ticket, previous, change } = putResultImage(inProgress(), image, ctx('user-ravi', T1));

    expect(previous).toBeNull();
    expect(ticket.results).toEqual([
      {
        id: 'ticket-1-v1-front-r1',
        ticketId: 'ticket-1',
        variantId: 'ticket-1-v1',
        slot: 'FRONT',
        round: 1,
        photoId: 'front_done',
        file: 'ticket-1/results/r1-front.png',
        uploadedAt: T1,
      },
    ]);
    expect(change).toEqual({ field: 'results.ticket-1-v1.FRONT', from: null, to: 'front_done' });
    expect(ticket).toMatchObject({ updatedBy: 'user-ravi', updatedAt: T1 });
  });

  it('replaces the result of the same variant, view and round', () => {
    const first = putResultImage(inProgress(), image, ctx('user-ravi', T1)).ticket;

    const second = putResultImage(first, { ...image, photoId: 'better' }, ctx('user-ravi', T2));

    expect(second.ticket.results).toHaveLength(1);
    expect(second.ticket.results[0]).toMatchObject({ photoId: 'better', uploadedAt: T2 });
    expect(second.previous.photoId).toBe('front_done');
    expect(second.change).toEqual({ field: 'results.ticket-1-v1.FRONT', from: 'front_done', to: 'better' });
  });

  it('keeps the results of earlier rounds', () => {
    const round1 = putResultImage(inProgress(), image, ctx('user-ravi', T1)).ticket;
    const round2 = { ...round1, round: 2 };

    const { ticket } = putResultImage(round2, { ...image, file: 'ticket-1/results/r2-front.png' }, ctx('user-ravi', T2));

    expect(ticket.results.map((result) => result.id)).toEqual(['ticket-1-v1-front-r1', 'ticket-1-v1-front-r2']);
    expect(currentResults(ticket).map((result) => result.round)).toEqual([2]);
  });

  it('refuses the REFERENCE slot, an unknown variant and a ticket that is not IN_PROGRESS', async () => {
    const slot = await catchError(() => putResultImage(inProgress(), { ...image, slot: 'REFERENCE' }, ctx('user-ravi', T1)));
    expect(slot).toBeInstanceOf(ValidationError);
    expect(slot.errors).toEqual({ slot: 'The slot must be one of FRONT, BACK, STYLE' });

    const variant = await catchError(() => putResultImage(inProgress(), { ...image, variantId: 'ticket-1-v9' }, ctx('user-ravi', T1)));
    expect(variant).toBeInstanceOf(NotFoundError);

    const status = await catchError(() => putResultImage({ ...inProgress(), status: 'SENT' }, image, ctx('user-ravi', T1)));
    expect(status).toBeInstanceOf(ConflictError);
  });
});

describe('deliverTicket', () => {
  const inProgress = () => ({ ...newTicket(), status: 'IN_PROGRESS', round: 1 });

  it('moves an IN_PROGRESS ticket with all result images to COMPLETED', () => {
    const { ticket, changes } = deliverTicket(withAllResults(inProgress()), ctx('user-ravi', T2));

    expect(ticket).toMatchObject({ status: 'COMPLETED', completedAt: T2 });
    expect(changes).toEqual([
      { field: 'status', from: 'IN_PROGRESS', to: 'COMPLETED' },
      { field: 'completedAt', from: null, to: T2 },
    ]);
  });

  it('names every result image that is missing', async () => {
    const ticket = withAllResults(inProgress());
    ticket.results = ticket.results.filter((result) => result.slot !== 'BACK');

    const error = await catchError(() => deliverTicket(ticket, ctx('user-ravi', T2)));

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.errors).toEqual({ 'results.ticket-1-v1.BACK': 'A result image is required' });
  });

  it('needs the results of the current round, not an earlier one', async () => {
    const earlier = { ...withAllResults(inProgress()), round: 2 };

    const error = await catchError(() => deliverTicket(earlier, ctx('user-ravi', T2)));

    expect(Object.keys(error.errors)).toEqual([
      'results.ticket-1-v1.FRONT',
      'results.ticket-1-v1.BACK',
      'results.ticket-1-v1.STYLE',
    ]);
  });

  it('needs the ticket to be IN_PROGRESS', async () => {
    const error = await catchError(() => deliverTicket({ ...withAllResults(inProgress()), status: 'SENT' }, ctx('user-ravi', T2)));
    expect(error).toBeInstanceOf(ConflictError);
  });
});

describe('approveTicket and rejectTicket', () => {
  const completed = () => ({ ...newTicket(), status: 'COMPLETED', round: 1 });

  it('approves a COMPLETED ticket and says who approved it and when', () => {
    const { ticket, changes } = approveTicket(completed(), ctx('user-jens', T2));

    expect(ticket).toMatchObject({ status: 'APPROVED', approvedAt: T2, approvedBy: 'user-jens' });
    expect(changes).toEqual([
      { field: 'status', from: 'COMPLETED', to: 'APPROVED' },
      { field: 'approvedAt', from: null, to: T2 },
      { field: 'approvedBy', from: null, to: 'user-jens' },
    ]);
  });

  it('forgets an earlier rejection reason when the ticket is approved', () => {
    const { ticket, changes } = approveTicket({ ...completed(), rejectionReason: 'Too dark' }, ctx('user-jens', T2));

    expect(ticket.rejectionReason).toBeNull();
    expect(changes).toContainEqual({ field: 'rejectionReason', from: 'Too dark', to: null });
  });

  it('rejects a COMPLETED ticket with a reason', () => {
    const { ticket, changes } = rejectTicket(completed(), 'The colour is too dark', ctx('user-jens', T2));

    expect(ticket).toMatchObject({ status: 'REJECTED', rejectionReason: 'The colour is too dark' });
    expect(changes).toEqual([
      { field: 'status', from: 'COMPLETED', to: 'REJECTED' },
      { field: 'rejectionReason', from: null, to: 'The colour is too dark' },
    ]);
  });

  it.each(['PENDING', 'SENT', 'IN_PROGRESS', 'APPROVED', 'REJECTED'])('refuses to approve or reject a %s ticket', async (status) => {
    const ticket = { ...completed(), status };
    expect(await catchError(() => approveTicket(ticket, ctx('user-jens', T2)))).toBeInstanceOf(ConflictError);
    expect(await catchError(() => rejectTicket(ticket, 'x', ctx('user-jens', T2)))).toBeInstanceOf(ConflictError);
  });
});

describe('parseRejection', () => {
  it('returns the trimmed reason', () => {
    expect(parseRejection({ reason: '  Too dark ' })).toEqual({ reason: 'Too dark' });
  });

  it('needs a reason', async () => {
    for (const body of [undefined, {}, { reason: '' }, { reason: '   ' }, { reason: 5 }]) {
      const error = await catchError(() => parseRejection(body));
      expect(error.errors).toEqual({ reason: 'A reason is required' });
    }
  });

  it('limits the length of the reason', async () => {
    const error = await catchError(() => parseRejection({ reason: 'x'.repeat(1001) }));
    expect(error.errors).toEqual({ reason: 'The reason can be at most 1000 characters' });
  });
});
