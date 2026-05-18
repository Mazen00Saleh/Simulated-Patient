import { useNavigate } from 'react-router-dom';

const CaseCard = ({ data }) => {
  const { title, subtitle, difficulty, skills, dynamics, objective, duration, case_id, condition } = data;
  const navigate = useNavigate();

  // Determine badge color class based on difficulty
  const badgeClass =
    difficulty.toLowerCase() === 'beginner' ? 'badge-beginner' :
      difficulty.toLowerCase() === 'advanced' ? 'badge-advanced' :
        'badge-intermediate';

  const handleStart = () => {
    const cond = condition || title;
    navigate(`/app?case_id=${encodeURIComponent(case_id || '')}&condition=${encodeURIComponent(cond)}&language=English`);
  };

  return (
    <div className="case-card-premium" onClick={handleStart}>
      <div className="case-card-strip"></div>
      <div className="case-card-content">
        
        <div className="case-badge-container">
          <span className={`case-badge ${badgeClass}`}>{difficulty}</span>
          <span className="case-duration">⏳ {duration || '15 min'}</span>
        </div>

        <h4 className="case-card-title">{title}</h4>
        <div className="case-card-subtitle">{subtitle}</div>

        <div className="case-meta-group">
          
          <div className="case-meta-item">
            <div className="case-meta-icon">🎯</div>
            <div className="case-meta-text">
              <div className="case-meta-label">Objective</div>
              <div className="case-meta-value">{objective}</div>
            </div>
          </div>

          <div className="case-meta-item">
            <div className="case-meta-icon">🔄</div>
            <div className="case-meta-text">
              <div className="case-meta-label">Dynamics</div>
              <div className="case-meta-value">{dynamics}</div>
            </div>
          </div>

          {skills && skills.length > 0 && (
            <div className="case-meta-item">
              <div className="case-meta-icon">💡</div>
              <div className="case-meta-text">
                <div className="case-meta-label">Skills Focus</div>
                <div className="case-skills-tags">
                  {skills.slice(0, 3).map((skill, index) => (
                    <span key={index} className="case-skill-tag">{skill}</span>
                  ))}
                  {skills.length > 3 && (
                    <span className="case-skill-tag">+{skills.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="case-action-footer">
          <span>Start Session</span>
          <span className="case-action-arrow" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </span>
        </div>

      </div>
    </div>
  );
};

export default CaseCard;
