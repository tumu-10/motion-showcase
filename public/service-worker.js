const CACHE_NAME = "propatiz-static-v1";
const OUTBOX_DB = "propatiz-offline-outbox";
const OUTBOX_STORE = "forms";
const STATIC_PATHS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/propatiz-mark.svg",
  "/icons/propatiz-192.png",
  "/icons/propatiz-512.png",
  "/icons/propatiz-maskable-512.png",
];
const STATIC_EXTENSIONS = /\.(?:avif|css|gif|ico|jpe?g|js|png|svg|webp|woff2?|ttf)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_PATHS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("propatiz-static-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlinePage = await caches.match("/offline.html");
        return (
          offlinePage ??
          new Response("You are offline. Reconnect and try again.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/api" ||
    !STATIC_EXTENSIONS.test(url.pathname)
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(request);
      const contentType = response.headers.get("content-type") ?? "";
      if (
        response.ok &&
        response.type === "basic" &&
        !contentType.includes("application/json")
      ) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type === "QUEUE_FORM_SUBMISSION") {
    event.waitUntil(queueFormSubmission(event));
    return;
  }
  if (event.data?.type === "FLUSH_FORM_QUEUE") {
    event.waitUntil(flushFormQueue());
    return;
  }
  if (event.data?.type === "CACHE_APP_SHELL") {
    event.waitUntil(cacheAppShell(event.data.urls));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "propatiz-form-submissions") {
    event.waitUntil(flushFormQueue());
  }
});

function openOutbox() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OUTBOX_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueFormSubmission(event) {
  const submission = event.data.submission;
  const url = new URL(submission.url, self.location.origin);
  if (
    url.origin !== self.location.origin ||
    !/^\/api\/forms\/complaints$/.test(url.pathname) ||
    submission.method !== "POST" ||
    !submission.fields ||
    typeof submission.fields.category !== "string" ||
    typeof submission.fields.urgency !== "string" ||
    typeof submission.fields.description !== "string" ||
    submission.fields.description.length > 500 ||
    (submission.photo && submission.photo.size > 5 * 1024 * 1024)
  ) {
    event.ports[0]?.postMessage({ ok: false, error: "This form cannot be queued." });
    return;
  }

  try {
    const db = await openOutbox();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE, "readwrite");
      transaction.objectStore(OUTBOX_STORE).put({
        ...submission,
        url: url.href,
        createdAt: Date.now(),
        attempts: 0,
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    event.ports[0]?.postMessage({ ok: true });
    if ("sync" in self.registration) {
      try {
        await self.registration.sync.register("propatiz-form-submissions");
      } catch (error) {
        console.warn("Background sync is unavailable; the queue will retry when online.", error);
      }
    }
  } catch (error) {
    event.ports[0]?.postMessage({ ok: false, error: "Could not save this form offline." });
    console.error("Could not queue offline form submission.", error);
  }
}

async function flushFormQueue() {
  const db = await openOutbox();
  const entries = await new Promise((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, "readonly");
    const request = transaction.objectStore(OUTBOX_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  for (const entry of entries.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      const body = new FormData();
      Object.entries(entry.fields).forEach(([key, value]) => body.append(key, value));
      if (entry.photo) body.append("photo", entry.photo, entry.photo.name);
      const response = await fetch(entry.url, {
        method: entry.method,
        headers: { "Idempotency-Key": entry.id },
        body,
        credentials: "same-origin",
      });
      if (!response.ok) {
        await updateAttempt(db, entry);
        continue;
      }
      await deleteEntry(db, entry.id);
      await notifyClients({ type: "FORM_SUBMISSION_SENT", id: entry.id });
    } catch (error) {
      await updateAttempt(db, entry);
      console.error("Offline form submission will be retried.", error);
    }
  }
  db.close();
}

function updateAttempt(db, entry) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, "readwrite");
    transaction.objectStore(OUTBOX_STORE).put({ ...entry, attempts: entry.attempts + 1 });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function deleteEntry(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(OUTBOX_STORE, "readwrite");
    transaction.objectStore(OUTBOX_STORE).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function cacheAppShell(urls) {
  if (!Array.isArray(urls)) return;
  const cache = await caches.open(CACHE_NAME);
  const assets = urls.slice(0, 100).map(async (value) => {
    const url = new URL(value, self.location.origin);
    if (
      url.origin !== self.location.origin ||
      url.pathname.startsWith("/api/") ||
      url.pathname === "/api" ||
      !STATIC_EXTENSIONS.test(url.pathname)
    ) {
      return;
    }

    try {
      const request = new Request(url.href, { credentials: "same-origin" });
      const response = await fetch(request);
      const contentType = response.headers.get("content-type") ?? "";
      if (
        response.ok &&
        response.type === "basic" &&
        !contentType.includes("application/json")
      ) {
        await cache.put(request, response);
      }
    } catch (error) {
      console.warn("Could not cache a Propatiz app asset.", error);
    }
  });
  await Promise.all(assets);
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}
