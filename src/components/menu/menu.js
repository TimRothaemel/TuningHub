let isMenuOpen = false;

import { menuConfigs } from "./menu-configs"

function setMenuState(open) {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('overlay')
    const menubtn = document.getElementById('menu-btn')

    if (!sidebar || !overlay || !menubtn) {
        console.warn('[Menu] Required elements not found')
        return
    }

    isMenuOpen = !!open
    sidebar.classList.toggle('open', isMenuOpen)
    overlay.classList.toggle('show', isMenuOpen)
    menubtn.classList.toggle('active', isMenuOpen)
    menubtn.setAttribute('aria-expanded', String(isMenuOpen))
    overlay.setAttribute('aria-hidden', String(!isMenuOpen))
    sidebar.setAttribute('aria-hidden', String(!isMenuOpen))
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
}

function toggleMenu() {
    setMenuState(!isMenuOpen)
}

function setupEventListeners() {
    const menubtn = document.getElementById('menu-btn');
    const overlay = document.getElementById('overlay');
    const sidebar = document.getElementById('sidebar');

    if (!menubtn || !overlay || !sidebar) {
        console.warn('[Menu] Menu Button, Overlay oder Sidebar nicht gefunden');
        return false;
    }

    menubtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', () => setMenuState(false));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) setMenuState(false);
    });

    // Delegated Event Listener für dynamische Menu Items
    document.addEventListener('click', function (e) {
        if (e.target.closest('.menu-item')) {
            const menuItem = e.target.closest('.menu-item');
            const href = menuItem.getAttribute('href');
            const action = menuItem.dataset.action;

            if (action === 'logout') {
                e.preventDefault();
                if (typeof handleLogout === 'function') {
                    handleLogout();
                }
                setMenuState(false);
                return;
            }

            if (!href || href === '#') {
                e.preventDefault();
                const page = menuItem.dataset.page;
                if (page) {
                    window.location.href = `/src/pages/${page}.html`;
                }
            }

            setMenuState(false);
        }
    });

    console.log('[Menu] ✅ Event Listeners eingerichtet');
    return true;
}

document.addEventListener('headerLoaded', () => {
    console.log('[Menu] Header wurde geladen, initialisiere Menu...');
    setupEventListeners();
});