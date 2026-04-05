const CaseCard = ({ data }) => {
  const { icon, title, subtitle, difficulty, skills, dynamics, objective, duration } = data;

  // Determine badge color class based on difficulty
  const badgeClass =
    difficulty.toLowerCase() === 'beginner' ? 'badge-success' :
      difficulty.toLowerCase() === 'advanced' ? 'badge-danger' :
        'badge-warning'; // default to yellow for intermediate or others

  return (
    <div className="feature-card case-card">
      <div className={`badge ${badgeClass}`} style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {difficulty}
      </div>
      <div className="case-card-header">
        <h4>{title}</h4>
        <div className="case-card-subtitle">{subtitle}</div>
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Skills</div>
        <ul className="case-card-skills">
          {skills.map((skill, index) => (
            <li key={index}>{skill}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dynamics</div>
        <div className="case-card-dynamics">{dynamics}</div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Objective</div>
        <div className="case-card-objective">{objective}</div>
      </div>

      <div className="case-card-footer">
        <div className="case-duration">
          ⏱ {duration}
        </div>
        <button className="btn btn-sm btn-primary" style={{ borderRadius: '50px' }}>
          Start
        </button>
      </div>
    </div>
  );
};

export default CaseCard;
