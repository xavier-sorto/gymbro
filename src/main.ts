import { registerSW } from 'virtual:pwa-register';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { installDoubleTapGuard } from './ui/doubleTapGuard';
import { mountApp } from './ui/mount';

registerServiceWorker(registerSW);
installDoubleTapGuard();

const container = document.getElementById('app');
if (container) mountApp(container);
else console.error('GymBro: the #app element is missing from index.html');
