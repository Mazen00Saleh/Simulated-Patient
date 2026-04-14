# Quick Start Guide — React App Implementation

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Backend API running (`uvicorn api.main:app --reload`)
- Node.js installed
- cd into `frontend-react` directory

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

You'll see:
```
  VITE v5.4.10  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h + enter to show help
```

### Step 3: Test the Implementation

#### Option A: From Cases Page (Recommended)
1. Open http://localhost:5173/ (Landing Page)
2. Click "Start" or navigate to `/cases`
3. Browse cases and click any "START" button
4. Automatically redirected to `/app` with case pre-selected
5. Click "▶ Start Session" to begin interview

#### Option B: Direct Access
1. Open http://localhost:5173/app
2. Configure patient condition and language
3. Click "▶ Start Session"
4. Start chatting with the patient

## 📋 What Changed

### New Files (Do NOT Delete)
```
frontend-react/
├── src/
│   ├── context/
│   │   └── SessionContext.jsx        ← NEW
│   ├── components/
│   │   ├── Chat/
│   │   │   └── ChatTab.jsx           ← NEW
│   │   └── Evaluation/
│   │       ├── PatientEvalTab.jsx    ← NEW
│   │       └── TraineeEvalTab.jsx    ← NEW
│   ├── pages/
│   │   └── AppPage.jsx               ← NEW
│   └── styles/
│       └── AppPage.css               ← NEW
```

### Modified Files
```
frontend-react/
├── src/
│   ├── App.jsx                       ← UPDATED (added route & provider)
│   └── components/
│       └── CasesPage/
│           └── CaseCard.jsx          ← UPDATED (added navigation)
```

### Documentation (Reference)
```
/
├── REACT_INTEGRATION_GUIDE.md         ← Technical deep dive
├── IMPLEMENTATION_COMPLETE.md         ← Detailed summary
└── README_UPDATES.md                  ← (existing, you can update)
```

## ✨ Features

### Chat Tab
- ✅ Real-time conversation with simulated patient
- ✅ Patient profile information (demographics, clinical data)
- ✅ Auto-scrolling message area
- ✅ Typing indicators
- ✅ Session timer (10 minutes)
- ✅ Message history
- ✅ Auto-resizing input textarea

### Patient Evaluation Tab
- ✅ Threshold controls (role adherence, conversation quality)
- ✅ Live metric updates
- ✅ Pass/fail indicators
- ✅ Detailed metric scores and reasoning

### Trainee Evaluation Tab
- ✅ Judge model configuration
- ✅ Custom rubric support
- ✅ Temperature control
- ✅ Comprehensive rubric checklist
- ✅ Flag warnings system
- ✅ Detailed feedback display
- ✅ Modal for rationale viewing

## 🎯 Common Tasks

### Test a Specific API Endpoint

Use the plain HTML frontend for detailed API debugging:
```bash
# In another terminal, serve the frontend folder
cd frontend
# The app.js file has the API Inspector panel at the bottom
# Open http://localhost:8000 and check the Inspector panel
```

### Check Session State in React DevTools
1. Open Browser DevTools (F12)
2. Go to React DevTools tab
3. Find `SessionProvider` in component tree
4. Inspect its state and values

### Monitor API Calls
1. Open Network tab in DevTools
2. Filter by "api" to see API calls only
3. Click on request to see headers and body
4. Click Response tab to see parsed JSON

### Test Mobile Responsiveness
1. Open DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Select different device presets
4. Test all tabs and features

## 🔗 Important URLs

| Page            | URL                                                             | Purpose                  |
| --------------- | --------------------------------------------------------------- | ------------------------ |
| Landing         | http://localhost:5173/                                          | Welcome page             |
| Cases           | http://localhost:5173/cases                                     | Browse patient cases     |
| App             | http://localhost:5173/app                                       | Main interview interface |
| App (with case) | http://localhost:5173/app?condition=Depression&language=English | Case pre-selected        |
| Login           | http://localhost:5173/login                                     | User authentication      |
| Register        | http://localhost:5173/register                                  | Create account           |

## ⚠️ Troubleshooting

### Issue: "Cannot GET /app"
**Solution:** Make sure you're using dev server (npm run dev), not build

### Issue: Buttons disabled/greyed out
**Solution:** Start a session first using "▶ Start Session" button

### Issue: Messages not sending
**Solution:** Check backend is running; verify session ID in Network tab

### Issue: Profile section not showing
**Solution:** Not all session types have profiles; this is normal

### Issue: Timer not updating
**Solution:** Confirm backend returns correct time endpoint; check console for errors

### Issue: Styles look broken
**Solution:** Clear browser cache (Ctrl+Shift+Delete) and reload page

## 🏗️ Architecture Overview

```
User
  ↓
CasesPage (React)
  ↓ clicks START
  ↓
AppPage (React)
  ↓
SessionContext (State)
  ↓
Chat/Eval Tabs (Components)
  ↓
API Endpoints (Backend)
  ↓
Database/LLMs
```

## 📚 File Size Reference

| File               | Size       | Type           |
| ------------------ | ---------- | -------------- |
| SessionContext.jsx | ~5 KB      | Logic          |
| ChatTab.jsx        | ~3 KB      | Component      |
| PatientEvalTab.jsx | ~3 KB      | Component      |
| TraineeEvalTab.jsx | ~4 KB      | Component      |
| AppPage.jsx        | ~4 KB      | Container      |
| AppPage.css        | ~15 KB     | Styling        |
| **Total**          | **~34 KB** | **Additional** |

## 🎨 Customization Tips

### Change the Color Scheme
Edit `src/styles/AppPage.css` `:root` variables:
```css
:root {
  --accent: #6c63ff;        /* Change primary color */
  --success: #22c55e;       /* Change success color */
  --danger: #ef4444;        /* Change error color */
  /* ... more colors ... */
}
```

### Adjust Timer Duration
Edit `src/context/SessionContext.jsx`:
```javascript
setRemainingSeconds(600);  // 600 = 10 minutes, change to desired value
```

### Modify Session Config Fields
Edit `src/pages/AppPage.jsx` Session Config section and `SessionContext.jsx` to add new states

## 🚀 Next: Deployment

When ready to deploy:

1. **Build the React app:**
   ```bash
   npm run build
   ```

2. **Result:** Creates `dist/` folder with optimized files

3. **Serve in production:**
   ```bash
   npm run preview
   ```

4. **Deploy `dist/` to your web server**

## 📞 Support

For issues:
1. Check `REACT_INTEGRATION_GUIDE.md` for detailed documentation
2. Review `IMPLEMENTATION_COMPLETE.md` for architecture details
3. Check browser console for error messages
4. Use Network tab to verify API calls
5. Review component source code with comments

---

**You're all set!** 🎉 Start the dev server and enjoy the new React app!
