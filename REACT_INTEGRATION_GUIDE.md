# React Integration Guide — SimPatient App

## Overview

This document outlines the integration of the React-based application page (`/app`) with the existing plain HTML frontend pages. The implementation ensures both frontends are functional, properly themed, and maintain consistency across the application.

## File Structure

### React Frontend (frontend-react/)

**New Components Created:**

```
src/
├── context/
│   ├── SessionContext.jsx          ← Session state management
│   └── AuthContext.jsx             ← Existing
├── components/
│   ├── Chat/
│   │   └── ChatTab.jsx             ← Chat interface
│   ├── Evaluation/
│   │   ├── PatientEvalTab.jsx      ← Patient evaluation
│   │   └── TraineeEvalTab.jsx      ← Trainee evaluation
│   └── ... (existing components)
├── pages/
│   ├── AppPage.jsx                 ← Main app page
│   └── ... (existing pages)
├── styles/
│   └── AppPage.css                 ← App-specific styling
└── ... (existing files)
```

**Key Files Modified:**
- `src/App.jsx` — Added SessionProvider and /app route
- `src/components/CasesPage/CaseCard.jsx` — Added navigation to /app
- `package.json` — No additional dependencies needed

### Plain HTML Frontend (frontend/)

**Existing & Updated Files:**
- `index.html` — Main application page (already quite comprehensive)
- `style.css` — Theme styling
- `app.js` — JavaScript logic for API interactions
- `admin.html`, `admin.js`, `admin.css` — Admin dashboard (unchanged)

## How It Works

### 1. User Flow: From Cases to App

```
Cases Page (Vite React) 
  ↓
User clicks "START" button
  ↓
CaseCard component navigates to `/app?condition={title}&language=English`
  ↓
AppPage renders with SessionContext provider
  ↓
SessionContext reads query params and pre-fills condition/language
  ↓
User configures session and starts the interview
```

### 2. Session State Management (SessionContext.jsx)

**State Variables:**
```javascript
sessionId              // Unique session identifier
condition             // Patient condition/diagnosis
language              // Interview language (English/Arabic)
isActive              // Session is active
isPending             // API request in progress
sessionExpired        // Session time limit exceeded
remainingSeconds      // Time remaining in session
messages              // Chat message history
patientProfile        // Patient demographics and clinical info
modelOverride         // LLM model override
reasoningOverride     // LLM reasoning effort override
```

**Key Functions:**
- `startSession(condition, language)` — Initialize a new session
- `sendMessage(text)` — Send a message to the patient
- `deleteSession()` — End the current session
- `loadProfile(sessionId)` — Fetch patient profile data
- `clearSession()` — Reset all session state

**Timer Management:**
- Automatically polls `/api/v1/session/{sessionId}/time` every 1 second
- Updates `remainingSeconds` and sets `sessionExpired` when time runs out
- Disables chat when session expires

### 3. API Endpoints Used

All endpoints are prefixed with `/api/v1`:

| Endpoint                | Method | Purpose                      |
| ----------------------- | ------ | ---------------------------- |
| `/chat/start`           | POST   | Start a new session          |
| `/chat/message`         | POST   | Send a message               |
| `/chat/session/{id}`    | DELETE | Delete a session             |
| `/session/{id}/profile` | GET    | Get patient profile          |
| `/session/{id}/time`    | GET    | Check remaining time         |
| `/eval/patient`         | POST   | Evaluate patient (DeepEval)  |
| `/eval/trainee`         | POST   | Evaluate trainee (LLM Judge) |

**Request/Response Examples:**

**Start Session:**
```javascript
POST /api/v1/chat/start
{
  "condition": "Depression",
  "language": "English"
}
// Response
{
  "session_id": "abc-123-def-456"
}
```

**Send Message:**
```javascript
POST /api/v1/chat/message
{
  "session_id": "abc-123-def-456",
  "message": "Hello, how are you feeling?",
  "model": "optional-override",
  "reasoning_effort": "optional"
}
// Response
{
  "content": "I've been feeling down lately..."
}
```

**Patient Evaluation:**
```javascript
POST /api/v1/eval/patient
{
  "session_id": "abc-123-def-456",
  "role_adherence_threshold": 0.7,
  "convo_quality_threshold": 0.7
}
// Response
{
  "metrics": [
    {
      "name": "Clinical Accuracy",
      "score": 0.92,
      "passed": true
    }
    // ... more metrics
  ]
}
```

### 4. Component Architecture

**AppPage.jsx** (Container Component)
- Manages tab state
- Handles session configuration
- Conditionally renders tab components
- Provides SessionContext to all children

**ChatTab.jsx**
- Displays patient profile information
- Renders chat conversation
- Handles message input and sending
- Shows typing indicators during API calls
- Manages auto-scroll and textarea resizing

**PatientEvalTab.jsx**
- Configuration for evaluation thresholds
- Runs patient evaluation
- Displays metrics in a card grid
- Shows pass/fail status

