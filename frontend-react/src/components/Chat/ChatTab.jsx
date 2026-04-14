import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';

const ChatTab = () => {
    const [messageInput, setMessageInput] = useState('');
    const chatAreaRef = useRef(null);
    const {
        sessionId,
        isActive,
        isPending,
        sessionExpired,
        messages,
        patientProfile,
        sendMessage
    } = useSession();

    const handleSend = () => {
        if (messageInput.trim() && !isPending && !sessionExpired) {
            sendMessage(messageInput);
            setMessageInput('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatAreaRef.current) {
            chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-resize textarea
    const handleInputChange = (e) => {
        setMessageInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    };

    return (
        <div className="chat-tab-content">
            {/* Patient Profile Section */}
            {patientProfile && (
                <div className="profile-section">
                    <div className="profile-header">
                        <h3>Patient Profile (Examiner View)</h3>
                    </div>
                    <div className="profile-content">
                        <div className="profile-grid">
                            <div className="profile-card">
                                <h4>Demographics</h4>
                                <div className="profile-item">
                                    <span className="label">Age:</span>
                                    <span className="value">{patientProfile.age || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="label">Gender:</span>
                                    <span className="value">{patientProfile.gender || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="label">Occupation:</span>
                                    <span className="value">{patientProfile.occupation || '—'}</span>
                                </div>
                            </div>

                            <div className="profile-card">
                                <h4>Clinical Presentation</h4>
                                <div className="profile-item">
                                    <span className="label">Chief Complaint:</span>
                                    <span className="value">{patientProfile.chief_complaint || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="label">Severity:</span>
                                    <span className="value">{patientProfile.symptom_severity || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="label">Onset:</span>
                                    <span className="value">{patientProfile.symptom_onset || '—'}</span>
                                </div>
                            </div>

                            <div className="profile-card">
                                <h4>Communication Style</h4>
                                <div className="profile-item">
                                    <span className="label">Response Style:</span>
                                    <span className="value">{patientProfile.response_style || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="label">Emotional Tone:</span>
                                    <span className="value">{patientProfile.emotional_tone || '—'}</span>
                                </div>
                                <div className="profile-item">
                                    <span className="label">Risk Status:</span>
                                    <span className={`value ${patientProfile.risk_positive ? 'risk-positive' : ''}`}>
                                        {patientProfile.risk_positive ? 'YES' : 'No'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {patientProfile.risk_positive && patientProfile.risk_detail && (
                            <div className="profile-details">
                                <strong>Risk Detail:</strong> <span>{patientProfile.risk_detail}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className="chat-area" ref={chatAreaRef}>
                {messages.filter(msg => msg.role !== 'system').length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">🏥</div>
                        <h3>Session Started</h3>
                        <p>Begin your interview with the patient.<br />Type your message below to start.</p>
                    </div>
                )}
                {messages
                    .filter(msg => msg.role !== 'system')
                    .map((msg, idx) => (
                        <div key={idx} className={`bubble ${msg.role}`}>
                            {msg.content}
                        </div>
                    ))}
                {isPending && (
                    <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-bar">
                <textarea
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={sessionExpired ? 'Session expired — chat disabled' : 'Type your message… (Enter to send, Shift+Enter for new line)'}
                    rows="1"
                    disabled={!isActive || sessionExpired || isPending}
                />
                <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!isActive || sessionExpired || !messageInput.trim() || isPending}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default ChatTab;
