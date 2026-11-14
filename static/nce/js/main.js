/**
 * 应用入口
 * @module main
 */

import { ReadingSystem } from './ReadingSystem.js';
import { ThemeManager } from './ui/theme.js';

function boot() {
  try {
    const themeManager = new ThemeManager({
      toggleBtn: document.getElementById('themeToggle'),
    });
    themeManager.init();

    const readingSystem = new ReadingSystem();

    if (window.__DEV__) {
      Object.assign(window, { readingSystem, themeManager });
    }

    return { readingSystem, themeManager };
  } catch (error) {
    console.error('Failed to initialize iReader:', error);
    document.body.replaceChildren();
    const box = document.createElement('div');
    box.style.cssText = 'padding:20px;color:#b91c1c;font-family:sans-serif';
    box.innerHTML = '<h2>应用初始化失败</h2><p>请检查浏览器控制台了解详细错误信息。</p>';
    document.body.appendChild(box);
    throw error;
  }
}

if (document.readyState === 'complete') {
  boot();
} else {
  window.addEventListener('load', boot, { once: true });
}
