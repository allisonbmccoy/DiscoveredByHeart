// Set the class before the body renders to avoid flashing the standalone shell.
(() => {
  const mode = new URLSearchParams(window.location.search).get("embed");
  if (mode !== "1" && mode !== "true") return;
  document.documentElement.classList.add("embedded");
  if (window.parent === window) return;

  const allowedOrigins = new Set([
    "https://www.sistersbyheart.org",
    "https://sistersbyheart.org",
  ]);
  let parentOrigin;
  try { parentOrigin = new URL(document.referrer).origin; } catch {}
  let framePending = false;
  let lastHeight = 0;

  function scheduleHeight(force = false) {
    if (!allowedOrigins.has(parentOrigin)) return;
    if (force) lastHeight = 0;
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => {
      framePending = false;
      const content = document.getElementById("embed-content");
      if (!content) return;
      // Measure content, not document.scrollHeight, which is floored by iframe height.
      const height = Math.ceil(content.getBoundingClientRect().height);
      if (height > 0 && height !== lastHeight) {
        lastHeight = height;
        window.parent.postMessage({ type: "discovered-by-heart:resize", height }, parentOrigin);
      }
    });
  }

  // Parent requests also handle a missing referrer and a late Squarespace listener.
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !allowedOrigins.has(event.origin)) return;
    if (event.data?.type !== "discovered-by-heart:measure") return;
    parentOrigin = event.origin;
    scheduleHeight(true);
  });

  document.addEventListener("DOMContentLoaded", () => {
    new ResizeObserver(() => scheduleHeight()).observe(document.getElementById("embed-content"));
    scheduleHeight();
    document.fonts?.ready.then(() => scheduleHeight());
  });
  window.addEventListener("load", () => scheduleHeight());
  window.addEventListener("resize", () => scheduleHeight());
})();
