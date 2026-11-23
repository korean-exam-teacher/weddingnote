// 앱 설치용 서비스 워커: 사이트 화면 파일만 보관합니다.
// 준비 기록(Firebase 데이터)과 로그인 정보는 보관하지 않고 언제나 서버에서 새로 받습니다.
const CACHE = "weddingnote-v6";
const SHELL = ["./", "index.html", "login.html", "app.html", "invite.html", "privacy.html",
  "css/style.css", "js/app.js", "js/store.js", "js/common.js", "js/flowers.js", "js/firebase-config.js", "js/pwa.js", "js/inapp.js",
  "icons/icon-192.png", "icons/icon-512.png", "manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// 같은 사이트의 화면 파일만: 먼저 인터넷에서 받고(최신), 안 되면 보관본을 씁니다.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
