import './styles/fonts.css';
import './styles/base.css';
import './styles/app.css';
import { initThemeToggle } from './ui/theme';

document.getElementById('year')!.textContent = String(new Date().getFullYear());
initThemeToggle();
