const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <span className="logo-text">PsychSim <span className="text-primary">Intake</span></span>
          <p style={{ lineHeight: '1.7' }}>Empowering the next generation of mental health professionals through advanced AI simulation.</p>
        </div>
        <div className="footer-links">
          <h4>About Us</h4>
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#roadmap">Roadmap</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>&copy; 2026 PsychSim Intake. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
