import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import CaseCard from '../components/CasesPage/CaseCard';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';


import parsedCases from '../data/cases.json';


const CasesPage = () => {
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
    <div className="bg-light page-transition" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Top Dashboard Header */}
      <AppNavbar />

      {/* Full-width Login Promo Banner */}
      <div
        className="promo-banner-container"
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, rgba(26, 86, 219, 0.08), rgba(126, 58, 242, 0.08))',
          borderBottom: '1px solid rgba(26, 86, 219, 0.1)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(26, 86, 219, 0.12), rgba(126, 58, 242, 0.12))'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(26, 86, 219, 0.08), rgba(126, 58, 242, 0.08))'}
      >

        <div className="container animate-on-scroll is-visible slide-up" style={{
          padding: '2rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div style={{ flex: '1 1 400px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem', animation: 'bounce 2s infinite ease-in-out' }}>📊</span> Track Your Clinical Progress
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.5', paddingRight: '2rem' }}>
              Create an account or log in to automatically save your finished cases, view transcripts, and receive AI-driven performance feedback on your interviews.
            </p>
          </div>
          <div style={{ marginRight: '2rem' }}>
            <Link
              to="/login"
              className="btn btn-primary btn-lg"
              style={{
                boxShadow: '0 10px 25px -5px rgba(26, 86, 219, 0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Log In / Register
            </Link>
          </div>
        </div>
      </div>


      <div className="container" style={{ paddingTop: '3rem', flexGrow: 1 }}>

        {/* Page Titles */}
        <div className="section-header center animate-on-scroll is-visible slide-up">
          <h2>Select a Patient Case</h2>
          <p>Choose a clinical scenario below to begin your simulated interview session.</p>
        </div>

        {/* Search Bar */}
        <div className="animate-on-scroll is-visible slide-up" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
            <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', zIndex: 10, filter: 'grayscale(100%) opacity(50%)' }}>🔍</span>
            <input
              type="text"
              placeholder="Search cases by title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '1.25rem 1.5rem 1.25rem 3.5rem',
                borderRadius: '999px',
                border: '1px solid rgba(26, 86, 219, 0.2)',
                boxShadow: '0 10px 25px -5px rgba(26, 86, 219, 0.1), 0 8px 10px -6px rgba(26, 86, 219, 0.1)',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: '1.05rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)'
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 20px 25px -5px rgba(26, 86, 219, 0.2), 0 8px 10px -6px rgba(26, 86, 219, 0.1)';
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = '0 10px 25px -5px rgba(26, 86, 219, 0.1), 0 8px 10px -6px rgba(26, 86, 219, 0.1)';
                e.target.style.borderColor = 'rgba(26, 86, 219, 0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
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
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <h4>No cases match your search.</h4>
            <p>Try adjusting your keywords.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '4rem',
            marginBottom: '6rem',
            padding: '0.75rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: '999px',
            boxShadow: '0 10px 25px -5px rgba(26, 86, 219, 0.1)',
            maxWidth: 'fit-content',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--dark)',
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handlePageChange(i + 1)}
                style={{
                  color: currentPage === i + 1 ? 'white' : 'var(--dark)'
                }}
              >
                {i + 1}
              </button>
            ))}

            <button
              className="btn btn-sm btn-outline"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--dark)',
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
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
