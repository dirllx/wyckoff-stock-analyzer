/**
 * Service Worker
 * 实现离线缓存和PWA功能
 */

const CACHE_NAME = 'wyckoff-v1';
const STATIC_CACHE = 'wyckoff-static-v1';
const API_CACHE = 'wyckoff-api-v1';

// 静态资源缓存列表
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/styles/mobile.css',
  '/src/styles/enhanced.css',
  '/src/styles/minimal.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// API缓存策略配置
const API_CACHE_CONFIG = {
  // 缓存这些API端点（5分钟）
  '/api/v1/health': { strategy: 'stale-while-revalidate', maxAge: 5 * 60 * 1000 },
  '/api/v1/watchlist': { strategy: 'stale-while-revalidate', maxAge: 5 * 60 * 1000 },
  '/api/v1/stocks': { strategy: 'network-first', maxAge: 5 * 60 * 1000 },
  '/api/v1/settings': { strategy: 'stale-while-revalidate', maxAge: 5 * 60 * 1000 }
};

// 安装事件
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // 立即激活
  self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 删除旧版本缓存
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // 立即控制所有客户端
  return self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // 处理静态资源请求
  event.respondWith(handleStaticRequest(request));
});

/**
 * 处理API请求
 */
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 检查是否是强制刷新（带时间戳参数）
  if (url.searchParams.has('_forceRefresh')) {
    return fetch(request);
  }

  // 查找匹配的缓存配置
  const config = Object.keys(API_CACHE_CONFIG).find(key => pathname.startsWith(key));

  if (!config) {
    // 没有配置的API，直接网络请求
    return fetch(request);
  }

  const cacheConfig = API_CACHE_CONFIG[config];
  const cache = await caches.open(API_CACHE);

  // 根据策略处理
  switch (cacheConfig.strategy) {
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, cache, cacheConfig.maxAge);

    case 'network-first':
      return networkFirst(request, cache);

    case 'cache-first':
      return cacheFirst(request, cache);

    default:
      return fetch(request);
  }
}

/**
 * 处理静态资源请求
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);

  // 先查找缓存
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // 缓存命中，同时后台更新
    fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    });

    return cachedResponse;
  }

  // 缓存未命中，网络请求
  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // 网络失败，返回离线页面
    return caches.match('/offline.html') || new Response('离线模式', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Stale-While-Revalidate策略
 */
async function staleWhileRevalidate(request, cache, maxAge) {
  const cacheKey = request.url;
  const cached = await cache.match(cacheKey);

  // 检查缓存是否过期
  let isExpired = false;
  if (cached) {
    const cacheTime = cached.headers.get('date');
    if (cacheTime) {
      const age = Date.now() - new Date(cacheTime).getTime();
      isExpired = age > maxAge;
    }
  }

  // 后台更新
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const responseToCache = response.clone();
      responseToCache.headers.set('date', new Date().toUTCString());
      cache.put(cacheKey, responseToCache);
    }
    return response;
  }).catch((error) => {
    console.error('[SW] Fetch failed:', error);
    return cached || new Response('网络错误', { status: 503 });
  });

  // 如果有缓存且未过期，立即返回
  if (cached && !isExpired) {
    return cached;
  }

  // 否则等待网络请求
  return fetchPromise;
}

/**
 * Network-First策略
 */
async function networkFirst(request, cache) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Network failed, trying cache:', error);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
}

/**
 * Cache-First策略
 */
async function cacheFirst(request, cache) {
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// 消息处理
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});
