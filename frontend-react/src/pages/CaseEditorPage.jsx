import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AppNavbar from '../components/AppNavbar';
import './CaseEditorPage.css';

const API = '/api/v1';

const EMPTY_RUBRIC_ITEM = {
    id: '',
    desc: '',
    weight: 1.0,
    gate: null,
    safety_critical: false,
    en_patterns: [''],
    ar_patterns: [''],
};

const EMPTY_CASE = {
    case_id: '',
    title: '',
    subtitle: '',
    difficulty: 'Beginner',
    skills: [''],
    dynamics: '',
    objective: '',
    duration: '15 min',
    condition: '',
    language: 'English',
    rubric: {
        rubric_id: '',
        version: '1.0.0',
        languages: ['en', 'ar'],
        pass_criteria: { min_percent: 0.6, fail_on_flags: ['SAFETY_CRITICAL'] },
        patient_cues: { risk_positive: { en: [''], ar: [''] } },
        items: [],
    },
};

const CaseEditorPage = () => {
    const { token } = useAuth();
    const [cases, setCases] = useState([]);
    const [selectedCaseId, setSelectedCaseId] = useState(null);
    const [caseData, setCaseData] = useState(JSON.parse(JSON.stringify(EMPTY_CASE)));
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch cases list
    const fetchCases = useCallback(async () => {
        try {
            const res = await fetch(`${API}/cases`);
            if (res.ok) {
                const data = await res.json();
                setCases(data);
            }
        } catch (err) {
            console.error('Failed to fetch cases:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCases(); }, [fetchCases]);

    // Load a specific case for editing
    const loadCase = async (caseId) => {
        try {
            const res = await fetch(`${API}/cases/${caseId}`);
            if (res.ok) {
                const data = await res.json();
                // Ensure rubric shape exists
                if (!data.rubric) {
                    data.rubric = JSON.parse(JSON.stringify(EMPTY_CASE.rubric));
                }
                if (!data.rubric.patient_cues) {
                    data.rubric.patient_cues = { risk_positive: { en: [''], ar: [''] } };
                }
                if (!data.rubric.pass_criteria) {
                    data.rubric.pass_criteria = { min_percent: 0.6, fail_on_flags: ['SAFETY_CRITICAL'] };
                }
                // Ensure each item has pattern arrays
                (data.rubric.items || []).forEach(item => {
                    if (!item.en_patterns) item.en_patterns = [''];
                    if (!item.ar_patterns) item.ar_patterns = [''];
                });
                setCaseData(data);
                setSelectedCaseId(caseId);
                setMessage(null);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load case.' });
        }
    };

    // Create new case
    const startNewCase = () => {
        setCaseData(JSON.parse(JSON.stringify(EMPTY_CASE)));
        setSelectedCaseId(null);
        setMessage(null);
    };

    // Save case
    const saveCase = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const method = selectedCaseId ? 'PUT' : 'POST';
            const url = selectedCaseId
                ? `${API}/admin/cases/${selectedCaseId}`
                : `${API}/admin/cases`;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(caseData),
            });

            if (res.ok) {
                const result = await res.json();
                setSelectedCaseId(result.case_id);
                setCaseData(prev => ({ ...prev, case_id: result.case_id }));
                setMessage({ type: 'success', text: `Case "${caseData.title}" saved successfully!` });
                fetchCases();
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.detail || 'Failed to save.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    // Delete case
    const deleteCase = async () => {
        if (!selectedCaseId) return;
        if (!window.confirm(`Delete case "${caseData.title}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`${API}/admin/cases/${selectedCaseId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Case deleted.' });
                startNewCase();
                fetchCases();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete.' });
        }
    };

    // ── Field helpers ──
    const updateField = (path, value) => {
        setCaseData(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            const keys = path.split('.');
            let obj = copy;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = isNaN(keys[i]) ? keys[i] : parseInt(keys[i]);
                obj = obj[key];
            }
            const lastKey = isNaN(keys[keys.length - 1]) ? keys[keys.length - 1] : parseInt(keys[keys.length - 1]);
            obj[lastKey] = value;
            return copy;
        });
    };

    // ── Rubric item helpers ──
    const addRubricItem = () => {
        setCaseData(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.rubric.items.push(JSON.parse(JSON.stringify(EMPTY_RUBRIC_ITEM)));
            return copy;
        });
    };

    const removeRubricItem = (idx) => {
        setCaseData(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.rubric.items.splice(idx, 1);
            return copy;
        });
    };

    const moveItem = (idx, dir) => {
        setCaseData(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            const items = copy.rubric.items;
            const newIdx = idx + dir;
            if (newIdx < 0 || newIdx >= items.length) return prev;
            [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
            return copy;
        });
    };

    // ── Pattern helpers ──
    const addPattern = (itemIdx, lang) => {
        setCaseData(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            const key = lang === 'en' ? 'en_patterns' : 'ar_patterns';
            copy.rubric.items[itemIdx][key].push('');
            return copy;
        });
    };

    const removePattern = (itemIdx, lang, patIdx) => {
        setCaseData(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            const key = lang === 'en' ? 'en_patterns' : 'ar_patterns';
            copy.rubric.items[itemIdx][key].splice(patIdx, 1);
            return copy;
        });
    };

    // ── Skills helpers ──
    const addSkill = () => updateField('skills', [...caseData.skills, '']);
    const removeSkill = (idx) => {
        const copy = [...caseData.skills];
        copy.splice(idx, 1);
        updateField('skills', copy);
    };

    const rubricJSON = JSON.stringify(caseData.rubric, null, 2);

    return (
        <div className="case-editor-page">
            <AppNavbar />
            <div className="case-editor-layout">
                {/* Sidebar - Case List */}
                <aside className="case-editor-sidebar">
                    <div className="sidebar-header">
                        <h3>Cases</h3>
                        <button className="btn btn-sm btn-primary" onClick={startNewCase}>+ New</button>
                    </div>
                    {loading ? (
                        <p className="sidebar-loading">Loading…</p>
                    ) : (
                        <div className="case-list">
                            {cases.map(c => (
                                <div
                                    key={c.case_id}
                                    className={`case-list-item ${selectedCaseId === c.case_id ? 'active' : ''}`}
                                    onClick={() => loadCase(c.case_id)}
                                >
                                    <div className="case-list-title">{c.title}</div>
                                    <div className="case-list-meta">
                                        <span className={`difficulty-dot ${c.difficulty?.toLowerCase()}`} />
                                        {c.difficulty}
                                    </div>
                                </div>
                            ))}
                            {cases.length === 0 && <p className="sidebar-loading">No cases yet.</p>}
                        </div>
                    )}
                </aside>

                {/* Main Editor */}
                <main className="case-editor-main">
                    {message && (
                        <div className={`editor-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* ── Case Metadata ── */}
                    <section className="editor-section">
                        <h2 className="editor-section-title">Case Info</h2>
                        <div className="editor-fields-grid">
                            <div className="editor-field">
                                <label>Title *</label>
                                <input value={caseData.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. Major Depression" />
                            </div>
                            <div className="editor-field">
                                <label>Subtitle</label>
                                <input value={caseData.subtitle} onChange={e => updateField('subtitle', e.target.value)} placeholder="e.g. Safety-Risk Screening" />
                            </div>
                            <div className="editor-field">
                                <label>Condition (for AI)</label>
                                <input value={caseData.condition} onChange={e => updateField('condition', e.target.value)} placeholder="e.g. Depression" />
                            </div>
                            <div className="editor-field">
                                <label>Difficulty</label>
                                <select value={caseData.difficulty} onChange={e => updateField('difficulty', e.target.value)}>
                                    <option>Beginner</option>
                                    <option>Intermediate</option>
                                    <option>Advanced</option>
                                </select>
                            </div>
                            <div className="editor-field">
                                <label>Duration</label>
                                <input value={caseData.duration} onChange={e => updateField('duration', e.target.value)} placeholder="15 min" />
                            </div>
                            <div className="editor-field">
                                <label>Dynamics</label>
                                <input value={caseData.dynamics} onChange={e => updateField('dynamics', e.target.value)} placeholder="Withdrawn • Hopeless" />
                            </div>
                        </div>
                        <div className="editor-field" style={{ marginTop: '1rem' }}>
                            <label>Objective</label>
                            <textarea value={caseData.objective} onChange={e => updateField('objective', e.target.value)} rows={2} placeholder="Describe the learning objective…" />
                        </div>

                        {/* Skills */}
                        <div className="editor-field" style={{ marginTop: '1rem' }}>
                            <label>Skills</label>
                            {(caseData.skills || []).map((skill, idx) => (
                                <div key={idx} className="inline-input-row">
                                    <input value={skill} onChange={e => {
                                        const copy = [...caseData.skills];
                                        copy[idx] = e.target.value;
                                        updateField('skills', copy);
                                    }} placeholder={`Skill ${idx + 1}`} />
                                    <button className="btn-icon danger" onClick={() => removeSkill(idx)}>×</button>
                                </div>
                            ))}
                            <button className="btn btn-sm btn-outline" onClick={addSkill}>+ Add Skill</button>
                        </div>
                    </section>

                    {/* ── Rubric Section ── */}
                    <section className="editor-section">
                        <div className="editor-section-header">
                            <h2 className="editor-section-title">Rubric</h2>
                            <button className="btn btn-sm btn-outline" onClick={() => setShowPreview(!showPreview)}>
                                {showPreview ? 'Hide JSON' : 'View JSON'}
                            </button>
                        </div>

                        {/* Pass Criteria */}
                        <div className="rubric-criteria">
                            <div className="editor-field small">
                                <label>Min Pass %</label>
                                <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    max="1"
                                    value={caseData.rubric?.pass_criteria?.min_percent || 0.6}
                                    onChange={e => updateField('rubric.pass_criteria.min_percent', parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="editor-field">
                                <label>Rubric Version</label>
                                <input
                                    value={caseData.rubric?.version || '1.0.0'}
                                    onChange={e => updateField('rubric.version', e.target.value)}
                                    placeholder="1.0.0"
                                />
                            </div>
                        </div>

                        {/* Rubric Items */}
                        <div className="rubric-items-header">
                            <h3>Checklist Items ({(caseData.rubric?.items || []).length})</h3>
                            <button className="btn btn-sm btn-primary" onClick={addRubricItem}>+ Add Item</button>
                        </div>

                        {(caseData.rubric?.items || []).map((item, idx) => (
                            <div key={idx} className="rubric-item-card">
                                <div className="rubric-item-header">
                                    <span className="rubric-item-num">#{idx + 1}</span>
                                    <div className="rubric-item-actions">
                                        <button className="btn-icon" onClick={() => moveItem(idx, -1)} disabled={idx === 0}>↑</button>
                                        <button className="btn-icon" onClick={() => moveItem(idx, 1)} disabled={idx === (caseData.rubric?.items || []).length - 1}>↓</button>
                                        <button className="btn-icon danger" onClick={() => removeRubricItem(idx)}>×</button>
                                    </div>
                                </div>
                                <div className="rubric-item-body">
                                    <div className="editor-fields-grid">
                                        <div className="editor-field">
                                            <label>Item ID</label>
                                            <input value={item.id} onChange={e => updateField(`rubric.items.${idx}.id`, e.target.value)} placeholder="e.g. PHQ_SCREENER" />
                                        </div>
                                        <div className="editor-field small">
                                            <label>Weight</label>
                                            <input type="number" step="0.5" min="0" value={item.weight} onChange={e => updateField(`rubric.items.${idx}.weight`, parseFloat(e.target.value))} />
                                        </div>
                                        <div className="editor-field small">
                                            <label>Gate</label>
                                            <select value={item.gate || ''} onChange={e => updateField(`rubric.items.${idx}.gate`, e.target.value || null)}>
                                                <option value="">None</option>
                                                <option value="RISK_POSITIVE">RISK_POSITIVE</option>
                                                <option value="ALWAYS">ALWAYS</option>
                                            </select>
                                        </div>
                                        <div className="editor-field checkbox">
                                            <label>
                                                <input type="checkbox" checked={item.safety_critical || false} onChange={e => updateField(`rubric.items.${idx}.safety_critical`, e.target.checked)} />
                                                Safety Critical
                                            </label>
                                        </div>
                                    </div>
                                    <div className="editor-field" style={{ marginTop: '0.5rem' }}>
                                        <label>Description</label>
                                        <input value={item.desc} onChange={e => updateField(`rubric.items.${idx}.desc`, e.target.value)} placeholder="What the trainee must do" />
                                    </div>

                                    <div className="patterns-grid">
                                        <div className="pattern-col">
                                            <label className="pattern-label">English Patterns</label>
                                            {(item.en_patterns || []).map((pat, pi) => (
                                                <div key={pi} className="inline-input-row">
                                                    <input value={pat} onChange={e => updateField(`rubric.items.${idx}.en_patterns.${pi}`, e.target.value)} placeholder="Pattern…" />
                                                    <button className="btn-icon danger" onClick={() => removePattern(idx, 'en', pi)}>×</button>
                                                </div>
                                            ))}
                                            <button className="btn btn-xs btn-outline" onClick={() => addPattern(idx, 'en')}>+ Pattern</button>
                                        </div>
                                        <div className="pattern-col">
                                            <label className="pattern-label">Arabic Patterns</label>
                                            {(item.ar_patterns || []).map((pat, pi) => (
                                                <div key={pi} className="inline-input-row">
                                                    <input value={pat} onChange={e => updateField(`rubric.items.${idx}.ar_patterns.${pi}`, e.target.value)} placeholder="نمط…" dir="rtl" />
                                                    <button className="btn-icon danger" onClick={() => removePattern(idx, 'ar', pi)}>×</button>
                                                </div>
                                            ))}
                                            <button className="btn btn-xs btn-outline" onClick={() => addPattern(idx, 'ar')}>+ Pattern</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {(caseData.rubric?.items || []).length === 0 && (
                            <div className="rubric-empty">
                                <p>No rubric items yet. Click "+ Add Item" to create one.</p>
                            </div>
                        )}

                        {/* JSON Preview */}
                        {showPreview && (
                            <div className="json-preview">
                                <h3>Rubric JSON Preview</h3>
                                <pre>{rubricJSON}</pre>
                            </div>
                        )}
                    </section>

                    {/* ── Actions ── */}
                    <div className="editor-actions">
                        <button className="btn btn-primary" onClick={saveCase} disabled={saving || !caseData.title.trim()}>
                            {saving ? 'Saving…' : selectedCaseId ? '💾 Update Case' : '✨ Create Case'}
                        </button>
                        {selectedCaseId && (
                            <button className="btn btn-danger" onClick={deleteCase}>
                                🗑 Delete Case
                            </button>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CaseEditorPage;
