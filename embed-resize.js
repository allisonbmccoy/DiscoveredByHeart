// Keep the host page's iframe as tall as the content, including expanded studies.
(() => {
  if (window.parent === window) return;

  // A flow root includes child margins in the measured content height.
  document.body.style.display = "flow-root";
  document.documentElement.style.overflow = "hidden";
  let lastHeight = 0;
  let pending = false;

  function reportHeight() {
    pending = false;
    const height = Math.ceil(document.body.getBoundingClientRect().height);
    if (height <= 0 || height === lastHeight) return;
    lastHeight = height;
    window.parent.postMessage({ type: "discovered-by-heart:resize", height }, "*");
  }

  function scheduleReport() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(reportHeight);
  }

  new ResizeObserver(scheduleReport).observe(document.body);
  window.addEventListener("load", scheduleReport);
  window.addEventListener("resize", scheduleReport);
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.data?.type !== "discovered-by-heart:measure") return;
    lastHeight = 0;
    scheduleReport();
  });
  if (document.fonts) document.fonts.ready.then(scheduleReport);
  scheduleReport();
})();
