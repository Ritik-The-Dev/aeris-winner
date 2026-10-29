import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import App from './App';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('AERIS could not find the root element');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
