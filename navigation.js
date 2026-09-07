// Native disclosures support mouse, touch, and keyboard without custom menu roles.
const siteHeader = document.querySelector('.site-header');
const folders = [...siteHeader.querySelectorAll('.nav-folder')];

// Hover applies only to desktop pointers; touch and keyboard retain native disclosure controls.
const hoverNavigation = window.matchMedia('(hover: hover) and (pointer: fine)');
folders.forEach((folder) => {
  folder.addEventListener('pointerenter', () => {
    if (!hoverNavigation.matches || !folder.closest('.desktop-nav')) return;
    folders.forEach((other) => { other.open = other === folder; });
  });
  folder.addEventListener('pointerleave', () => {
    if (!hoverNavigation.matches || !folder.closest('.desktop-nav')) return;
    if (!folder.contains(document.activeElement)) folder.open = false;
  });
  folder.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!folder.contains(document.activeElement) && !folder.matches(':hover')) folder.open = false;
    });
  });
});

siteHeader.addEventListener('click', (event) => {
  const summary = event.target.closest('.nav-folder > summary');
  if (!summary) return;
  folders.forEach((folder) => {
    if (folder !== summary.parentElement) folder.open = false;
  });
});

document.addEventListener('click', (event) => {
  if (siteHeader.contains(event.target)) return;
  siteHeader.querySelectorAll('details[open]').forEach((menu) => { menu.open = false; });
});

siteHeader.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const menu = event.target.closest('details[open]');
  if (!menu) return;
  event.preventDefault();
  menu.open = false;
  menu.querySelector('summary').focus();
});
