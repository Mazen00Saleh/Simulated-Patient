/* admin.js — SimPatient Admin Dashboard */

const API = '/api/v1/admin';

// ── State ──────────────────────────────────────────────────────
let allSessions = [];
let selectedId = null;

// ── DOM refs ───────────────────────────────────────────────────
const sessionsList = document.getElementById('sessions-list');
const sessionCount = document.getElementById('session-count');
const sessionDetail = document.getElementById('session-detail');
const statTotal = document.getElementById('stat-total');
const statEvaluated = document.getElementById('stat-evaluated');
const searchInput = document.getElementById('search-input');
const filterEval = document.getElementById('filter-eval');
const btnRefresh = document.getElementById('btn-refresh');

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();

    btnRefresh.addEventListener('click', loadSessions);
    searchInput.addEventListener('input', renderList);
    filterEval.addEventListener('change', renderList);
});

// ── Data loading ───────────────────────────────────────────────
async function loadSessions() {
    sessionsList.innerHTML = `<div class="spinner"></div>`;
    try {
        const res = await fetch(`${API}/sessions`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        allSessions = await res.json();
        renderList();
        updateStats();
    } catch (err) {
        sessionsList.innerHTML = `<div class="admin-empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
}

function updateStats() {
    statTotal.textContent = allSessions.length;
    statEvaluated.textContent = allSessions.filter(s => s.has_trainee_eval).length;
}

// ── List rendering ─────────────────────────────────────────────
function getFiltered() {
    const q = searchInput.value.trim().toLowerCase();
    const evalFilter = filterEval.value;
    return allSessions.filter(s => {
        if (q && !s.session_id.toLowerCase().includes(q) && !s.condition.toLowerCase().includes(q)) return false;
        if (evalFilter === 'evaluated' && !s.has_trainee_eval) return false;
        if (evalFilter === 'unevaluated' && s.has_trainee_eval) return false;
        return true;
    });
}

function renderList() {
    const filtered = getFiltered();
    sessionCount.textContent = `${filtered.length} session${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        sessionsList.innerHTML = `<div class="admin-empty-state"><div class="empty-icon">🔍</div><p>No sessions match your filter.</p></div>`;
        return;
    }

    sessionsList.innerHTML = filtered.map(s => sessionCard(s)).join('');

    // re-attach click listeners
    sessionsList.querySelectorAll('.session-card').forEach(card => {
        card.addEventListener('click', () => selectSession(card.dataset.id));
    });

    // re-highlight selected
    if (selectedId) {
        const el = sessionsList.querySelector(`[data-id="${selectedId}"]`);
        if (el) el.classList.add('selected');
    }
}

function sessionCard(s) {
    const short = s.session_id.slice(0, 8);
    const lang = s.language || 'English';
    const langClass = lang === 'Arabic' ? 'lang-ar' : 'lang-en';
    const date = s.created_at ? new Date(s.created_at).toLocaleString() : '—';

    return `
    <div class="session-card" data-id="${s.session_id}">
        <div class="session-card-top">
            <span class="session-condition">${escHtml(s.condition)}</span>
            <span class="session-lang-badge ${langClass}">${escHtml(lang)}</span>
        </div>
        <div class="session-card-meta">
            <span class="session-id-short">${short}…</span>
            <span>·</span>
            <span>${date}</span>
        </div>
        <div class="session-card-badges">
            <span class="eval-pill ${s.has_trainee_eval ? 'has-eval' : 'no-eval'}">
                ${s.has_trainee_eval ? '✓ Evaluated' : '○ Not evaluated'}
            </span>
            <span class="msg-count-badge">💬 ${s.message_count} msg${s.message_count !== 1 ? 's' : ''}</span>
        </div>
    </div>`;
}

// ── Session detail ─────────────────────────────────────────────
async function selectSession(id) {
    if (selectedId === id) return;
    selectedId = id;

    // highlight in list
    sessionsList.querySelectorAll('.session-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.id === id);
    });

    sessionDetail.innerHTML = `<div class="spinner" style="margin-top:4rem;"></div>`;

    try {
        const res = await fetch(`${API}/sessions/${id}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        renderDetail(data);
    } catch (err) {
        sessionDetail.innerHTML = `<div class="admin-empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
    }
}

function renderDetail({ session, messages, evaluations }) {
    const lang = session.language || 'English';
    const langClass = lang === 'Arabic' ? 'lang-ar' : 'lang-en';
    const created = session.created_at ? new Date(session.created_at).toLocaleString() : '—';
    const expires = session.expires_at ? new Date(session.expires_at).toLocaleString() : '—';

    const traineeEvals = evaluations.filter(e => e.eval_type === 'trainee');
    const patientEvals = evaluations.filter(e => e.eval_type === 'patient');

    sessionDetail.innerHTML = `
    <!-- Header -->
    <div class="detail-header">
        <div class="detail-title-row">
            <span class="detail-condition">${escHtml(session.condition)}</span>
            <span class="session-lang-badge ${langClass}">${escHtml(lang)}</span>
            ${traineeEvals.length ? '<span class="eval-pill has-eval">✓ Evaluated</span>' : '<span class="eval-pill no-eval">○ Not evaluated</span>'}
        </div>
        <div class="detail-meta">
            Session: ${session.session_id} &nbsp;·&nbsp; Created: ${created} &nbsp;·&nbsp; Expires: ${expires}
        </div>
    </div>

    <div class="detail-body">
        <!-- Conversation -->
        ${makeCollapsibleSection('💬 Conversation', renderConversation(messages), true)}

        <!-- Trainee Evaluation -->
        ${traineeEvals.length
            ? makeCollapsibleSection('📋 Trainee Evaluation', renderTraineeEval(traineeEvals[traineeEvals.length - 1]), false)
            : makeCollapsibleSection('📋 Trainee Evaluation', '<div class="admin-empty-state" style="padding:1.5rem;"><p>No trainee evaluation recorded for this session.</p></div>', false)
        }

        <!-- Patient Evaluation -->
        ${patientEvals.length
            ? makeCollapsibleSection('🩺 Patient Evaluation', renderPatientEval(patientEvals[patientEvals.length - 1]), false)
            : makeCollapsibleSection('🩺 Patient Evaluation', '<div class="admin-empty-state" style="padding:1.5rem;"><p>No patient evaluation recorded for this session.</p></div>', false)
        }
    </div>`;

    // Toggle collapsible sections
    sessionDetail.querySelectorAll('.detail-section-header').forEach(header => {
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            const chevron = header.querySelector('.detail-section-chevron');
            body.classList.toggle('open');
            chevron.classList.toggle('open');
        });
    });
}

