import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { client } from './store';
import './preferences';
import './styles.css';

client.connect();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
