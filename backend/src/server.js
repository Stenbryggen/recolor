import { createApp } from './app.js';
import { createContainer } from './compositionRoot.js';
import { seedDemoTickets } from './seed/demoTickets.js';

const port = Number(process.env.PORT) || 3000;

const container = createContainer();
await seedDemoTickets(container);

createApp(container).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
