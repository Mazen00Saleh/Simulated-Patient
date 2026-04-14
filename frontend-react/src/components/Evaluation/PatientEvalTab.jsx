import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';

const API = '/api/v1';

const PatientEvalTab = () => {
    const { sessionId, isActive } = useSession();
    const [roleThresh, setRoleThresh] = useState(0.7);
    const [convoThresh, setConvoThresh] = useState(0.7);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleRun = async () => {
        if (!sessionId) return;
        setIsRunning(true);
        setError(null);
        setResults(null);

        try {
            const response = await fetch(`${API}/eval/patient`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    role_adherence_threshold: parseFloat(roleThresh),
                    convo_quality_threshold: parseFloat(convoThresh)
                })
            });

            const data = await response.json();
            if (response.ok) {
                setResults(data);
            } else {
                setError(data.detail || 'Evaluation failed');
            }
        } catch (err) {
            setError('Network error — check if the server is running.');
        } finally {
            setIsRunning(false);
        }
    };

    const renderMetrics = (metrics) => {
        const passCount = metrics.filter(m => m.passed).length;
        const total = metrics.length;

        return (
            <div className="eval-results">
                <div className="score-summary">
                    <div className={`score-number neutral`}>{passCount}/{total}</div>
                    <div className="score-details">
                        <strong>Metrics Passed</strong>
                        <p>Patient evaluation completed</p>
                    </div>
                    <span className={`pass-badge ${passCount === total ? 'pass' : 'fail'}`}>
                        {passCount === total ? 'ALL PASSED' : 'SOME FAILED'}
                    </span>
                </div>
                <div className="metric-grid">
                    {metrics.map((m, idx) => {
                        const pct = Math.round((m.score || 0) * 100);
                        return (
                            <div key={idx} className={`metric-card ${m.passed ? 'pass-card' : 'fail-card'}`}>
                                <div className="metric-header">
                                    <div className="metric-name">{m.name || m.class}</div>
                                    <div className={`metric-score ${m.passed ? 'pass' : 'fail'}`}>{pct}%</div>
                                </div>
                                {m.reason && <div className="metric-reason">{m.reason}</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="eval-tab-content">
            <div className="eval-panel">
                <div className="eval-config-area">
                    <h2 className="eval-title">Patient Evaluation</h2>
                    <p className="eval-desc">
                        Uses <strong>DeepEval</strong> to grade how well the simulated patient stayed in character and maintained conversation quality. Requires <code>OPENAI_API_KEY</code>.
                    </p>

                    <div className="config-grid">
                        <div>
                            <label className="field-label">Role Adherence Threshold</label>
                            <div className="slider-row">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={roleThresh}
                                    onChange={(e) => setRoleThresh(parseFloat(e.target.value))}
                                    className="slider"
                                />
                                <span className="slider-val">{roleThresh.toFixed(2)}</span>
                            </div>
                        </div>
                        <div>
                            <label className="field-label">Conversation Quality Threshold</label>
                            <div className="slider-row">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={convoThresh}
                                    onChange={(e) => setConvoThresh(parseFloat(e.target.value))}
                                    className="slider"
                                />
                                <span className="slider-val">{convoThresh.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary eval-run-btn"
                        onClick={handleRun}
                        disabled={!isActive || isRunning}
                    >
                        {isRunning ? 'Running…' : 'Run Patient Evaluation'}
                    </button>
                </div>

                {error && (
                    <div className="eval-results-area">
                        <div style={{ color: 'var(--danger)' }}>Error: {error}</div>
                    </div>
                )}

                {results && (
                    <div className="eval-results-area">
                        <div className="results-header">
                            <h3>Results</h3>
                            <span className="results-session-id">{results.session_id?.slice(0, 8)}…</span>
                        </div>
                        {renderMetrics(results.metrics)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientEvalTab;
