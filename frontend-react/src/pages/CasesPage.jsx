import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import CaseCard from '../components/CasesPage/CaseCard';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';
import './CasesPage.css';


const CasesPage = () => {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const tapeRef = useRef(null);
  const hintPlayed = useRef(false);

  // Fetch cases from API
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await fetch('/api/v1/cases');
        if (res.ok) {
          const data = await res.json();
          setCases(data);
        }
      } catch (err) {
        console.error('Failed to fetch cases:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  // Filter cases based on the search query
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase();
    return cases.filter(c => {
      const allText = [
        c.title,
        c.subtitle,
        c.difficulty,
        c.dynamics,
        c.objective,
        c.duration,
        ...(c.skills || [])
      ].join(' ').toLowerCase();
      return allText.includes(q);
    });
  }, [searchQuery, cases]);

  // Horizontal scroll controls
  const scrollTape = (direction) => {
    if (tapeRef.current) {
      const container = tapeRef.current;
      const cardNode = container.firstElementChild;
      if (cardNode) {
        const itemWidth = cardNode.offsetWidth + 32; // card width + 2rem gap
        const currentScroll = container.scrollLeft;
        // Find current snapped index, then increment/decrement
        const currentIndex = Math.round(currentScroll / itemWidth);
        const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
        
        container.scrollTo({ 
          left: nextIndex * itemWidth, 
          behavior: 'smooth' 
        });
      }
    }
  };

  // Custom eased scroll animation using requestAnimationFrame
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const animateScroll = (container, from, to, duration) => {
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      container.scrollLeft = from + (to - from) * eased;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  // Scroll hint — gently peek-scrolls once after data loads, then stops on interaction
  useEffect(() => {
    if (hintPlayed.current || cases.length === 0) return;

    const raf = requestAnimationFrame(() => {
      const container = tapeRef.current;
      if (!container) return;

      let hintTimeout;
      let backTimeout;

      const cancelHint = () => {
        clearTimeout(hintTimeout);
        clearTimeout(backTimeout);
      };

      container.addEventListener('mouseenter', cancelHint, { once: true });
      container.addEventListener('touchstart', cancelHint, { once: true });

      hintTimeout = setTimeout(() => {
        if (!tapeRef.current || hintPlayed.current) return;
        hintPlayed.current = true;

        // Disable snap, animate peek forward
        container.style.scrollSnapType = 'none';
        animateScroll(container, 0, 250, 700);

        backTimeout = setTimeout(() => {
          if (!tapeRef.current) return;
          // Animate back to 0
          animateScroll(container, 250, 0, 700);
          // Re-enable snap after animation settles
          setTimeout(() => {
            if (tapeRef.current) container.style.scrollSnapType = '';
          }, 750);
        }, 900);
      }, 1500);

      return () => cancelHint();
    });

    return () => cancelAnimationFrame(raf);
  }, [cases]);

  // Always scroll to top when page mounts 
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  return (
    <div className="bg-light page-transition page-wrapper">

      {/* Top Dashboard Header */}
      <AppNavbar />

      {/* Sleek Full-width Promo Banner */}
      {!isAuthenticated && (
        <div className="promo-banner-container" style={{ borderBottom: '1px solid rgba(26, 86, 219, 0.15)' }}>
          <div className="container promo-banner-content animate-on-scroll is-visible slide-up" style={{ padding: '2.5rem 1.5rem' }}>
            <div className="promo-banner-text-wrapper">
              <h3 className="promo-banner-title gradient-text" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Track Your Progress
              </h3>
              <p className="promo-banner-subtitle" style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>
                Create an account to automatically save your simulated case sessions!
              </p>
            </div>
            <div className="promo-banner-actions">
              <Link to="/login" className="btn btn-primary" style={{ padding: '0.85rem 2rem', borderRadius: '999px', fontWeight: 600 }}>
                Log In / Register
              </Link>
            </div>
          </div>
        </div>
      )}


      <div className="container cases-content-container" style={{ paddingBottom: '4rem' }}>

        <div className="cases-hero animate-on-scroll is-visible slide-up">
          <h1 className="cases-hero-title">Select a Patient Case</h1>
          <p className="cases-hero-subtitle">
            Choose a clinical scenario below to begin your simulated interview session. Explore diverse cases across various difficulties to hone your diagnostic skills.
          </p>
        </div>

        <div className="cases-search-wrapper animate-on-scroll is-visible slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="cases-search-container">
            <span className="cases-search-icon">🔍</span>
            <input
              type="text"
              className="cases-search-input"
              placeholder="Search cases by title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* News Tape Slider */}
        {filteredCases.length > 0 ? (
          <div className="cases-tape-wrapper animate-on-scroll is-visible slide-in-bottom" style={{ animationDelay: '0.2s' }}>
            <button className="tape-scroll-btn tape-scroll-left" onClick={() => scrollTape('left')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>

            <div className="cases-tape-container" ref={tapeRef}>
              {filteredCases.map((caseItem) => (
                <div key={caseItem.id} className="cases-tape-item">
                  <CaseCard data={caseItem} />
                </div>
              ))}
            </div>

            <button className="tape-scroll-btn tape-scroll-right" onClick={() => scrollTape('right')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <h4>No cases match your search.</h4>
            <p>Try adjusting your keywords.</p>
          </div>
        )}

      </div>

      <AppFooter />
    </div>
  );
};

export default CasesPage;
