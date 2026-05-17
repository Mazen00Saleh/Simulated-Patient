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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Chat Area */}
            <div className="sp-chat-interface" ref={chatAreaRef}>
                {messages.filter(msg => msg.role !== 'system').length === 0 && (
                    <div className="sp-chat-empty">
                        <div style={{ fontSize: '3rem', opacity: 0.5 }}>🏥</div>
                        <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)' }}>Session Started</h3>
                        <p style={{ fontSize: '0.9rem', margin: 0, textAlign: 'center' }}>Begin your interview with the patient.<br />Type your message below to start.</p>
                    </div>
                )}
                {messages
                    .filter(msg => msg.role !== 'system')
                    .map((msg, idx) => (
                        <div key={idx} className={`sp-chat-bubble ${msg.role === 'user' ? 'sp-bubble-user' : msg.role === 'assistant' ? 'sp-bubble-bot' : 'sp-bubble-system'}`}>
                            {msg.content}
                        </div>
                    ))}
                {isPending && (
                    <div className="sp-typing-indicator">
                        <div className="sp-typing-dot"></div>
                        <div className="sp-typing-dot"></div>
                        <div className="sp-typing-dot"></div>
                    </div>
                )}
            </div>

            {/* Chat Input */}
            <div className="sp-chat-input-bar">
                <textarea
                    className="sp-chat-textarea"
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={sessionExpired ? 'Session expired — chat disabled' : 'Type your message… (Enter to send, Shift+Enter for new line)'}
                    rows="1"
                    disabled={!isActive || sessionExpired || isPending}
                />
                <button
                    className="btn btn-primary sp-chat-send-btn"
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
