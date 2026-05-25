import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';
import './AdminPage.css';

const API_BASE = 'http://127.0.0.1:8000/api/v1/admin';

const AdminPage = () => {
    const { token } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [sessionDetail, setSessionDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchSessions();
    }, [token]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/sessions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            const data = await response.json();
            setSessions(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionDetail = async (id) => {
        if (selectedSessionId === id) return;
        setSelectedSessionId(id);
        setLoadingDetail(true);
        try {
            const response = await fetch(`${API_BASE}/sessions/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            const data = await response.json();
            setSessionDetail(data);
        } catch (err) {
            console.error('Failed to fetch session detail:', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const filteredSessions = sessions.filter(s => {
        const q = searchQuery.toLowerCase();
        const matchesQuery = s.session_id.toLowerCase().includes(q) || s.condition.toLowerCase().includes(q);
        const matchesFilter = filterType === 'all' ||
            (filterType === 'evaluated' && s.has_trainee_eval) ||
            (filterType === 'unevaluated' && !s.has_trainee_eval);
        return matchesQuery && matchesFilter;
    });

    const itemsPerPage = 6;
    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentSessions = filteredSessions.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType]);

    const totalSessions = sessions.length;
    const evaluatedCount = sessions.filter(s => s.has_trainee_eval).length;

    return (
        <div className="page-wrapper">
            <AppNavbar />
            <div className="admin-layout page-content">
                <aside className="sidebar admin-sidebar">
                    <div className="sidebar-section">
                        <div className="section-heading">Dashboard</div>
                        <div className="admin-stats">
                            <div className="stat-card">
                                <div className="stat-value">{totalSessions}</div>
                                <div className="stat-label">Total Sessions</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{evaluatedCount}</div>
                                <div className="stat-label">Evaluated</div>
                            </div>
                        </div>
                    </div>
                    <div className="sidebar-section">
                        <div className="section-heading">Filter</div>
                        <input
                            className="form-input"
                            type="text"
                            placeholder="Search session ID or condition…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ marginBottom: '10px' }}
                        />
                        <div className="filter-row">
                            <label className="form-label">Show</label>
                            <select
                                className="form-input"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All sessions</option>
                                <option value="evaluated">Evaluated only</option>
                                <option value="unevaluated">Unevaluated only</option>
                            </select>
                        </div>
                        <button className="btn btn-primary" onClick={fetchSessions} style={{ marginTop: '14px', width: '100%' }}>
                            ⟳ Refresh
                        </button>
                    </div>
                </aside>

                <main className="main-panel admin-main">
                    <nav className="tab-nav">
                        <button className="tab-btn active">📋 Session History</button>
                    </nav>

                    <div className="tab-pane active">
                        <div className="admin-split">
                            <div className="sessions-list-panel">
                                <div className="sessions-list-header">
                                    <span className="section-heading" style={{ margin: 0 }}>Sessions</span>
                                    <span className="session-count">{filteredSessions.length} sessions</span>
                                </div>
                                <div className="sessions-list">
                                    {loading ? (
                                        <div className="admin-empty-state">
                                            <div className="spinner"></div>
                                            <p>Loading sessions…</p>
                                        </div>
                                    ) : filteredSessions.length === 0 ? (
                                        <div className="admin-empty-state">
                                            <div className="empty-icon">🔍</div>
                                            <p>No sessions match your filter.</p>
                                        </div>
                                    ) : (
                                        currentSessions.map(s => (
                                            <SessionCard
                                                key={s.session_id}
                                                session={s}
                                                isSelected={selectedSessionId === s.session_id}
                                                onClick={() => fetchSessionDetail(s.session_id)}
                                            />
                                        ))
                                    )}
                                </div>
                                {totalPages > 1 && (
                                    <div className="admin-pagination">
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            &laquo; Prev
                                        </button>
                                        <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next &raquo;
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="session-detail-panel">
                                {loadingDetail ? (
                                    <div className="admin-empty-state">
                                        <div className="spinner"></div>
                                    </div>
                                ) : sessionDetail ? (
                                    <SessionDetail data={sessionDetail} />
                                ) : (
                                    <div className="admin-empty-state detail-empty">
                                        <div className="empty-icon">📂</div>
                                        <h3>Select a session</h3>
                                        <p>Choose a session from the list to view the full conversation and evaluation results.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <AppFooter />
        </div>
    );
};

const SessionCard = ({ session, isSelected, onClick }) => {
    const shortId = session.session_id.slice(0, 8);
    const lang = session.language || 'English';
    const langClass = lang === 'Arabic' ? 'lang-ar' : 'lang-en';
    const date = session.created_at ? new Date(session.created_at).toLocaleString() : '—';

    return (
        <div className={`session-card ${isSelected ? 'selected' : ''}`} onClick={onClick}>
            <div className="session-card-top">
                <span className="session-condition">{session.condition}</span>
                <span className={`session-lang-badge ${langClass}`}>{lang}</span>
            </div>
            <div className="session-card-meta">
                <span className="session-id-short">{shortId}…</span>
                <span>·</span>
                <span>{date}</span>
            </div>
            <div className="session-card-badges">
                <span className={`eval-pill ${session.has_trainee_eval ? 'has-eval' : 'no-eval'}`}>
                    {session.has_trainee_eval ? '✓ Evaluated' : '○ Not evaluated'}
                </span>
                <span className="msg-count-badge">💬 {session.message_count} msg{session.message_count !== 1 ? 's' : ''}</span>
            </div>
        </div>
    );
};

const SessionDetail = ({ data }) => {
    const { session, messages, evaluations, case: caseData } = data;
    const lang = session.language || 'English';
    const langClass = lang === 'Arabic' ? 'lang-ar' : 'lang-en';
    const created = session.created_at ? new Date(session.created_at).toLocaleString() : '—';
    const expires = session.expires_at ? new Date(session.expires_at).toLocaleString() : '—';

    const traineeEvals = evaluations.filter(e => e.eval_type === 'trainee');
    const patientEvals = evaluations.filter(e => e.eval_type === 'patient');

    let personaData = null;
    if (session.profile) {
        try {
            personaData = typeof session.profile === 'string' ? JSON.parse(session.profile) : session.profile;
        } catch (e) {
            console.error("Failed to parse persona profile", e);
        }
    }

    return (
        <>
            <div className="detail-header">
                <div className="detail-title-row">
                    <span className="detail-condition">{session.condition}</span>
                    <span className={`session-lang-badge ${langClass}`}>{lang}</span>
                    {traineeEvals.length > 0 ? (
                        <span className="eval-pill has-eval">✓ Evaluated</span>
                    ) : (
                        <span className="eval-pill no-eval">○ Not evaluated</span>
                    )}
                </div>
                <div className="detail-meta">
                    Session: {session.session_id} &nbsp;·&nbsp; Created: {created} &nbsp;·&nbsp; Expires: {expires}
                </div>
            </div>

            <div className="detail-body">
                {personaData && (
                    <CollapsibleSection title="🎭 Patient Persona" defaultOpen={true}>
                        <PatientPersonaView persona={personaData} />
                    </CollapsibleSection>
                )}

                {caseData && (
                    <CollapsibleSection title="📄 Patient Case" defaultOpen={false}>
                        <CaseDetailView caseData={caseData} />
                    </CollapsibleSection>
                )}

                <CollapsibleSection title="💬 Conversation" defaultOpen={true}>
                    <ConversationView messages={messages} />
                </CollapsibleSection>

                <CollapsibleSection title="📋 Trainee Evaluation">
                    {traineeEvals.length > 0 ? (
                        <TraineeEvalView evaluation={traineeEvals[traineeEvals.length - 1]} />
                    ) : (
                        <div className="admin-empty-state" style={{ padding: '1.5rem' }}>
                            <p>No trainee evaluation recorded for this session.</p>
                        </div>
                    )}
                </CollapsibleSection>

                <CollapsibleSection title="🩺 Patient Evaluation">
                    {patientEvals.length > 0 ? (
                        <PatientEvalView evaluation={patientEvals[patientEvals.length - 1]} />
                    ) : (
                        <div className="admin-empty-state" style={{ padding: '1.5rem' }}>
                            <p>No patient evaluation recorded for this session.</p>
                        </div>
                    )}
                </CollapsibleSection>
            </div>
        </>
    );
};

const PatientPersonaView = ({ persona }) => {
    return (
        <div className="eval-detail-block patient-persona-view">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="info-item">
                    <span className="info-label">Age / Gender:</span>
                    <span className="info-value">{persona.age} / {persona.gender}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Occupation:</span>
                    <span className="info-value">{persona.occupation}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Tone / Style:</span>
                    <span className="info-value">{persona.emotional_tone} / {persona.response_style}</span>
                </div>
                {persona.risk_positive && (
                    <div className="info-item">
                        <span className="info-label" style={{ color: '#ef4444' }}>⚠️ Risk Positive</span>
                        <span className="info-value" style={{ color: '#ef4444' }}>{persona.risk_detail || 'Yes'}</span>
                    </div>
                )}
            </div>

            <div className="persona-section">
                <h4>Chief Complaint</h4>
                <p>{persona.chief_complaint || 'None'}</p>
            </div>

            <div className="persona-section">
                <h4>Symptom History</h4>
                <p><strong>Onset:</strong> {persona.symptom_onset}</p>
                <p><strong>Severity:</strong> {persona.symptom_severity}</p>
            </div>

            <div className="persona-section">
                <h4>Background</h4>
                <p><strong>Relevant Life Events:</strong> {Array.isArray(persona.relevant_life_events) ? persona.relevant_life_events.join(', ') : persona.relevant_life_events || 'None'}</p>
                <p><strong>Past Psychiatric History:</strong> {persona.past_psychiatric_history || 'None'}</p>
                <p><strong>Substance Use:</strong> {persona.substance_use || 'None'}</p>
            </div>

            <div className="persona-section">
                <h4>Disclosure Dynamics</h4>
                <p><strong>Freely Disclose:</strong> {Array.isArray(persona.freely_disclose) ? persona.freely_disclose.join(', ') : 'None'}</p>
                <p><strong>If Asked:</strong> {Array.isArray(persona.disclose_if_asked) ? persona.disclose_if_asked.join(', ') : 'None'}</p>
                <p><strong>Resist:</strong> {Array.isArray(persona.resist_disclosing) ? persona.resist_disclosing.join(', ') : 'None'}</p>
            </div>
        </div>
    );
};

const CaseDetailView = ({ caseData }) => {
    return (
        <div className="eval-detail-block case-detail-view">
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{caseData.title}</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{caseData.subtitle}</p>
            </div>

            <div className="case-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="info-item">
                    <span className="info-label">Condition:</span>
                    <span className="info-value">{caseData.condition}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Difficulty:</span>
                    <span className="info-value">{caseData.difficulty}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Duration:</span>
                    <span className="info-value">{caseData.duration} min</span>
                </div>
            </div>

            <div className="case-section" style={{ marginBottom: '1.2rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Objective</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{caseData.objective}</p>
            </div>

            <div className="case-section" style={{ marginBottom: '1.2rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Dynamics</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>{caseData.dynamics}</p>
            </div>

            {caseData.patient_cues && (
                <div className="case-section">
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Patient Cues</h4>
                    <pre style={{ margin: 0, fontSize: '0.8rem', background: '#f8f9fa', padding: '0.75rem', borderRadius: '0.5rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(caseData.patient_cues, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="detail-section">
            <div className="detail-section-header" onClick={() => setIsOpen(!isOpen)}>
                <span className="detail-section-title">{title}</span>
                <span className={`detail-section-chevron ${isOpen ? 'open' : ''}`}>▶</span>
            </div>
            <div className={`detail-section-body ${isOpen ? 'open' : ''}`} style={{ maxHeight: isOpen ? 'none' : '0' }}>
                {children}
            </div>
        </div>
    );
};

const ConversationView = ({ messages }) => {
    const visible = messages.filter(m => m.role !== 'system');
    if (visible.length === 0) {
        return (
            <div className="admin-empty-state" style={{ padding: '1.5rem' }}>
                <p>No messages in this session.</p>
            </div>
        );
    }
    return (
        <div className="convo-view">
            {visible.map((m, idx) => (
                <div key={idx} className={`convo-bubble ${m.role}`}>
                    <div className="bubble-role">{m.role}</div>
                    {m.content}
                </div>
            ))}
        </div>
    );
};

const TraineeEvalView = ({ evaluation }) => {
    const sd = evaluation.score_data || {};
    const pct = typeof sd.percent === 'number' ? (sd.percent * 100).toFixed(1) : '—';
    const passed = sd.pass;
    const total = sd.total_score ?? '—';
    const possible = sd.total_possible ?? '—';
    const items = sd.items || [];
    const feedback = sd.summary_feedback || [];

    return (
        <div className="eval-detail-block">
            <div className="eval-score-banner">
                <div className={`eval-score-big ${passed ? 'pass' : 'fail'}`}>{pct}%</div>
                <div className="eval-score-info">
                    <div className="eval-score-label">Score</div>
                    <div className="eval-score-detail">{total} / {possible} points</div>
                </div>
                <span className={`eval-pass-badge ${passed ? 'pass' : 'fail'}`}>
                    {passed ? 'PASS' : 'FAIL'}
                </span>
            </div>

            {items.length > 0 && (
                <table className="rubric-table">
                    <thead>
                        <tr>
                            <th style={{ width: '36px' }}></th>
                            <th>Criterion</th>
                            <th style={{ width: '60px' }}>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it, idx) => (
                            <tr key={idx}>
                                <td>
                                    <div className={`rubric-check ${it.achieved ? 'achieved' : 'missed'}`}>
                                        {it.achieved ? '✓' : '✗'}
                                    </div>
                                </td>
                                <td>{it.desc || it.id || ''}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {it.points_awarded ?? 0}/{it.weight ?? 1}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {feedback.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                    <div className="section-heading" style={{ marginBottom: '8px' }}>Feedback</div>
                    <ul className="feedback-list">
                        {feedback.map((f, idx) => (
                            <li key={idx} className="feedback-item">{f}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const PatientEvalView = ({ evaluation }) => {
    const sd = evaluation.score_data || {};
    const metrics = sd.metrics || [];
    if (metrics.length === 0) {
        return (
            <div className="admin-empty-state" style={{ padding: '1.5rem' }}>
                <p>No metric data available.</p>
            </div>
        );
    }

    return (
        <div className="eval-detail-block">
            <table className="rubric-table">
                <thead>
                    <tr>
                        <th style={{ width: '36px' }}></th>
                        <th>Metric</th>
                        <th style={{ width: '70px' }}>Score</th>
                        <th style={{ width: '70px' }}>Threshold</th>
                    </tr>
                </thead>
                <tbody>
                    {metrics.map((m, idx) => (
                        <tr key={idx}>
                            <td>
                                <div className={`rubric-check ${m.passed ? 'achieved' : 'missed'}`}>
                                    {m.passed ? '✓' : '✗'}
                                </div>
                            </td>
                            <td>{m.name || m.class || ''}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {m.score != null ? Number(m.score).toFixed(2) : '—'}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {m.threshold != null ? Number(m.threshold).toFixed(2) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminPage;
