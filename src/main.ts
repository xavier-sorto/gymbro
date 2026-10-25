import { openStore } from './store';

openStore().catch((error: unknown) => {
  console.error('GymBro could not open its store', error);
  const app = document.getElementById('app');
  if (app) app.textContent = "GymBro can't save data here. Open it from your home screen, not a private tab.";
});
