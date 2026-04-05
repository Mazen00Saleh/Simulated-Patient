import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import CaseCard from '../components/CasesPage/CaseCard';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';
import { useAuth } from '../context/AuthContext';


import parsedCases from '../data/cases.json';


const CasesPage = () => {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter cases based on the search query
  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return parsedCases;
    const q = searchQuery.toLowerCase();
    return parsedCases.filter(c => {
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
  }, [searchQuery]);

  // Handle Pagination 
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCases.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset pagination when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
                Create a free account to automatically save your simulated cases sessions with the AI-driven performance feedback
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


      <div className="container cases-content-container" style={{ paddingTop: '4rem' }}>

        {/* Page Titles */}
        <div className="section-header center animate-on-scroll is-visible slide-up">
          <h2>Select a Patient Case</h2>
          <p>Choose a clinical scenario below to begin your simulated interview session.</p>
        </div>

        {/* Search Bar */}
        <div className="animate-on-scroll is-visible slide-up search-wrapper">
          <div className="search-input-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input-field"
              placeholder="Search cases by title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* CSS Grid layout mapping to 'layout-3' from index.css */}
        {filteredCases.length > 0 ? (
          <div className="grid layout-3 pattern-container animate-on-scroll is-visible slide-in-bottom">
            {currentItems.map((caseItem, index) => (
              <div key={caseItem.id} style={{ animationDelay: `${index * 0.05}s`, height: '100%' }} className="animate-on-scroll is-visible slide-up">
                <CaseCard data={caseItem} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h4>No cases match your search.</h4>
            <p>Try adjusting your keywords.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-wrapper">
            <button
              className={`btn btn-sm btn-outline ${currentPage === 1 ? 'pagination-btn-disabled' : 'pagination-btn-active'}`}
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button
              className={`btn btn-sm btn-outline ${currentPage === totalPages ? 'pagination-btn-disabled' : 'pagination-btn-active'}`}
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

      </div>

      <AppFooter />
    </div>
  );
};

export default CasesPage;
