// Legjobb Énem — offline működés.
// Az app oldalát "hálózat először" módon kéri (így a frissítések azonnal megjelennek),
// és csak internet nélkül adja vissza az elmentett példányt. Az AI-hívásokat nem tárolja.
const CACHE = "legjobb-enem-v1";
const CORE = ["./", "./index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function store(req, res) {
  if (res && (res.ok || res.type === "opaque")) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !isFont) return; // AI és egyéb külső hívások: érintetlenül

  if (isFont) { // betűtípusok: gyorsítótárból, ha már megvannak
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => store(req, res))));
    return;
  }
  // saját oldal: hálózat először, internet nélkül a mentett példány
  e.respondWith(
    fetch(req).then((res) => store(req, res))
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./index.html")))
  );
});
