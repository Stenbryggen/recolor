import { ROLE } from '../domain/constants.js';

// Seed data for the lookup lists, partners and users.
// The brief gives colour names only (no codes), so only names are stored.
// The partners and users are invented: the brief has none.

export const colours = [
  { id: 'granita', pantoneName: 'Granita' },
  { id: 'fuchsia-fedora', pantoneName: 'Fuchsia Fedora' },
  { id: 'night-sky', pantoneName: 'Night Sky' },
  { id: 'hedge-green', pantoneName: 'Hedge Green' },
  { id: 'navy-blazer', pantoneName: 'Navy Blazer' },
];

export const patterns = [
  { id: 'block-libre', name: 'Block Libre' },
  { id: 'dots-cloud-dancer', name: 'Dots (Cloud Dancer)' },
];

export const partners = [
  { id: 'partner-pixelworks', name: 'Pixelworks' },
  { id: 'partner-clipmaster', name: 'ClipMaster' },
];

export const users = [
  { id: 'user-maria', name: 'Maria Hansen', role: ROLE.OPERATOR },
  { id: 'user-thomas', name: 'Thomas Nielsen', role: ROLE.OPERATOR },
  { id: 'user-jens', name: 'Jens Andersen', role: ROLE.MANAGER },
  { id: 'user-anh', name: 'Anh Tran', role: ROLE.PARTNER, partnerId: 'partner-pixelworks' },
  { id: 'user-sofie', name: 'Sofie Larsen', role: ROLE.PARTNER, partnerId: 'partner-pixelworks' },
  { id: 'user-ravi', name: 'Ravi Patel', role: ROLE.PARTNER, partnerId: 'partner-clipmaster' },
];

export const referenceData = { colours, patterns, partners, users };
