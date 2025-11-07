// Utils/mobile-menu.js
export class MobileMenu {
    constructor() {
        this.menuToggle = document.getElementById('menuToggle');
        this.mainNav = document.querySelector('.main-nav');
    }

    initialize() {
        if (!this.menuToggle || !this.mainNav) return;

        this.menuToggle.addEventListener('click', () => this.toggleMenu());
        this.addNavLinkListeners();
    }

    toggleMenu() {
        this.mainNav.classList.toggle('active');
        this.menuToggle.classList.toggle('active');
        this.animateMenuIcon();
    }

    animateMenuIcon() {
        const spans = this.menuToggle.querySelectorAll('span');
        if (this.mainNav.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
        }
    }

    addNavLinkListeners() {
        document.querySelectorAll('.main-nav a').forEach(link => {
            link.addEventListener('click', () => this.closeMenu());
        });
    }

    closeMenu() {
        this.mainNav.classList.remove('active');
        this.menuToggle.classList.remove('active');
        this.animateMenuIcon();
    }
}