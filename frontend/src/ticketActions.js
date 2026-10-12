// Which buttons a user sees on a ticket. The backend enforces the same rules (403/404/409);
// this only decides what to show.

export function availableActions(user, ticket) {
  const { role } = user;
  const { status } = ticket;
  const actions = [];

  if (role === 'OPERATOR') {
    if (status === 'PENDING' || status === 'REJECTED') actions.push('send');
    if (status === 'PENDING') actions.push('delete');
  }
  if (role === 'PARTNER') {
    if (status === 'SENT') actions.push('acknowledge');
    if (status === 'IN_PROGRESS') actions.push('uploadResults', 'deliver');
  }
  if (role === 'MANAGER' && status === 'COMPLETED') actions.push('approve', 'reject');

  return actions;
}

// The navigation: which pages a role gets.
export function canSeePartnerOverview(user) {
  return user.role !== 'PARTNER';
}

export function canCreateTicket(user) {
  return user.role === 'OPERATOR';
}
