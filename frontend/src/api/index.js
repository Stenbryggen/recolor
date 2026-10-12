import { request } from './client.js';

// One function per endpoint (see *API (v1)* in the README).

export const listUsers = () => request('/users');
export const listColours = () => request('/colours');
export const listPatterns = () => request('/patterns');

export const listPartners = () => request('/partners');
export const getPartner = (id) => request(`/partners/${id}`);

export const listTickets = (query) => request('/tickets', { query });
export const getTicket = (id) => request(`/tickets/${id}`);
export const getAudit = (id) => request(`/tickets/${id}/audit`);
export const createTicket = (form) => request('/tickets', { method: 'POST', form });
export const deleteTicket = (id) => request(`/tickets/${id}`, { method: 'DELETE' });

export const sendTicket = (id) => request(`/tickets/${id}/send`, { method: 'POST' });
export const acknowledgeTicket = (id) => request(`/tickets/${id}/acknowledge`, { method: 'POST' });
export const deliverTicket = (id) => request(`/tickets/${id}/deliver`, { method: 'POST' });
export const approveTicket = (id) => request(`/tickets/${id}/approve`, { method: 'POST' });
export const rejectTicket = (id, reason) => request(`/tickets/${id}/reject`, { method: 'POST', json: { reason } });

export function uploadResultImage(ticketId, variantId, slot, file) {
  const form = new FormData();
  form.append('file', file);
  return request(`/tickets/${ticketId}/variants/${variantId}/results/${slot}`, { method: 'PUT', form });
}

export const listApprovedPhotos = (query) => request('/approved-photos', { query });
export const getKpis = () => request('/dashboard/kpis');
