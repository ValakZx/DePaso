import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register VitePWA Service Worker (ready for Web Push & offline resilience)
registerSW({immediate: true});

createRoot(document.getElementById('root')!).render(<App />);
