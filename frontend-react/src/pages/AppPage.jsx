import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatTab from '../components/Chat/ChatTab';
import VoiceMode from '../components/Chat/VoiceMode';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';
import { useSession } from '../context/SessionContext';
import '../styles/AppPage.css';

const AppPage = () => {
    const [activeTab, setActiveTab] = useState('chat');
    const [interactionMode, setInteractionMode] = useState('chat'); // 'chat' | 'voice'
    const [condition, setCondition] = useState('Depression');
    const [language, setLanguage] = useState('English');
    const [caseId, setCaseId] = useState(null);
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
        endSession,
        clearSession,
        messages
    } = useSession();

    const userMessageCount = messages ? messages.filter(m => m.role === 'user').length : 0;

    // Always scroll to top when page mounts
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Check if condition/language/case_id were passed from cases page
    useEffect(() => {
        const caseCondition = searchParams.get('condition');
        const caseLanguage = searchParams.get('language');
        const paramCaseId = searchParams.get('case_id');

        if (caseCondition) setCondition(caseCondition);
        if (caseLanguage) setLanguage(caseLanguage);
        if (paramCaseId) setCaseId(paramCaseId);
    }, [searchParams]);

    const handleStartSession = async () => {
        const result = await startSession(condition, language, caseId);
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
        <div className="bg-light page-transition page-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppNavbar />

            <div className="sp-app-container">
                <div className="sp-main-layout">
                    {/* Left Sidebar */}
                    <aside className="sp-card-wrapper sp-sidebar">
                        <section style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Session Configuration</h4>

                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Condition</label>
                            {caseId ? (
                                <div style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', marginBottom: '1.5rem', backgroundColor: '#f9fafb', color: '#6b7280', opacity: 0.7, cursor: 'not-allowed' }}>
                                    {condition}
                                </div>
                            ) : (
                                <input
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', marginBottom: '1.5rem', outline: 'none' }}
                                    type="text"
                                    placeholder="Depression, Anxiety…"
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value)}
                                    disabled={isActive}
                                />
                            )}

                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Language</label>
                            <select
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #D1D5DB', marginBottom: '1.5rem', outline: 'none', backgroundColor: '#fff' }}
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                disabled={isActive}
                            >
                                <option value="English">English</option>
                                <option value="Arabic">Arabic</option>
                            </select>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '0.85rem' }}
                                onClick={handleStartSession}
                                disabled={isActive || isPending}
                            >
                                {isActive ? '✓ Session Active' : isPending ? '…' : '▶ Start Session'}
                            </button>

                            {isActive && (
                                <button
                                    className="btn btn-danger-outline"
                                    style={{ width: '100%', marginTop: '0.75rem' }}
                                    onClick={handleDeleteSession}
                                >
                                    ✕ Delete Session
                                </button>
                            )}
                        </section>

                        {/* Session Status */}
                        <section>
                            <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Session Status</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-light)', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isActive ? 'var(--success)' : 'var(--text-muted)' }}></div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>{isActive ? `Session: ${sessionId?.slice(0, 8)}…` : 'No active session'}</div>
                                    {isActive && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{condition} ({language})</div>
                                    )}
                                </div>
                            </div>
                            {isActive && !sessionExpired && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-light)', borderRadius: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }}>
                                    <span>⏱️</span>
                                    <span>{formatTime(remainingSeconds)}</span>
                                </div>
                            )}
                            {sessionExpired && (
                                <div style={{ padding: '1rem', backgroundColor: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
                                    Session expired
                                </div>
                            )}
                        </section>
                    </aside>

                    {/* Main Content */}
                    <main className="sp-main-content">
                        <div className="sp-card-wrapper sp-chat-container">

                            {/* ── Mode Toggle ── */}
                            <div style={modeToggleStyle.wrapper}>
                                <button
                                    id="mode-tab-chat"
                                    style={{
                                        ...modeToggleStyle.tab,
                                        ...(interactionMode === 'chat' ? modeToggleStyle.tabActive : modeToggleStyle.tabInactive),
                                    }}
                                    onClick={() => setInteractionMode('chat')}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem' }}>
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    Text Chat
                                </button>
                                <button
                                    id="mode-tab-voice"
                                    style={{
                                        ...modeToggleStyle.tab,
                                        ...(interactionMode === 'voice' ? modeToggleStyle.tabActive : modeToggleStyle.tabInactive),
                                    }}
                                    onClick={() => setInteractionMode('voice')}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem' }}>
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" />
                                        <line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                    Voice Mode
                                    <span style={modeToggleStyle.badge}>NEW</span>
                                </button>
                            </div>

                            {/* ── Content ── */}
                            {interactionMode === 'voice' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', padding: '1rem' }}>
                                    {/* Voice panel */}
                                    <VoiceMode language={language} />

                                    {/* Conversation transcript (read-only) */}
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                            Conversation Transcript
                                        </div>
                                        {messages.filter(m => m.role !== 'system').length === 0 ? (
                                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' }}>
                                                🎙️ Conversation will appear here as you speak
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                {messages.filter(m => m.role !== 'system').map((msg, idx) => (
                                                    <div key={idx} style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                                    }}>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>
                                                            {msg.role === 'user' ? '🩺 Trainee' : '🏥 Patient'}
                                                        </span>
                                                        <div className={`sp-chat-bubble ${msg.role === 'user' ? 'sp-bubble-user' : 'sp-bubble-bot'}`}>
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <ChatTab />
                            )}
                        </div>
                    </main>
                </div>

                {/* End Session & Evaluate Button */}
                {isActive && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', marginBottom: '2rem' }}>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '1rem 3rem', fontSize: '1.2rem', fontWeight: 'bold' }}
                            onClick={async () => {
                                await endSession();
                                navigate('/eval');
                            }}
                            disabled={userMessageCount < 3}
                        >
                            {userMessageCount < 3 ? `End Session & Evaluate (${3 - userMessageCount} more messages needed)` : 'End Session & Evaluate'}
                        </button>
                    </div>
                )}
            </div>
            <AppFooter />
        </div>
    );
};

// ── Mode toggle styles ──────────────────────────────────────────────────────
const modeToggleStyle = {
    wrapper: {
        display: 'flex',
        gap: '0.25rem',
        padding: '0.35rem',
        backgroundColor: 'var(--bg-light)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(0,0,0,0.06)',
        margin: '0.75rem 0.75rem 0',
    },
    tab: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.6rem 1rem',
        borderRadius: '0.5rem',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        transition: 'all 0.2s ease',
    },
    tabActive: {
        backgroundColor: '#fff',
        color: 'var(--primary)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    tabInactive: {
        backgroundColor: 'transparent',
        color: 'var(--text-muted)',
    },
    badge: {
        marginLeft: '0.5rem',
        fontSize: '0.6rem',
        fontWeight: 800,
        padding: '0.1rem 0.4rem',
        borderRadius: '999px',
        backgroundColor: 'var(--primary)',
        color: 'white',
        letterSpacing: '0.05em',
    },
};

export default AppPage;
