# Calendar Integration Troubleshooting Guide

## Problem Summary
The agent cannot read or write calendar events, even though manual frontend operations work.

## Root Causes Identified

### 1. **Backend Not Running or Wrong Port**
The `ECONNREFUSED` error means Next.js cannot connect to the backend at `localhost:8000`.

**Solution:**
```bash
# In voice-agent-app/backend directory
# Activate virtual environment first
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Mac/Linux

# Then start the backend
python main.py
```

**Verify it's running:**
- You should see: `INFO:     Uvicorn running on http://0.0.0.0:8000`
- Test manually: `curl http://localhost:8000/api/calendar`

### 2. **Frontend Proxy Configuration**
The Next.js `rewrites` in `next.config.ts` should proxy `/api/*` to `http://localhost:8000/api/*`.

**Current Configuration (should be correct):**
```javascript
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: "http://localhost:8000/api/:path*",
    },
  ];
}
```

**Important:** Restart the frontend server after changing `next.config.ts`!

### 3. **Backend Route Registration**
Routes in the backend must include the `/api` prefix directly.

**Verify in `api/calendar.py`:**
- `@router.get("/api/calendar", ...)`
- `@router.post("/api/calendar", ...)`

**Verify in `main.py`:**
- `app.include_router(calendar.router, tags=["calendar"])` (NO prefix here)

### 4. **LLM Needs Current Date/Time**
The system prompt must include the current date and time so the agent can construct proper timestamps.

**Verified in `utils/prompt_templates.py`:**
```python
Current context: You are having a real-time voice conversation with a user. The current date and time is {current_date_time}.
```

**Verified in `websocket_handler.py`:**
```python
current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
```

## Complete Test Flow

### Step 1: Verify Backend
```bash
# Terminal 1: Start backend
cd voice-agent-app/backend
venv\Scripts\activate  # Windows
python main.py
```

Expected output:
```
🛠️ Tools initialized and registered.
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Step 2: Test Backend Directly
Open a new terminal:
```bash
# Test GET endpoint
curl http://localhost:8000/api/calendar

# Test POST endpoint
curl -X POST http://localhost:8000/api/calendar \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event",
    "startTime": "2025-10-30T14:00:00",
    "endTime": "2025-10-30T15:00:00",
    "participants": ["user@example.com"]
  }'
```

Both should work without errors.

### Step 3: Verify Frontend
```bash
# Terminal 2: Start frontend
cd voice-agent-app/voice-agent
npm run dev
```

Expected output:
```
 ✓ Ready in XXXms
 ○ Local:        http://localhost:3006
```

### Step 4: Test Manual Event Addition
1. Open http://localhost:3006/calendar
2. Click the "+" button
3. Fill out the form
4. Click "Add Event"
5. **Success:** Event appears immediately

### Step 5: Test Agent Calendar Access
1. Go to http://localhost:3006
2. Click "Start conversation"
3. Say: **"Check my calendar for today"**
4. **Expected:** Agent lists events for today
5. Say: **"Book a meeting for tomorrow at 3 PM called 'Team Sync'"**
6. **Expected:** Agent confirms booking
7. Go to Calendar page
8. **Expected:** New event appears

## Common Errors and Fixes

### Error: "Failed to proxy ... ECONNREFUSED"
**Cause:** Backend not running or wrong port
**Fix:** Start backend with `python main.py` in backend directory

### Error: "404 Not Found" for /api/calendar
**Cause:** Route registration mismatch
**Fix:** 
- Ensure routes in `api/calendar.py` start with `/api/calendar`
- Ensure `main.py` includes router WITHOUT prefix
- Restart both servers

### Error: Agent says "You have no events" when events exist
**Cause:** Tool is not receiving correct date
**Fix:**
- Verify system prompt includes `{current_date_time}`
- Verify `websocket_handler.py` injects current time
- Restart backend

### Error: Agent can't book appointments (asks for timezone)
**Cause:** LLM doesn't have current date/time context
**Fix:** Same as above - ensure system prompt has current time

### Error: "Invalid schema for function"
**Cause:** Tool schema format is incorrect
**Fix:**
- Tool schemas must have `type: "function"` at top level
- Use `@property` for `name`, `description`, and `schema` in tool classes
- Restart backend

## Tool Schema Verification

Both tools should have this structure:

```python
class CalendarTool(Tool):
    name = "check_calendar"
    description = "Checks the calendar for events..."
    
    @property
    def schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": { ... },
                    "required": [ ... ],
                },
            },
        }
```

## Final Checklist

- [ ] Backend running on port 8000
- [ ] `curl http://localhost:8000/api/calendar` returns events
- [ ] Frontend running on port 3006
- [ ] Manual event addition works in UI
- [ ] System prompt includes current date/time
- [ ] Both tools registered (check startup logs for "🛠️ Tools initialized")
- [ ] Ask agent to check calendar - works
- [ ] Ask agent to book appointment - works
- [ ] New appointment appears in calendar UI

## If All Else Fails

1. **Kill all Node and Python processes**
2. **Restart backend:** `cd voice-agent-app/backend && venv\Scripts\activate && python main.py`
3. **Restart frontend:** `cd voice-agent-app/voice-agent && npm run dev`
4. **Clear browser cache** and reload
5. **Check browser console** for errors
6. **Check backend terminal** for errors

## Success Indicators

When everything is working:
- Backend logs: `🛠️ Tools initialized and registered`
- Agent responds: "On 2025-10-29, you have the following events: ..."
- Agent responds: "Successfully booked 'Team Sync' on October 30, 2025 at 3:00 PM."
- Calendar UI shows all events including agent-booked ones

