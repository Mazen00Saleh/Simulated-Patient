import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatTab from '../components/Chat/ChatTab';
import PatientEvalTab from '../components/Evaluation/PatientEvalTab';
import TraineeEvalTab from '../components/Evaluation/TraineeEvalTab';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';
import { useSession } from '../context/SessionContext';
import '../styles/AppPage.css';

const AppPage = () => {
    const [activeTab, setActiveTab] = useState('chat');
    const [condition, setCondition] = useState('Depression');
    const [language, setLanguage] = useState('English');
    const [showLLMOverrides, setShowLLMOverrides] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const {
        sessionId,
        isActive,
        isPending,
        sessionExpired,
        remainingSeconds,
        modelOverride,
        setModelOverride,
        reasoningOverride,
        setReasoningOverride,
        startSession,
        deleteSession,
        clearSession
    } = useSession();

    // Check if condition/language were passed from cases page
    useEffect(() => {
        const caseCondition = searchParams.get('condition');
        const caseLanguage = searchParams.get('language');

        if (caseCondition) setCondition(caseCondition);
        if (caseLanguage) setLanguage(caseLanguage);
    }, [searchParams]);

    const handleStartSession = async () => {
        const result = await startSession(condition, language);
        if (!result.ok) {
            alert(`Error: ${result.error || 'Could not start session'}`);
        }
    };

    const handleDeleteSession = async () => {
        if (!sessionId) return;
        if (window.confirm('Delete this session and all its data?')) {
            await deleteSession();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="app-page-wrapper">
            <AppNavbar />
            <div className="app-layout">
                {/* Left Sidebar */}
                <aside className="app-sidebar">
                    <section className="sidebar-section">
                        <div className="section-heading">Session Config</div>

                        <label className="field-label">Condition</label>
                        <input
                            className="field-input"
                            type="text"
                            placeholder="Depression, Anxiety…"
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            disabled={isActive}
                        />

                        <label className="field-label">Language</label>
                        <select
                            className="field-input"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            disabled={isActive}
                        >
                            <option value="English">English</option>
                            <option value="Arabic">Arabic</option>
                        </select>

                        <button
                            className="btn btn-primary"
                            onClick={handleStartSession}
                            disabled={isActive || isPending}
                        >
                            {isActive ? '✓ Session Active' : isPending ? '…' : '▶ Start Session'}
                        </button>

                        {isActive && (
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteSession}
                            >
                                ✕ Delete Session
                            </button>
                        )}
                    </section>

                    {/* Session Status */}
                    <section className="sidebar-section">
                        <div className="section-heading">Session Status</div>
                        <div className="status-display">
                            <div className={`status-dot ${isActive ? 'active' : ''}`}></div>
                            <div>
                                <div className="status-text">{isActive ? `Session: ${sessionId?.slice(0, 8)}…` : 'No active session'}</div>
                                {isActive && (
                                    <div className="status-detail">{condition} ({language})</div>
                                )}
                            </div>
                        </div>
                        {isActive && !sessionExpired && (
                            <div className="timer-display">
                                <span className="timer-icon">⏱️</span>
                                <span className="timer-text">{formatTime(remainingSeconds)}</span>
                            </div>
                        )}
                        {sessionExpired && (
                            <div className="status-expired">Session expired</div>
                        )}
                    </section>

                    <section className="sidebar-section">
                        <div className="section-heading">LLM Overrides <span className="hint">optional</span></div>

                        <label className="field-label">Model</label>
                        <input
                            className="field-input"
                            type="text"
                            placeholder="default"
                            value={modelOverride}
                            onChange={(e) => setModelOverride(e.target.value)}
                        />

                        <label className="field-label">Reasoning Effort</label>
                        <select
                            className="field-input"
                            value={reasoningOverride}
                            onChange={(e) => setReasoningOverride(e.target.value)}
                        >
                            <option value="">default</option>
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                        </select>
                    </section>
                </aside>

                {/* Main Content */}
                <main className="app-main">
                    {/* Tab Navigation */}
                    <nav className="tab-nav">
                        <button
                            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            💬 Chat
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'patient-eval' ? 'active' : ''}`}
                            onClick={() => setActiveTab('patient-eval')}
                            disabled={!isActive}
                        >
                            🩺 Patient Eval
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'trainee-eval' ? 'active' : ''}`}
                            onClick={() => setActiveTab('trainee-eval')}
                            disabled={!isActive}
                        >
                            📋 Trainee Eval
                        </button>
                    </nav>

                    {/* Tab Content */}
                    <div className="tab-content">
                        {activeTab === 'chat' && <ChatTab />}
                        {activeTab === 'patient-eval' && <PatientEvalTab />}
                        {activeTab === 'trainee-eval' && <TraineeEvalTab />}
                    </div>
                </main>
            </div>
            <AppFooter />
        </div>
    );
};

export default AppPage;
