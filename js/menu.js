
document.addEventListener("DOMContentLoaded", () => {
  const menubtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  let isMenuOpen = false;

  if (!menubtn || !sidebar || !overlay) {
    console.warn("Menu: fehlende Elemente (menu-btn / sidebar / overlay)");
    return;
  }

  function setMenuState(open) {
    isMenuOpen = !!open;
    sidebar.classList.toggle('open', isMenuOpen);
    overlay.classList.toggle('show', isMenuOpen);
    menubtn.classList.toggle('active', isMenuOpen);
    menubtn.setAttribute('aria-expanded', String(isMenuOpen));
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
  }

  function toggleMenu() {
    setMenuState(!isMenuOpen);
  }

  // Events
  menubtn.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', () => setMenuState(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen) setMenuState(false);
  });

  // Menu-Items: wenn href="#" oder kein echtes href -> preventDefault und schließe menu
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      // Wenn Platzhalter-Link oder kein Link, verhindere Default
      if (!href || href === '#') {
        e.preventDefault();
        // optional: data-page auswerten
        const page = this.dataset.page;
        if (page) {
          // Beispiel: navigate
          window.location.href = `/html/${page}.html`;
        }
      }
      // Menü schließen nach Klick (bei Navigation ist das OK)
      setMenuState(false);
    });
  });

  // Optional: setze smooth scroll einmal (kein DOMContentLoaded nötig wenn defer)
  document.body.style.scrollBehavior = 'smooth';
});