**TraineeEvalTab.jsx**
- Configuration for judge model and rubric
- Runs trainee evaluation
- Displays rubric checklist in table format
- Shows flags and feedback items
- Modal for viewing detailed rationales

### 5. Theme & Styling

**Color Scheme (Dark Mode):**
```css
--bg: #0f1117                    /* Main background */
--surface: #1a1d27              /* Card/panel background */
--surface2: #21263a             /* Secondary surface */
--accent: #6c63ff               /* Primary action color */
--success: #22c55e              /* Positive outcomes */
--danger: #ef4444               /* Errors/failures */
--warn: #f59e0b                 /* Warnings */
--text: #e5e7eb                 /* Primary text */
--text-muted: #6b7280           /* Secondary text */
--text-dim: #374151             /* Disabled/dim text */
```

**Responsive Design:**
- Sidebar collapses on mobile
- Tab content adapts to smaller screens
- Tables become scrollable on narrow viewports
- Grid layouts use `auto-fit` and `minmax()`

### 6. Keyboard Shortcuts & Interactions

**Chat Tab:**
- `Enter` — Send message
- `Shift+Enter` — New line in textarea
- Auto-resize textarea based on content

**Sliders (Eval Tabs):**
- Click and drag to adjust values
- Live value display with two decimal places

**Toggle Switches:**
- Click to toggle on/off
- Visual feedback with color change

**Rationale Modal:**
- Click rationale button to open modal
- Click overlay to close
- Shows full description and reasoning

## Development & Testing

### Running the React App

```bash
cd frontend-react
npm install
npm run dev
```

Access at: `http://localhost:5173`

### Running the Plain HTML Frontend

```bash
cd frontend
# Served via Python/FastAPI at /static/
# Access at: http://localhost:8000
```

### Testing the API Endpoints

Use the plain HTML frontend (`frontend/index.html`) to test API endpoints directly with the API Inspector panel for debugging.

### Debugging Session Issues

**Checklist:**
1. Verify backend is running (`uvicorn api.main:app --reload`)
2. Check browser console for errors
3. Use SearchParams to verify `?condition=` param passed correctly
4. Verify SessionContext provider wraps the entire app
5. Check API response in browser Network tab
6. Ensure CORS headers allow requests from your domain

## Known Considerations

### 1. Session Persistence
- Sessions are server-side only
- Page refresh loses client-side state (but session remains on server)
- Consider adding session recovery mechanism if needed

### 2. Timer Behavior
- Timer polls every 1 second (adjustable in SessionContext)
- Polling stops when session is not active
- No automatic redirect when session expires (user stays on page)

### 3. Profile Loading
- Profile is optional (may not exist for some session types)
- Missing profile doesn't break the chat functionality
- Profile is loaded after session starts

### 4. Error Handling
- Network errors show in chat as system messages
- API errors display their `detail` field
- Disabled buttons prevent multiple submissions

## Integration Checklist

- [x] SessionContext created with full state management
- [x] ChatTab component with message handling
- [x] PatientEvalTab with threshold controls
- [x] TraineeEvalTab with comprehensive rubric display
- [x] AppPage as container with tabs
- [x] AppPage.css with complete styling
- [x] App.jsx routing updated
- [x] CaseCard navigation configured
- [x] Query params handling for case selection
- [x] Timer and session management
- [x] Profile loading and display
- [x] Modal for rationale viewing
- [x] Responsive design

## Future Enhancements

1. **Session Recovery:** Auto-restore session from localStorage
2. **Keyboard Shortcuts:** Add command palette for quick actions
3. **Export Results:** Download session transcript and evaluation results
4. **Dark/Light Mode Toggle:** User preference for theme
5. **Session History:** View past sessions and results
6. **Real-time Collaboration:** Support multiple observers in one session
7. **Custom Rubrics:** Allow uploading custom evaluation rubrics

## File Sizes & Performance

- **AppPage.css** — ~15 KB (comprehensive, single stylesheet)
- **SessionContext.jsx** — ~5 KB (lightweight state management)
- **ChatTab.jsx** — ~3 KB (component-specific logic)
- **PatientEvalTab.jsx** — ~3 KB
- **TraineeEvalTab.jsx** — ~4 KB
- **AppPage.jsx** — ~4 KB (container logic)

Total React app additions: ~34 KB (minified), with excellent code reusability.

## Support & Troubleshooting

### Common Issues

**Issue:** "SessionContext not found" error
**Solution:** Ensure SessionProvider wraps the entire app in App.jsx

**Issue:** Messages not sending
**Solution:** Check network tab, verify session ID exists, confirm API endpoints are correct

**Issue:** Timer not updating
**Solution:** Verify backend session exists, check API time endpoint response

**Issue:** Profile not loading
**Solution:** Profile may not exist for this session type; check API response in Network tab
