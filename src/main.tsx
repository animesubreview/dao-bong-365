import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyTheme, getTheme } from './lib/theme';
import { getLang } from './lib/i18n';
import { initPageTranslation, setTranslateCookie } from './lib/translate';

applyTheme(getTheme());
setTranslateCookie(getLang());
initPageTranslation(getLang());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
