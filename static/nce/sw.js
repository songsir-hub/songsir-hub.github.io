/**
 * 博雅小筑 /nce/ 离线 PWA Service Worker
 * - 缓存应用壳 + audio/lrc + book.json，断网可点读
 * - 版本化：SW_VERSION 变更时全部重装
 * - 更新策略：
 *   · 应用壳/静态：cache-first（命中缓存直接给，后台刷新）
 *   · 音频/LRC：cache-first（离线核心资源，缓存即断网可用）
 *   · book.json / data.json：stale-while-revalidate（离线优先 + 后台校验）
 */

const SW_VERSION = 'nce-pwa-v2';
const CACHE_NAME = `nce-${SW_VERSION}`;
const AUDIO_PREFIX = 'audio/';

// 首次安装即缓存的应用壳（页面与代码，不含音频——音频按需缓存）
const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'data.json',
  'sponsor.json',
  'favicon.ico',
  'css/style.css',
  'js/main.js',
  'js/config.js',
  'js/ReadingSystem.js',
  'js/player/AudioController.js',
  'js/services/BookService.js',
  'js/services/PrefetchService.js',
  'js/ui/LyricsView.js',
  'js/ui/UnitView.js',
  'js/ui/Toast.js',
  'js/ui/modal.js',
  'js/ui/theme.js',
  'js/managers/CacheManager.js',
  'js/utils/LRCParser.js',
  'js/utils/dom.js',
  'js/utils/escape.js',
  'js/utils/helpers.js',
  'js/utils/storage.js',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
];

const MAX_AUDIO_CACHE = 800; // 音频缓存条目上限（约 559 课 mp3 + lrc + book.json 远小于此）

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      // 立即激活，不等旧 SW 关闭
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 清掉旧版本缓存
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 只处理同源 /nce/ 下的请求（音频相对路径即落在 nce/ 下）
  // GitHub Pages 上：origin = https://songsir-hub.github.io
  if (url.origin !== location.origin) return;

  const isAudio = url.pathname.includes(AUDIO_PREFIX) ||
    url.pathname.endsWith('.mp3') || url.pathname.endsWith('.lrc');

  if (isAudio) {
    // 音频/LRC：cache-first，离线核心
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const resp = await fetch(req);
          if (resp.ok) {
            await cache.put(req, resp.clone());
            await trimCache(CACHE_NAME, MAX_AUDIO_CACHE);
          }
          return resp;
        } catch (e) {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 静态资源与数据：network-first（在线拿最新，离线回退缓存）
  // 原为 stale-while-revalidate，导致每次改 CSS/JS 都先返回旧缓存，
  // 用户装成 PWA 后长期看到旧版本，改样式等于白改。
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const resp = await fetch(req);
        if (resp && resp.ok) {
          cache.put(req, resp.clone());
        }
        return resp;
      } catch (e) {
        const cached = await cache.match(req);
        return cached || Response.error();
      }
    })()
  );
});

// 音频缓存条目超限时，清掉最早缓存的若干条
async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) {
    await cache.delete(keys[0]);
    await trimCache(cacheName, max);
  }
}
