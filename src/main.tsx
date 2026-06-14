import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (e) => {
  const errStr = e.error ? e.error.stack : e.message;
  if(errStr && errStr.includes("Invalid LatLng")) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '10px'; div.style.left = '10px'; div.style.zIndex='999999';
    div.style.background = 'rgba(255,0,0,0.9)'; div.style.color = 'white'; div.style.padding = '20px';
    div.innerHTML = `<pre>${errStr}</pre>`;
    document.body.appendChild(div);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
