import { useState } from 'react';

const Hero = () => {
  const [hasHovered, setHasHovered] = useState(false);

  return (
    <header className="hero">
      <div className="hero-bg-glow"></div>
      <div className="container hero-container">
        <div className="hero-content animate-on-scroll slide-up">
          <h1 className="hero-title">Train Future Mental Health Professionals with <span className="gradient-text">AI</span></h1>
          <p className="hero-subtitle">Start training with realistic patient conversations. Safe and easy-to-use practice for future mental health professionals.</p>
          <div className="hero-actions">
            <a href="#cta" className="btn btn-primary btn-lg">Start Practicing Now</a>
          </div>
        </div>
        <div className="hero-visual animate-on-scroll slide-in-right">
          <div
            className={`glass-panel main-dashboard ${hasHovered ? 'hover-fixed' : ''}`}
            style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onMouseEnter={() => setHasHovered(true)}
          >
            <div className="dashboard-header" style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div className="dots">
                <span></span><span></span><span></span>
              </div>
              <div className="dashboard-title">Simulated Patient Demo</div>
            </div>
            <div className="video-container" style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
              <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                src="https://www.youtube-nocookie.com/embed/3JbBbY4S11w?si=GnqTx_496DiZUfcY"
                title="Simulated Patient Demo"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen>
              </iframe>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Hero;
