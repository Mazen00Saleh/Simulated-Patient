import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const SessionContext = createContext();

const API = '/api/v1';

export const SessionProvider = ({ children }) => {
    const [sessionId, setSessionId] = useState(null);
    const [condition, setCondition] = useState('');
    const [language, setLanguage] = useState('English');
    const [isActive, setIsActive] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(600); // 10 minutes

    // LLM Overrides
    const [modelOverride, setModelOverride] = useState('');
    const [reasoningOverride, setReasoningOverride] = useState('');

    // Profile data
    const [patientProfile, setPatientProfile] = useState(null);

    // Chat messages
    const [messages, setMessages] = useState([]);

    // Evaluation results cache
    const [evalResults, setEvalResults] = useState(null);

    const startSession = useCallback(async (cond, lang) => {
        setIsPending(true);
        try {
            console.log(`[SessionContext] Starting session request: condition="${cond}", language="${lang}"`);

            const response = await fetch(`${API}/chat/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ condition: cond, language: lang })
            });

            console.log(`[SessionContext] Response received: status=${response.status}, statusText="${response.statusText}"`);

            // Check if response has content
            const contentType = response.headers.get('content-type');
            console.log(`[SessionContext] Content-Type: ${contentType}`);

            let data;

            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('[SessionContext] Non-JSON response from backend:', {
                    status: response.status,
                    text: text.substring(0, 500) // Log first 500 chars
                });
                return {
                    ok: false,
                    error: `Server error (${response.status}): ${text || 'No response body'}`
                };
            }

            try {
                data = await response.json();
                console.log('[SessionContext] JSON parsed successfully:', data);
            } catch (parseErr) {
                console.error('[SessionContext] JSON parse error:', parseErr);
                return {
                    ok: false,
                    error: `Failed to parse server response: ${parseErr.message}`
                };
            }

            if (response.ok) {
                console.log(`[SessionContext] Session created successfully: ${data.session_id}`);
                setSessionId(data.session_id);
                setCondition(cond);
                setLanguage(lang);
                setIsActive(true);
                setSessionExpired(false);
                setRemainingSeconds(600);
                setMessages([]);
                setPatientProfile(null);
                setEvalResults(null);

                // Load profile
                await loadProfile(data.session_id);

                return { ok: true, sessionId: data.session_id };
            } else {
                console.error('[SessionContext] Session creation failed:', data);
                return { ok: false, error: data.detail || 'Failed to start session' };
            }
        } catch (err) {
            console.error('[SessionContext] Session creation error:', err);
            return { ok: false, error: err.message };
        } finally {
            setIsPending(false);
        }
    }, []);

    const loadProfile = useCallback(async (sid) => {
        try {
            const response = await fetch(`${API}/session/${sid}/profile`);
            if (response.ok) {
                const profile = await response.json();
                setPatientProfile(profile);
            }
        } catch (err) {
            console.error('Could not load profile:', err);
        }
    }, []);

    const sendMessage = useCallback(async (text) => {
        if (!sessionId || sessionExpired || !text.trim()) return;

        setIsPending(true);
        setMessages(prev => [...prev, { role: 'user', content: text }]);

        try {
            const body = { session_id: sessionId, message: text };
            if (modelOverride.trim()) body.model = modelOverride.trim();
            if (reasoningOverride.trim()) body.reasoning_effort = reasoningOverride.trim();

            const response = await fetch(`${API}/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();

            if (response.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
            } else {
                setMessages(prev => [...prev, { role: 'system', content: `Error: ${data.detail || 'Failed to get response'}` }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'system', content: 'Network error — check if the server is running.' }]);
        } finally {
            setIsPending(false);
        }
    }, [sessionId, sessionExpired, modelOverride, reasoningOverride]);

    const deleteSession = useCallback(async () => {
        if (!sessionId) return;
        try {
            await fetch(`${API}/chat/session/${sessionId}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Error deleting session:', err);
        } finally {
            clearSession();
        }
    }, [sessionId]);

    const endSession = useCallback(async () => {
        if (!sessionId) return;
        try {
            const response = await fetch(`${API}/session/${sessionId}/end`, { method: 'POST' });
            if (response.ok) {
                setSessionExpired(true);
                setIsActive(false);
                setRemainingSeconds(0);
            }
        } catch (err) {
            console.error('Error ending session:', err);
        }
    }, [sessionId]);

    const clearSession = useCallback(() => {
        setSessionId(null);
        setCondition('');
        setLanguage('English');
        setIsActive(false);
        setSessionExpired(false);
        setRemainingSeconds(600);
        setMessages([]);
        setPatientProfile(null);
        setEvalResults(null);
    }, []);

    // Timer effect: Poll session time every 30 seconds, but update display every 1 second
    useEffect(() => {
        if (!isActive || !sessionId) return;

        const BACKEND_SYNC_INTERVAL = 30000; // 30 seconds
        const DISPLAY_UPDATE_INTERVAL = 1000; // 1 second for smooth display

        // Backend sync: fetch actual time from server every 30 seconds
        const syncInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API}/session/${sessionId}/time`);
                const data = await response.json();
                if (data.expired) {
                    setSessionExpired(true);
                    setIsActive(false);
                } else {
                    setRemainingSeconds(data.remaining_seconds || 0);
                }
            } catch (err) {
                console.error('Timer poll failed:', err);
            }
        }, BACKEND_SYNC_INTERVAL);

        // Local display: decrement timer every 1 second for smooth countdown
        const displayInterval = setInterval(() => {
            setRemainingSeconds(prev => Math.max(0, prev - 1));
        }, DISPLAY_UPDATE_INTERVAL);

        // Sync immediately on mount
        (async () => {
            try {
                const response = await fetch(`${API}/session/${sessionId}/time`);
                const data = await response.json();
                if (data.expired) {
                    setSessionExpired(true);
                    setIsActive(false);
                } else {
                    setRemainingSeconds(data.remaining_seconds || 0);
                }
            } catch (err) {
                console.error('Initial timer poll failed:', err);
            }
        })();

        return () => {
            clearInterval(syncInterval);
            clearInterval(displayInterval);
        };
    }, [isActive, sessionId]);

    const value = {
        // Session State
        sessionId,
        condition,
        language,
        isActive,
        isPending,
        sessionExpired,
        remainingSeconds,

        // LLM Overrides
        modelOverride,
        setModelOverride,
        reasoningOverride,
        setReasoningOverride,

        // Profile
        patientProfile,

        // Messages
        messages,

        // Eval Cache
        evalResults,
        setEvalResults,

        // Actions
        startSession,
        sendMessage,
        deleteSession,
        endSession,
        clearSession,
        loadProfile
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within SessionProvider');
    }
    return context;
};
