// js/app.js
import { Router } from './router.js';
import { showToast } from './components/toast.js';

document.addEventListener('DOMContentLoaded', () => {
  const appRoot = document.getElementById('app-root');
  const router = new Router(appRoot);
  router.init();

  // Dark Mode Toggle
  const themeToggleBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  setTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
      localStorage.setItem('theme', next);
    });
  }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (themeToggleBtn) {
      themeToggleBtn.textContent = t === 'dark' ? '深色模式' : '淺色模式';
      themeToggleBtn.setAttribute('title', t === 'dark' ? '切換為淺色檢索視圖' : '切換為深色檢索視圖');
    }
  }

  // Active Nav Link Tracker
  function updateActiveNav() {
    const hash = window.location.hash || '#/';
    document.querySelectorAll('.header-nav .nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === hash || (href !== '#/' && hash.startsWith(href))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  window.addEventListener('hashchange', updateActiveNav);
  updateActiveNav();

  // Network Online/Offline status
  window.addEventListener('online', () => {
    showToast('網路連線已恢復正常', 'success');
  });

  window.addEventListener('offline', () => {
    showToast('網路連線中斷，將調用本機 IndexedDB 快取記錄', 'error', 6000);
  });
});
