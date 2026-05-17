import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../../context/SessionContext';

const API = '/api/v1';

const TraineeEvalTab = () => {
    const { sessionId, isActive, endSession, evalResults, setEvalResults } = useSession();
    const [judgeModel, setJudgeModel] = useState('');
    const [rubricPath, setRubricPath] = useState('rubrics/psychiatry_intake.json');
    const [judgeTemp, setJudgeTemp] = useState(0);
    const [strictSchema, setStrictSchema] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState(null);
    const [selectedRationale, setSelectedRationale] = useState(null);
    const hasRun = useRef(false);

    const handleRun = useCallback(async () => {
        if (!sessionId) return;
        setIsRunning(true);
        setError(null);
        setEvalResults(null);

        await endSession();

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
                setEvalResults(data);
            } else {
                setError(data.detail || 'Evaluation failed');
            }
        } catch (err) {
            setError('Network error — check if the server is running.');
        } finally {
            setIsRunning(false);
        }
    }, [sessionId, rubricPath, judgeModel, judgeTemp, strictSchema, endSession]);

    useEffect(() => {
        if (sessionId && !hasRun.current && !evalResults) {
            hasRun.current = true;
            handleRun();
        }
    }, [sessionId, handleRun, evalResults]);

    const renderResults = (data) => {
        const pct = Math.round((data.percent || 0) * 100);
        const isPass = data.pass;
        const mainColor = isPass ? 'var(--success)' : 'var(--danger)';
        const bgColor = isPass ? 'var(--success-light)' : 'var(--warning-light)';

        return (
            <div className="sp-eval-results-grid">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    <div className="sp-section-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${mainColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: mainColor, lineHeight: 1 }}>{pct}%</div>
                            <div>
                                <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                    {isPass ? 'Requirements Met' : 'Requirements Not Met'}
                                </strong>
                                <span style={{ color: 'var(--text-muted)' }}>Score: {data.total_score ?? '?'} / {data.total_possible ?? '?'}</span>
                            </div>
                        </div>
                        <div style={{ padding: '0.5rem 1.5rem', borderRadius: '2rem', background: bgColor, color: mainColor, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1px', border: `1px solid ${mainColor}` }}>
                            {isPass ? 'PASS' : 'FAIL'}
                        </div>
                    </div>

                    {data.summary_feedback && data.summary_feedback.length > 0 && (
                        <div className="sp-section-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📝</span> Reviewer Feedback
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {data.summary_feedback.map((s, idx) => (
                                    <li key={idx} style={{ lineHeight: 1.5 }}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {data.flags && data.flags.length > 0 && (
                    <div className="sp-section-card">
                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>⚠️</span> Flags ({data.flags.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {data.flags.map((f, idx) => (
                                <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-light)', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
                                    {f.type !== 'safety_critical' && (
                                        <strong style={{ color: 'var(--text-main)', marginRight: '0.5rem' }}>{f.type}:</strong>
                                    )}
                                    <span style={{ color: 'var(--text-muted)' }}>{f.message}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.items && data.items.length > 0 && (
                    <div className="sp-section-card" style={{ overflowX: 'auto' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>📋</span> Evaluation Checklist
                        </div>
                        <table className="sp-eval-table">
                            <thead>
                                <tr style={{ borderBottom: '2px solid #E5E7EB', color: 'var(--text-muted)' }}>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Points</th>
                                    <th>Rationale</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item, idx) => {
                                    let statusIcon, statusText, statusColor;
                                    if (!item.included) {
                                        statusIcon = '—';
                                        statusText = 'Gated';
                                        statusColor = 'var(--text-muted)';
                                    } else if (item.item_score === 2) {
                                        statusIcon = '✅';
                                        statusText = 'Met';
                                        statusColor = 'var(--success)';
                                    } else if (item.item_score === 1) {
                                        statusIcon = '⚠️';
                                        statusText = 'Partial';
                                        statusColor = 'var(--warning)';
                                    } else {
                                        statusIcon = '❌';
                                        statusText = 'Not Shown';
                                        statusColor = 'var(--danger)';
                                    }

                                    const desc = (item.desc || item.id || '').slice(0, 60) + ((item.desc || item.id || '').length > 60 ? '…' : '');
                                    const rationale = (item.rationale || '').slice(0, 80) + ((item.rationale || '').length > 80 ? '…' : '');

                                    return (
                                        <tr key={idx}>
                                            <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>{desc}</td>
                                            <td style={{ color: statusColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                {statusIcon} {statusText}
                                            </td>
                                            <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                                                {item.points_awarded ?? 0} / {item.weight ?? 1}
                                            </td>
                                            <td>
                                                {item.rationale ? (
                                                    <button
                                                        onClick={() => setSelectedRationale(item)}
                                                        className="sp-rationale-btn"
                                                    >
                                                        {rationale}
                                                    </button>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
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
        <>
            {error && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '0.5rem', border: '1px solid var(--warning)' }}>
                    <strong>Error:</strong> {error}
                </div>
            )}

            {isRunning && !evalResults && !error && (
                <div className="sp-section-card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
                    <svg className="eval-spinner" style={{ width: '48px', height: '48px', color: 'var(--primary)', marginBottom: '1.5rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h4 style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>Analyzing Session...</h4>
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '450px', lineHeight: 1.6 }}>
                        Please wait while we evaluate your performance. This usually takes a few moments.
                    </p>
                </div>
            )}

            {evalResults && (
                <div style={{ marginTop: '2rem' }}>
                    <div className="sp-card-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid #E5E7EB', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Evaluation Results</h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Session: {evalResults.session_id?.slice(0, 8)}…</span>
                    </div>
                    {renderResults(evalResults)}
                </div>
            )}

            {/* Rationale Modal */}
            {selectedRationale && createPortal(
                <div className="sp-modal-overlay">
                    <div className="sp-modal-backdrop" onClick={() => setSelectedRationale(null)}></div>
                    <div className="sp-modal-content">
                        <div className="sp-modal-header">
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 600 }}>{selectedRationale.id}</h3>
                            <button className="sp-modal-close" onClick={() => setSelectedRationale(null)}>✕</button>
                        </div>
                        <div className="sp-modal-body">
                            <div>
                                <strong style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Description</strong>
                                <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.6 }}>{selectedRationale.desc}</p>
                            </div>
                            <div className="sp-modal-field">
                                <strong style={{ display: 'block', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>Full Rationale</strong>
                                <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.6 }}>{selectedRationale.rationale}</p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .eval-spinner {
                        animation: spin 1s linear infinite;
                    }
                `}
            </style>
        </>
    );
};

export default TraineeEvalTab;
