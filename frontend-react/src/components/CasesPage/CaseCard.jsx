import { useNavigate } from 'react-router-dom';

const CaseCard = ({ data }) => {
  const { title, subtitle, difficulty, skills, dynamics, objective, duration } = data;
  const navigate = useNavigate();

  // Determine badge color class based on difficulty
  const badgeClass =
    difficulty.toLowerCase() === 'beginner' ? 'badge-success' :
      difficulty.toLowerCase() === 'advanced' ? 'badge-danger' :
        'badge-warning'; // default to yellow for intermediate or others

  const handleStart = () => {
    // Navigate to app page with condition and language as query parameters
    navigate(`/app?condition=${encodeURIComponent(title)}&language=English`);
  };

  return (
    <div className="feature-card case-card" onClick={handleStart} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      <div className={badgeClass} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '0.5rem',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
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

    </div>
  );
};

export default CaseCard;
