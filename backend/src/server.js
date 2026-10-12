import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDiskFileStorage } from './adapters/diskFileStorage.js';
import { createContainer } from './compositionRoot.js';
import { seedDemoTickets } from './seed/demoTickets.js';

const port = Number(process.env.PORT) || 3000;
const backendDir = fileURLToPath(new URL('..', import.meta.url));

// Uploaded files are kept in backend/uploads/ (not committed).
const container = createContainer({ fileStorage: createDiskFileStorage(path.join(backendDir, 'uploads')) });

// The case photos are read from the recolour-case folder next to this project,
// or from RECOLOUR_CASE_DIR. Without them, the seed tickets get a placeholder image.
const caseDir = process.env.RECOLOUR_CASE_DIR || path.resolve(backendDir, '../../recolour-case');
await seedDemoTickets(container, { caseDir });

createApp(container).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
