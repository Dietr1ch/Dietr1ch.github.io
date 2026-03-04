//==========================================================
// Client-side response caching for htmx requests.
// Caches GET responses by URL and serves them on
// subsequent requests, with configurable TTL.
//
// Usage:
//   <div hx-ext="cache">
//     <button hx-get="/api/data" hx-cache="60s">Load</button>
//   </div>
//
// hx-cache values:
//   "60s", "5m", "1h"  - cache with TTL
//   "true"             - cache with default TTL (60s)
//   "false"            - bypass cache for this element
//==========================================================
(() => {
  let cache = new Map();

  htmx.registerExtension("cache", {
    htmx_before_request: (elt, { ctx }) => {
      if (ctx.request.method !== "GET") return;
      let ttl = parseTTL(elt);
      if (!ttl) return;

      let url = ctx.request.action;
      let entry = cache.get(url);
      if (entry && Date.now() < entry.expiresAt) {
        ctx.fetch = () =>
          new Response(entry.body, {
            status: entry.status,
            headers: entry.headers,
          });
        htmx.trigger(elt, "htmx:cache:hit", { url });
        return;
      }
      cache.delete(url);

      let originalFetch = ctx.fetch;
      ctx.fetch = async (url, options) => {
        let response = await originalFetch(url, options);
        let body = await response.text();
        cache.set(url, {
          body,
          status: response.status,
          headers: [...response.headers],
          expiresAt: Date.now() + ttl,
        });
        htmx.trigger(elt, "htmx:cache:miss", { url });
        return new Response(body, {
          status: response.status,
          headers: response.headers,
        });
      };
    },
  });

  function parseTTL(elt) {
    let val =
      elt.getAttribute("hx-cache") ||
      elt.closest("[hx-cache]")?.getAttribute("hx-cache");
    if (!val || val === "false") return null;
    if (val === "true") return 60000;
    return htmx.parseInterval(val) || 60000;
  }
})();
