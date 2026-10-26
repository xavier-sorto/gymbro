import { registerSW } from 'virtual:pwa-register';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { mountApp } from './ui/mount';

registerServiceWorker(registerSW);

const container = document.getElementById('app');
if (container) mountApp(container);
else console.error('GymBro: the #app element is missing from index.html');
