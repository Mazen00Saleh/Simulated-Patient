import { useEffect } from 'react';

const useGlobalAnimations = () => {
  useEffect(() => {
    // 1. Intersection Observer for Scroll Animations
    const scrollElements = document.querySelectorAll('.animate-on-scroll');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    scrollElements.forEach(el => observer.observe(el));

    // 2. Custom Robust Smooth Scrolling for Anchor Links
    const handleAnchorClick = function (e) {
        const targetId = this.getAttribute('href');
        if (!targetId || targetId === '#' || targetId === '') return;
        
        // Only intercept hash links
        if (!targetId.startsWith('#')) return;

        e.preventDefault();
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            const nav = document.querySelector('.navbar');
            const navHeight = nav ? nav.offsetHeight : 80;
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;
            const startPosition = window.pageYOffset;
            const distance = targetPosition - startPosition;
            const duration = 600; // ms
            let start = null;

            window.requestAnimationFrame(function step(timestamp) {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                // easeInOutQuad
                const easeInOutQuad = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                const percentage = Math.min(progress / duration, 1);
                
                window.scrollTo(0, startPosition + distance * easeInOutQuad(percentage));
                
                if (progress < duration) {
                    window.requestAnimationFrame(step);
                }
            });
        }
    };

    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('click', handleAnchorClick);
    });

    // Optional Parallax
    const heroGlow = document.querySelector('.hero-bg-glow');
    const handleMouseMove = (e) => {
        if (!heroGlow) return;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        heroGlow.style.transform = `translate(-50%, 0) translate(${x * 20}px, ${y * 20}px)`;
    };
    
    window.addEventListener('mousemove', handleMouseMove);

    // Cleanup phase
    return () => {
        observer.disconnect();
        anchors.forEach(anchor => anchor.removeEventListener('click', handleAnchorClick));
        window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []); // Run once on mount
};

export default useGlobalAnimations;
