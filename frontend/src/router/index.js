import { createRouter, createWebHistory } from 'vue-router';
import { canCreateTicket, canSeePartnerOverview } from '../ticketActions.js';

// `meta.title` puts a page in the menu; `meta.allowed` says which users may open it.
export const routes = [
  { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Dashboard', icon: 'pi pi-chart-bar' } },
  { path: '/queue', name: 'queue', component: () => import('../views/QueueView.vue'), meta: { title: 'Queue', icon: 'pi pi-list' } },
  { path: '/tickets/new', name: 'ticket-new', component: () => import('../views/CreateTicketView.vue'), meta: { title: 'New ticket', icon: 'pi pi-plus', allowed: canCreateTicket } },
  { path: '/tickets/:id', name: 'ticket', component: () => import('../views/TicketView.vue') },
  { path: '/approved', name: 'approved', component: () => import('../views/ApprovedLibraryView.vue'), meta: { title: 'Approved Library', icon: 'pi pi-check-circle' } },
  { path: '/partners', name: 'partners', component: () => import('../views/PartnerOverviewView.vue'), meta: { title: 'Partner Overview', icon: 'pi pi-send', allowed: canSeePartnerOverview } },
];

export const isAllowed = (route, user) => !route.meta?.allowed || route.meta.allowed(user);

export default createRouter({ history: createWebHistory(), routes });
