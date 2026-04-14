import React, { useState } from 'react';
import { useSession } from '../../context/SessionContext';

const API = '/api/v1';

const TraineeEvalTab = () => {
    const { sessionId, isActive } = useSession();
    const [judgeModel, setJudgeModel] = useState('');
    const [rubricPath, setRubricPath] = useState('rubrics/psychiatry_intake.json');
    const [judgeTemp, setJudgeTemp] = useState(0);
    const [strictSchema, setStrictSchema] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [selectedRationale, setSelectedRationale] = useState(null);

    const handleRun = async () => {
        if (!sessionId) return;
        setIsRunning(true);
        setError(null);
        setResults(null);

        try {
            const body = { session_id: sessionId };
            if (rubricPath.trim()) body.rubric_path = rubricPath.trim();
            if (judgeModel.trim()) body.judge_model = judgeModel.trim();

            const judgeConfig = {};
            if (judgeTemp > 0) judgeConfig.temperature = judgeTemp;
            judgeConfig.strict_schema = strictSchema;
            body.judge_config = judgeConfig;

            const response = await fetch(`${API}/eval/trainee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
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

    const renderResults = (data) => {
        const pct = Math.round((data.percent || 0) * 100);
        const passClass = data.pass ? 'pass' : 'fail';

        return (
            <div className="eval-results">
                <div className="score-summary">
                    <div className={`score-number ${passClass}`}>{pct}%</div>
                    <div className="score-details">
                        <strong>{data.pass ? 'Requirements Met' : 'Requirements Not Met'}</strong>
                        <p>Score: {data.total_score ?? '?'} / {data.total_possible ?? '?'}</p>
                    </div>
                    <span className={`pass-badge ${passClass}`}>{data.pass ? 'PASS' : 'FAIL'}</span>
                </div>

                {data.flags && data.flags.length > 0 && (
                    <div className="flags-section">
                        <h4>⚠ Flags ({data.flags.length})</h4>
                        {data.flags.map((f, idx) => (
                            <div key={idx} className="flag-item">
                                <span className="flag-type">{f.type}</span>: {f.message} <span style={{ opacity: 0.5 }}>[{f.item_id}]</span>
                            </div>
                        ))}
                    </div>
                )}

                {data.summary_feedback && data.summary_feedback.length > 0 && (
                    <div>
                        <div className="section-title">📝 Reviewer Feedback</div>
                        <ul className="feedback-list">
                            {data.summary_feedback.map((s, idx) => (
                                <li key={idx}>{s}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {data.items && data.items.length > 0 && (
                    <div>
                        <div className="section-title">📋 Rubric Checklist</div>
                        <table className="rubric-table">
                            <thead>
                                <tr>
                                    <th>Item ID</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Points</th>
                                    <th>Rationale</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item, idx) => {
                                    let statusIcon, statusText;
                                    if (!item.included) {
                                        statusIcon = '—';
                                        statusText = 'Gated';
                                    } else if (item.item_score === 2) {
                                        statusIcon = '✅';
                                        statusText = 'Met';
                                    } else if (item.item_score === 1) {
                                        statusIcon = '⚠️';
                                        statusText = 'Partial';
                                    } else {
                                        statusIcon = '❌';
                                        statusText = 'Not Shown';
                                    }

                                    const desc = (item.desc || item.id || '').slice(0, 60) + ((item.desc || item.id || '').length > 60 ? '…' : '');
                                    const rationale = (item.rationale || '').slice(0, 80) + ((item.rationale || '').length > 80 ? '…' : '');

                                    return (
                                        <tr key={idx}>
                                            <td><strong>{item.id}</strong></td>
                                            <td>{desc}</td>
                                            <td className="status-icon">{statusIcon} {statusText}</td>
                                            <td>{item.points_awarded ?? 0} / {item.weight ?? 1}</td>
                                            <td>
                                                {item.rationale ? (
                                                    <button
                                                        className="rationale-btn"
                                                        onClick={() => setSelectedRationale(item)}
                                                    >
                                                        {rationale}
                                                    </button>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="eval-tab-content">
            <div className="eval-panel">
                <div className="eval-config-area">
                    <h2 className="eval-title">Trainee Evaluation</h2>
                    <p className="eval-desc">
                        The <strong>LLM Judge</strong> grades the trainee's interview against the rubric, then the <strong>deterministic scorer</strong> calculates the final pass/fail score.
                    </p>

                    <div className="config-grid">
                        <div>
                            <label className="field-label">Judge Model <span className="hint">optional override</span></label>
                            <input
                                type="text"
                                className="field-input"
                                value={judgeModel}
                                onChange={(e) => setJudgeModel(e.target.value)}
                                placeholder="default judge model"
                            />
                        </div>
                        <div>
                            <label className="field-label">Rubric Path <span className="hint">optional override</span></label>
                            <input
                                type="text"
                                className="field-input"
                                value={rubricPath}
                                onChange={(e) => setRubricPath(e.target.value)}
                                placeholder="rubrics/psychiatry_intake.json"
                            />
                        </div>
                        <div>
                            <label className="field-label">Judge Temperature</label>
                            <div className="slider-row">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={judgeTemp}
                                    onChange={(e) => setJudgeTemp(parseFloat(e.target.value))}
                                    className="slider"
                                />
                                <span className="slider-val">{judgeTemp.toFixed(2)}</span>
                            </div>
                        </div>
                        <div>
                            <label className="field-label">Strict Schema</label>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={strictSchema}
                                    onChange={(e) => setStrictSchema(e.target.checked)}
                                />
                                <span className="toggle-track"></span>
                                <span className="toggle-label">Enabled</span>
                            </label>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary eval-run-btn"
                        onClick={handleRun}
                        disabled={!isActive || isRunning}
                    >
                        {isRunning ? 'Running…' : 'Run Trainee Evaluation'}
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
                        {renderResults(results)}
                    </div>
                )}
            </div>

            {/* Rationale Modal */}
            {selectedRationale && (
                <div className="rationale-modal">
                    <div className="rationale-modal-overlay" onClick={() => setSelectedRationale(null)}></div>
                    <div className="rationale-modal-content">
                        <div className="rationale-modal-header">
                            <h3>{selectedRationale.id}</h3>
                            <button className="rationale-modal-close" onClick={() => setSelectedRationale(null)}>✕</button>
                        </div>
                        <div className="rationale-modal-body">
                            <div className="rationale-field">
                                <strong>Description:</strong>
                                <p>{selectedRationale.desc}</p>
                            </div>
                            <div className="rationale-field">
                                <strong>Full Rationale:</strong>
                                <p>{selectedRationale.rationale}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TraineeEvalTab;
