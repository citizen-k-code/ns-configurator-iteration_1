
class HeaderNavigation {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.addBodyClass();
    }

    setupEventListeners() {
        const hamburgerBtn = document.getElementById('hamburger-menu');
        const navOverlay = document.getElementById('nav-overlay');
        const navClose = document.getElementById('nav-close');

        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', () => this.toggleMenu());
        }

        if (navOverlay) {
            navOverlay.addEventListener('click', () => this.closeMenu());
        }

        if (navClose) {
            navClose.addEventListener('click', () => this.closeMenu());
        }

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        });

        // Close menu on link click (mobile)
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024) {
                    this.closeMenu();
                }
            });
        });
    }

    toggleMenu() {
        const hamburgerBtn = document.getElementById('hamburger-menu');
        const navOverlay = document.getElementById('nav-overlay');
        const navMenu = document.getElementById('nav-menu');

        hamburgerBtn.classList.toggle('active');
        navOverlay.classList.toggle('active');
        navMenu.classList.toggle('active');

        // Prevent body scroll when menu is open
        if (navMenu.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    closeMenu() {
        const hamburgerBtn = document.getElementById('hamburger-menu');
        const navOverlay = document.getElementById('nav-overlay');
        const navMenu = document.getElementById('nav-menu');

        hamburgerBtn.classList.remove('active');
        navOverlay.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
    }

    addBodyClass() {
        document.body.classList.add('has-header');
    }
}

// Initialize header navigation
document.addEventListener('DOMContentLoaded', () => {
    new HeaderNavigation();
});