function makeCollapsibleSection(title, contentHtml, startOpen) {
    return `
    <div class="detail-section">
        <div class="detail-section-header">
            <span class="detail-section-title">${title}</span>
            <span class="detail-section-chevron ${startOpen ? 'open' : ''}">▶</span>
        </div>
        <div class="detail-section-body ${startOpen ? 'open' : ''}">
            ${contentHtml}
        </div>
    </div>`;
}

function renderConversation(messages) {
    const visible = messages.filter(m => m.role !== 'system');
    if (visible.length === 0) {
        return '<div class="admin-empty-state" style="padding:1.5rem;"><p>No messages in this session.</p></div>';
    }
    return `<div class="convo-view">${visible.map(m => `
        <div class="convo-bubble ${escHtml(m.role)}">
            <div class="bubble-role">${escHtml(m.role)}</div>
            ${escHtml(m.content)}
        </div>`).join('')}</div>`;
}

function renderTraineeEval(ev) {
    const sd = ev.score_data || {};
    const pct = typeof sd.percent === 'number' ? sd.percent.toFixed(1) : '—';
    const passed = sd.pass;
    const total = sd.total_score ?? '—';
    const possible = sd.total_possible ?? '—';
    const items = sd.items || [];
    const feedback = sd.summary_feedback || [];

    return `<div class="eval-detail-block">
        <div class="eval-score-banner">
            <div class="eval-score-big ${passed ? 'pass' : 'fail'}">${pct}%</div>
            <div class="eval-score-info">
                <div class="eval-score-label">Score</div>
                <div class="eval-score-detail">${total} / ${possible} points</div>
            </div>
            <span class="eval-pass-badge ${passed ? 'pass' : 'fail'}">${passed ? 'PASS' : 'FAIL'}</span>
        </div>

        ${items.length ? `
        <table class="rubric-table">
            <thead>
                <tr>
                    <th style="width:36px;"></th>
                    <th>Criterion</th>
                    <th style="width:60px;">Points</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(it => `
                <tr>
                    <td><div class="rubric-check ${it.achieved ? 'achieved' : 'missed'}">${it.achieved ? '✓' : '✗'}</div></td>
                    <td>${escHtml(it.desc || it.id || '')}</td>
                    <td style="font-family:var(--mono);font-size:0.75rem;color:var(--text-muted);">${it.score ?? 0}/${it.max_score ?? 1}</td>
                </tr>`).join('')}
            </tbody>
        </table>` : ''}

        ${feedback.length ? `
        <div style="margin-top:16px;">
            <div class="section-heading" style="margin-bottom:8px;">Feedback</div>
            <ul class="feedback-list">
                ${feedback.map(f => `<li class="feedback-item">${escHtml(f)}</li>`).join('')}
            </ul>
        </div>` : ''}
    </div>`;
}

function renderPatientEval(ev) {
    const sd = ev.score_data || {};
    const metrics = sd.metrics || [];
    if (!metrics.length) {
        return '<div class="admin-empty-state" style="padding:1.5rem;"><p>No metric data available.</p></div>';
    }

    return `<div class="eval-detail-block">
        <table class="rubric-table">
            <thead>
                <tr>
                    <th style="width:36px;"></th>
                    <th>Metric</th>
                    <th style="width:70px;">Score</th>
                    <th style="width:70px;">Threshold</th>
                </tr>
            </thead>
            <tbody>
                ${metrics.map(m => `
                <tr>
                    <td><div class="rubric-check ${m.passed ? 'achieved' : 'missed'}">${m.passed ? '✓' : '✗'}</div></td>
                    <td>${escHtml(m.name || m.class || '')}</td>
                    <td style="font-family:var(--mono);font-size:0.75rem;color:var(--text-muted);">${m.score != null ? Number(m.score).toFixed(2) : '—'}</td>
                    <td style="font-family:var(--mono);font-size:0.75rem;color:var(--text-muted);">${m.threshold != null ? Number(m.threshold).toFixed(2) : '—'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    </div>`;
}

// ── Helpers ────────────────────────────────────────────────────
function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
