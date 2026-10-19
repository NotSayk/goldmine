import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startBlinking } from './fx/blink';
import { client } from './store';
import './preferences';
import './styles/index.css';

client.connect();
startBlinking();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
