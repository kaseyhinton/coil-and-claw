// Makes Coil & Claw installable and shows a friendly page instead of the browser's error when offline.
// Nothing is cached; every request goes to the network.

const OFFLINE_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Coil &amp; Claw</title>
<style>
  body { margin: 0; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; padding: 16px; text-align: center; font-family: Nunito, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #f3fbf6; color: #3b2f45; }
  h1 { margin: 0; font-size: 24px; }
  p { margin: 0; color: #7a7085; }
  button { margin-top: 8px; border: 0; border-radius: 999px; padding: 12px 24px; font: inherit; font-weight: 700;
    background: #2f9e74; color: #fff; cursor: pointer; }
  @media (prefers-color-scheme: dark) { body { background: #16201b; color: #f1ecf5; } p { color: #b3aabb; } }
</style></head>
<body>
  <div style="font-size: 64px" aria-hidden="true">🐍</div>
  <h1>You're offline</h1>
  <p>Coil &amp; Claw needs a connection to load your pets.</p>
  <button onclick="location.reload()">Try again</button>
</body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { headers: { "content-type": "text/html; charset=utf-8" } }),
    ),
  );
});
