import { createRouter, createWebHistory } from 'vue-router';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Dashboard', icon: 'pi pi-chart-bar' } },
    { path: '/queue', name: 'queue', component: () => import('../views/QueueView.vue'), meta: { title: 'Queue', icon: 'pi pi-list' } },
    { path: '/tickets/new', name: 'ticket-new', component: () => import('../views/CreateTicketView.vue'), meta: { title: 'New ticket', icon: 'pi pi-plus' } },
    { path: '/approved', name: 'approved', component: () => import('../views/ApprovedLibraryView.vue'), meta: { title: 'Approved Library', icon: 'pi pi-check-circle' } },
    { path: '/partners', name: 'partners', component: () => import('../views/PartnerOverviewView.vue'), meta: { title: 'Partner Overview', icon: 'pi pi-send' } },
  ],
});
