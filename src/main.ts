import { registerSW } from 'virtual:pwa-register';
import { openStore } from './store';
import { registerServiceWorker } from './pwa/registerServiceWorker';

registerServiceWorker(registerSW);

openStore().catch((error: unknown) => {
  console.error('GymBro could not open its store', error);
  const app = document.getElementById('app');
  if (app) app.textContent = "GymBro can't save data here. Open it from your home screen, not a private tab.";
});
