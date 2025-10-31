# Voice Agent Testing Guide

## 🚀 Quick Start

### 1. Activate Virtual Environment (Windows)
```bash
cd C:\Users\Shahr\Thesis\csm_app\voice-agent-app\backend
venv\Scripts\activate
```

### 2. Install/Update Dependencies
```bash
pip install -r requirements.txt
```

### 3. Check Environment Variables
Ensure your `.env` file contains:
```env
SONIOX_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
VOGENT_API_KEY=your_key_here
VOGENT_VOICE_ID=your_voice_id_here
```

### 4. Start the Backend Server
```bash
python main.py
```

Server should start on `http://localhost:8000`

## 🧪 Test Scenarios

### Test 1: Basic Context Memory
**Goal**: Verify agent remembers event details

```
Conversation Flow:
1. User: "Add a meeting tomorrow at 3 PM"
2. Agent: "I'd be happy to help. What should I call this meeting?"
3. User: "QM Meeting"
4. Agent: "Got it. Where will the QM meeting take place?"
5. User: "University of Bremen"
6. Agent: [Confirms and creates event]
7. User: "Where is the QM meeting?"
8. ✅ Expected: Agent should respond with "University of Bremen"
```

**Success Criteria**:
- ✅ Agent asks for all details (title, location)
- ✅ Agent remembers location when asked later
- ✅ No context loss between messages

### Test 2: Multiple Events Context
**Goal**: Verify agent can track multiple events separately

```
Conversation Flow:
1. Create "QM Meeting" at "University of Bremen" on Nov 1
2. Create "Team Sync" at "Virtual/Zoom" on Nov 2
3. User: "Where is the QM meeting?"
4. ✅ Expected: "University of Bremen"
5. User: "Where is the Team Sync?"
6. ✅ Expected: "Virtual/Zoom"
```

**Success Criteria**:
- ✅ Agent distinguishes between different events
- ✅ Correct location for each event
- ✅ No confusion between events

### Test 3: Long Conversation Memory
**Goal**: Verify memory persists through long conversations

```
Conversation Flow:
1. Create event with location
2. Have 20+ unrelated exchanges (ask about weather, time, etc.)
3. Ask about the event location
4. ✅ Expected: Agent still remembers the location
```

**Success Criteria**:
- ✅ Agent maintains context through extended conversation
- ✅ No memory loss after many messages
- ✅ Event details accessible throughout session

### Test 4: Calendar Query with Details
**Goal**: Verify check_calendar returns full information

```
Conversation Flow:
1. Create event with title, time, and location
2. User: "Check my calendar for tomorrow"
3. ✅ Expected: Response includes title, time, AND location
4. User: "Where is that event?"
5. ✅ Expected: Agent can answer without calling tool again
```

**Success Criteria**:
- ✅ Calendar check returns complete details
- ✅ Agent remembers tool response
- ✅ Follow-up questions answered from memory

### Test 5: Event Creation Flow
**Goal**: Verify complete event creation with all details

```
Conversation Flow:
1. User: "Schedule a meeting"
2. Agent asks for: title, date, time, location
3. Agent summarizes ALL details
4. Agent waits for confirmation
5. ✅ Expected: Event created with all fields populated
```

**Success Criteria**:
- ✅ Agent collects all required information
- ✅ Confirmation includes all details
- ✅ Created event has title, time, and location

## 🔍 Debugging Tips

### Check Logs for:
1. **Agent Creation**
   ```
   ✅ Created new persistent agent
   ```
   Should appear ONCE per session

2. **Memory Preservation**
   ```
   📝 Updated system prompt (agent memory preserved)
   ```
   System prompt can update without losing memory

3. **Event Operations**
   ```
   📅 Retrieved X event(s) for YYYY-MM-DD
   ✅ Created event: Title | Date | Location
   ```

4. **Conversation Growth**
   ```
   💬 Conversation history: X messages
   ```
   Should increase with each exchange

### Common Issues

**Issue**: Agent forgets details
- **Check**: Is agent being recreated? (Should only see "Created new persistent agent" once)
- **Check**: Are logs showing full conversation history count?

**Issue**: Location not returned
- **Check**: Is check_calendar tool returning location in its response?
- **Check**: Look for "📅 Retrieved..." logs

**Issue**: Agent doesn't use previous context
- **Check**: System prompt should mention "FULL conversation history"
- **Check**: Verify conversation_history list is growing

## 📊 Performance Metrics

Monitor these during testing:

1. **Response Time**
   - Initial response: < 2 seconds
   - Tool calls: 2-4 seconds
   - Should feel "real-time"

2. **Memory Usage**
   - Conversation history should grow linearly
   - Summarization kicks in at 30+ messages

3. **Context Accuracy**
   - 100% retention of event details
   - Correct responses to "where" questions
   - No confusion between multiple events

## 🎯 Success Metrics

The implementation is successful if:

1. ✅ Agent never forgets discussed details
2. ✅ Location questions answered accurately
3. ✅ Context maintained through long conversations
4. ✅ Multiple events tracked separately
5. ✅ Natural, flowing conversation
6. ✅ Fast, responsive interaction
7. ✅ Complete event information in calendar checks

## 🐛 Reporting Issues

If you find context loss:

1. **Check the logs** for agent recreation
2. **Verify** conversation history count is growing
3. **Confirm** tools are receiving context
4. **Review** system prompt is emphasizing memory
5. **Check** that `last_event_context` is being updated

## 📝 Testing Checklist

- [ ] Agent created once per session
- [ ] System prompt updates don't reset memory
- [ ] Location included in calendar responses
- [ ] Event details remembered throughout conversation
- [ ] Multiple events tracked correctly
- [ ] Follow-up questions answered from memory
- [ ] Response time < 3 seconds average
- [ ] Natural conversation flow
- [ ] Complete event creation workflow
- [ ] Long conversation memory (20+ messages)

## 💡 Tips for Best Results

1. **Speak naturally** - The agent understands conversational language
2. **Confirm details** - Agent will ask for confirmation before creating events
3. **Ask follow-ups** - Test memory by asking about previously discussed details
4. **Use specific dates** - "Tomorrow" or specific dates both work
5. **Provide locations** - Agent will ask for event locations

## 🎉 Expected Behavior

After these improvements, you should experience:
- **Intelligent conversations** that build on previous exchanges
- **Perfect memory** of all details discussed
- **Natural responses** that reference earlier context
- **Complete information** in event queries
- **Fast, responsive** interaction
- **Context awareness** throughout entire session

---

**Note**: These improvements make the agent significantly more intelligent and context-aware compared to the previous implementation where it would forget details after just a few exchanges.

