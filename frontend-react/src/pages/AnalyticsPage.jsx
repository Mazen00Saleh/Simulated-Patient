import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AppNavbar from '../components/AppNavbar';
import './AnalyticsPage.css';

const API = '/api/v1';

const AnalyticsPage = () => {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch(`${API}/admin/analytics`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error('Failed to fetch analytics');
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [token]);

    if (loading) {
        return (
            <div className="analytics-page">
                <AppNavbar />
                <div className="analytics-loading">
                    <div className="spinner" />
                    <p>Loading analytics…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="analytics-page">
                <AppNavbar />
                <div className="analytics-loading">
                    <p style={{ color: '#f87171' }}>Error: {error}</p>
                </div>
            </div>
        );
    }

    const { total_sessions, total_evaluated, overall_avg_score, overall_pass_rate, score_distribution, per_user, per_case, item_performance } = data;

    return (
        <div className="analytics-page">
            <AppNavbar />
            <div className="analytics-container">
                <div className="analytics-header">
                    <h1>📊 Analytics Dashboard</h1>
                    <p className="analytics-subtitle">Performance insights across all trainees and cases</p>
                </div>

                {/* Overview Cards */}
                <div className="analytics-overview">
                    <div className="overview-card">
                        <div className="overview-value">{total_sessions}</div>
                        <div className="overview-label">Total Sessions</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-value">{total_evaluated}</div>
                        <div className="overview-label">Evaluated</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-value">{(overall_avg_score * 100).toFixed(1)}%</div>
                        <div className="overview-label">Avg Score</div>
                    </div>
                    <div className="overview-card">
                        <div className="overview-value">{(overall_pass_rate * 100).toFixed(1)}%</div>
                        <div className="overview-label">Pass Rate</div>
                    </div>
                </div>

                {/* Score Distribution */}
                <div className="analytics-section">
                    <h2 className="section-title">Score Distribution</h2>
                    <div className="distribution-chart">
                        {Object.entries(score_distribution).map(([range, count]) => {
                            const maxCount = Math.max(...Object.values(score_distribution), 1);
                            const pct = (count / maxCount) * 100;
                            return (
                                <div key={range} className="dist-bar-group">
                                    <div className="dist-bar-wrapper">
                                        <div className="dist-bar" style={{ height: `${Math.max(pct, 4)}%` }}>
                                            <span className="dist-bar-count">{count}</span>
                                        </div>
                                    </div>
                                    <div className="dist-bar-label">{range}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="analytics-grid">
                    {/* Per-User Table */}
                    <div className="analytics-section">
                        <h2 className="section-title">Per-User Performance</h2>
                        {per_user.length === 0 ? (
                            <p className="analytics-empty">No user data available yet.</p>
                        ) : (
                            <div className="analytics-table-wrapper">
                                <table className="analytics-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Sessions</th>
                                            <th>Evals</th>
                                            <th>Avg Score</th>
                                            <th>Pass Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {per_user.map((u, idx) => (
                                            <tr key={idx}>
                                                <td className="user-cell">{u.user_id || 'Anonymous'}</td>
                                                <td>{u.session_count}</td>
                                                <td>{u.eval_count}</td>
                                                <td>
                                                    {u.avg_score != null ? (
                                                        <span className={`score-badge ${u.avg_score >= 0.6 ? 'good' : 'low'}`}>
                                                            {(u.avg_score * 100).toFixed(1)}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    {u.pass_rate != null ? (
                                                        <span className={`score-badge ${u.pass_rate >= 0.5 ? 'good' : 'low'}`}>
                                                            {(u.pass_rate * 100).toFixed(0)}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Per-Case Table */}
                    <div className="analytics-section">
                        <h2 className="section-title">Per-Case Performance</h2>
                        {per_case.length === 0 ? (
                            <p className="analytics-empty">No case data available yet.</p>
                        ) : (
                            <div className="analytics-table-wrapper">
                                <table className="analytics-table">
                                    <thead>
                                        <tr>
                                            <th>Case</th>
                                            <th>Sessions</th>
                                            <th>Evals</th>
                                            <th>Avg Score</th>
                                            <th>Pass Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {per_case.map((c, idx) => (
                                            <tr key={idx}>
                                                <td className="case-cell">{c.title}</td>
                                                <td>{c.session_count}</td>
                                                <td>{c.eval_count}</td>
                                                <td>
                                                    {c.avg_score != null ? (
                                                        <span className={`score-badge ${c.avg_score >= 0.6 ? 'good' : 'low'}`}>
                                                            {(c.avg_score * 100).toFixed(1)}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    {c.pass_rate != null ? (
                                                        <span className={`score-badge ${c.pass_rate >= 0.5 ? 'good' : 'low'}`}>
                                                            {(c.pass_rate * 100).toFixed(0)}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Item Performance */}
                <div className="analytics-section">
                    <h2 className="section-title">Rubric Item Performance</h2>
                    <p className="section-desc">Which skills do trainees struggle with the most?</p>
                    {item_performance.length === 0 ? (
                        <p className="analytics-empty">No evaluation data available yet.</p>
                    ) : (
                        <div className="item-performance-list">
                            {item_performance.map((item, idx) => (
                                <div key={idx} className="item-perf-row">
                                    <div className="item-perf-info">
                                        <span className="item-perf-id">{item.id}</span>
                                        <span className="item-perf-desc">{item.desc}</span>
                                    </div>
                                    <div className="item-perf-bar-wrapper">
                                        <div
                                            className={`item-perf-bar ${item.achievement_rate >= 0.6 ? 'good' : item.achievement_rate >= 0.3 ? 'mid' : 'low'}`}
                                            style={{ width: `${Math.max(item.achievement_rate * 100, 2)}%` }}
                                        />
                                    </div>
                                    <span className="item-perf-pct">{(item.achievement_rate * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
