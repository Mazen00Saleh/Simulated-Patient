import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from '../../context/SessionContext';

const API = '/api/v1';

// ─── Recording state machine ───────────────────────────────────────────────
// idle → recording → transcribing → waiting_reply → speaking → idle

const VoiceMode = ({ language = 'English' }) => {
    const { sessionId, isActive, sessionExpired, isPending, sendMessage, messages } = useSession();

    const [phase, setPhase] = useState('idle');     // idle | recording | transcribing | waiting_reply | speaking
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState('');
    const [volume, setVolume] = useState(0);           // 0-1 for mic visualiser
    const [autoPlay, setAutoPlay] = useState(true);        // play patient replies automatically

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const audioPlayerRef = useRef(null);
    const prevMessageCount = useRef(0);

    // ── Language code map ──
    const langCode = language === 'Arabic' ? 'ara' : 'eng';

    // ── Cleanup on unmount ──
    useEffect(() => {
        return () => {
            stopMicStream();
            cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    // ── Watch for new assistant messages to auto-speak ──
    useEffect(() => {
        if (!autoPlay) return;

        const assistantMsgs = messages.filter(m => m.role === 'assistant');
        const count = assistantMsgs.length;

        if (count > prevMessageCount.current && phase === 'waiting_reply') {
            const latestReply = assistantMsgs[count - 1]?.content;
            if (latestReply) {
                prevMessageCount.current = count;
                speakText(latestReply);
            }
        } else {
            prevMessageCount.current = count;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, autoPlay]);

    // ────────────────────────────────────────
    // Mic helpers
    // ────────────────────────────────────────
    const stopMicStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        cancelAnimationFrame(animFrameRef.current);
        setVolume(0);
    };

    const startVolumeAnalyser = (stream) => {
        try {
            const ctx = new AudioContext();
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            src.connect(analyser);
            analyserRef.current = analyser;

            const data = new Uint8Array(analyser.frequencyBinCount);
            const tick = () => {
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                setVolume(avg / 128); // normalise to 0-1 ish
                animFrameRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch (_) { /* AudioContext might be blocked */ }
    };

    // ────────────────────────────────────────
    // Start recording
    // ────────────────────────────────────────
    const startRecording = async () => {
        setError('');
        setTranscript('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            startVolumeAnalyser(stream);

            const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? { mimeType: 'audio/webm;codecs=opus' }
                : {};

            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = handleRecordingStop;
            recorder.start(250); // collect chunks every 250ms
            setPhase('recording');
        } catch (err) {
            setError('Microphone access denied. Please allow mic access and try again.');
            setPhase('idle');
        }
    };

    // ────────────────────────────────────────
    // Stop recording → transcribe
    // ────────────────────────────────────────
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        stopMicStream();
        setPhase('transcribing');
    };

    const handleRecordingStop = useCallback(async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        if (blob.size < 1000) {
            setError('Recording was too short or empty. Please try again.');
            setPhase('idle');
            return;
        }

        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const formData = new FormData();
        formData.append('audio', blob, `recording.${ext}`);
        formData.append('language_code', langCode);

        try {
            const res = await fetch(`${API}/voice/transcribe`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Transcription failed');
            }

            const text = data.text?.trim();
            if (!text) {
                setError('No speech detected. Please speak clearly and try again.');
                setPhase('idle');
                return;
            }

            setTranscript(text);

            // Send as a chat message — the SessionContext handles the LLM call
            setPhase('waiting_reply');
            await sendMessage(text);
            // speakText() will be triggered by the useEffect watching messages

        } catch (err) {
            setError(`Error: ${err.message}`);
            setPhase('idle');
        }
    }, [langCode, sendMessage]);

    // ────────────────────────────────────────
    // Text-to-speech
    // ────────────────────────────────────────
    const speakText = async (text) => {
        setPhase('speaking');
        try {
            const res = await fetch(`${API}/voice/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, language, session_id: sessionId }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'TTS failed');
            }

            const audioBlob = await res.blob();
            const url = URL.createObjectURL(audioBlob);

            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = url;
                audioPlayerRef.current.onended = () => {
                    URL.revokeObjectURL(url);
                    setPhase('idle');
                };
                audioPlayerRef.current.onerror = () => {
                    setPhase('idle');
                };
                await audioPlayerRef.current.play();
            }
        } catch (err) {
            setError(`TTS Error: ${err.message}`);
            setPhase('idle');
        }
    };

    const stopSpeaking = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = '';
        }
        setPhase('idle');
    };

    // ────────────────────────────────────────
    // Render helpers
    // ────────────────────────────────────────
    const disabled = !isActive || sessionExpired;
    const isRecording = phase === 'recording';
    const isProcessing = phase === 'transcribing' || phase === 'waiting_reply';
    const isSpeaking = phase === 'speaking';
    const isIdle = phase === 'idle';

    const pulseSize = isRecording ? Math.min(1 + volume * 0.6, 1.6) : 1;

    const phaseLabel = {
        idle: 'Ready',
        recording: 'Listening…',
        transcribing: 'Transcribing…',
        waiting_reply: 'Patient is thinking…',
        speaking: 'Patient speaking…',
    }[phase];

    return (
        <div style={styles.container}>
            {/* Hidden audio element for playback */}
            <audio ref={audioPlayerRef} style={{ display: 'none' }} />

            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <div style={{ ...styles.statusDot, backgroundColor: isRecording ? '#ef4444' : isSpeaking ? '#10b981' : isProcessing ? '#f59e0b' : '#6b7280' }} />
                    <span style={styles.phaseLabel}>{phaseLabel}</span>
                </div>
                <label style={styles.autoPlayToggle} title="Auto-play patient replies as voice">
                    <input
                        type="checkbox"
                        checked={autoPlay}
                        onChange={e => setAutoPlay(e.target.checked)}
                        style={{ marginRight: '0.4rem' }}
                    />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Auto-play replies</span>
                </label>
            </div>

            {/* Mic button + visualiser */}
            <div style={styles.micArea}>
                <div
                    style={{
                        ...styles.micRing,
                        transform: `scale(${pulseSize})`,
                        opacity: isRecording ? 0.25 : 0,
                        transition: 'transform 0.1s ease, opacity 0.3s ease',
                    }}
                />
                <button
                    id="voice-mic-btn"
                    style={{
                        ...styles.micBtn,
                        backgroundColor: isRecording ? '#ef4444' : disabled ? '#d1d5db' : 'var(--primary)',
                        cursor: disabled || isProcessing || isSpeaking ? 'not-allowed' : 'pointer',
                        transform: isRecording ? `scale(${1 + volume * 0.15})` : 'scale(1)',
                        transition: 'transform 0.1s ease, background-color 0.2s ease',
                    }}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={disabled || isProcessing || isSpeaking}
                    title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    {isRecording ? (
                        /* Stop icon */
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                    ) : (
                        /* Mic icon */
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Action hint */}
            <p style={styles.hint}>
                {disabled
                    ? 'Start a session to use voice mode'
                    : isIdle
                        ? 'Tap the mic to start speaking'
                        : isRecording
                            ? 'Tap again to stop and send'
                            : isProcessing
                                ? 'Please wait…'
                                : isSpeaking
                                    ? (
                                        <button onClick={stopSpeaking} style={styles.skipBtn}>
                                            ⏹ Stop playback
                                        </button>
                                    )
                                    : ''}
            </p>

            {/* Transcript preview */}
            {transcript && (
                <div style={styles.transcriptBox}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>You said:</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontStyle: 'italic' }}>"{transcript}"</span>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div style={styles.errorBox}>
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError('')} style={styles.dismissBtn}>✕</button>
                </div>
            )}
        </div>
    );
};

// ─── Inline styles ───────────────────────────────────────────────────────────
const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 1rem',
        gap: '0.75rem',
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        borderRadius: '1rem',
        border: '1px solid rgba(26,86,219,0.12)',
        boxShadow: '0 4px 24px rgba(26,86,219,0.08)',
        width: '100%',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        transition: 'background-color 0.3s ease',
    },
    phaseLabel: {
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--text-main)',
    },
    autoPlayToggle: {
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
    },
    micArea: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
        height: 100,
    },
    micRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: '50%',
        backgroundColor: '#ef4444',
        transformOrigin: 'center',
    },
    micBtn: {
        position: 'relative',
        zIndex: 1,
        width: 72,
        height: 72,
        borderRadius: '50%',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 20px rgba(26,86,219,0.35)',
    },
    hint: {
        fontSize: '0.82rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        margin: 0,
        minHeight: '1.2rem',
    },
    transcriptBox: {
        width: '100%',
        background: 'rgba(26, 86, 219, 0.05)',
        border: '1px solid rgba(26,86,219,0.15)',
        borderRadius: '0.6rem',
        padding: '0.6rem 0.9rem',
        lineHeight: 1.4,
    },
    errorBox: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: '0.6rem',
        padding: '0.6rem 0.9rem',
        fontSize: '0.82rem',
        color: '#b91c1c',
        gap: '0.5rem',
    },
    dismissBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#b91c1c',
        fontSize: '0.9rem',
        padding: 0,
        lineHeight: 1,
    },
    skipBtn: {
        background: 'none',
        border: '1px solid #6b7280',
        borderRadius: '0.4rem',
        cursor: 'pointer',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        padding: '0.2rem 0.6rem',
    },
};

export default VoiceMode;
