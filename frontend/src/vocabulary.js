// The words of the app, from GLOSSARY.md.

export const STATUS_LABEL = {
  PENDING: 'Pending',
  SENT: 'Sent',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const STATUSES = Object.keys(STATUS_LABEL);

// The dashboard shows COMPLETED as "Awaiting approval".
export const STATUS_HINT = { COMPLETED: 'Awaiting approval', SENT: 'Awaiting receipt' };

export const PRIORITY_LABEL = { LOW: 'Low', NORMAL: 'Normal', HIGH: 'High' };
export const PRIORITIES = Object.keys(PRIORITY_LABEL);

export const SLOT_LABEL = { FRONT: 'Front', BACK: 'Back', STYLE: 'Style', REFERENCE: 'Reference image' };
export const RESULT_SLOTS = ['FRONT', 'BACK', 'STYLE'];

export const ROLE_LABEL = { OPERATOR: 'Operator', MANAGER: 'Manager', PARTNER: 'Partner user' };

export const OPERATION_LABEL = { RECOLOUR: 'Recolour', AOP: 'AOP', RESIZE: 'Resize' };

export function formatDateTime(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' });
}
