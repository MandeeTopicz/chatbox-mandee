# ChatBridge Manual Break Test Checklist

Run through each test before the demo. All should pass without crashing the chat session.

## 1. Fake postMessage (origin validation)

Open browser console and run:

```javascript
window.postMessage({
  type: 'TOOL_RESULT',
  conversationId: 'fake',
  pluginId: 'fake',
  payload: { invocationId: 'fake', result: { injected: true } }
}, '*')
```

**Expected:** Message is silently ignored. No error in console. Chat continues normally.

## 2. Rate limiting (429)

Open browser console and run:

```javascript
for (let i = 0; i < 65; i++) {
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test ' + i })
  }).then(r => { if (r.status === 429) console.log('Rate limited at request', i) })
}
```

**Expected:** Requests after #60 return 429 with `Retry-After` header. Error message shown in chat if triggered via UI.

## 3. Circuit breaker (plugin errors)

Modify the test stub to send 3 PLUGIN_ERROR messages:

```javascript
// In browser console while a plugin is loaded:
// (This simulates — in practice, modify test-stub/index.html)
for (let i = 0; i < 3; i++) {
  window.postMessage({
    type: 'PLUGIN_ERROR',
    conversationId: 'test',
    pluginId: 'test',
    payload: { code: 'TEST', message: 'Deliberate error ' + (i+1) }
  }, '*')
}
```

**Expected:** After 3 errors, plugin panel shows "Plugin disabled for this session" with a red alert. No further invocations accepted.

## 4. Teacher auth gate (role enforcement)

Log in as a **student** account and navigate to:

```
http://localhost:3000/teacher/quizzes/new
```

**Expected:** Redirected to `/chat`. No access to the quiz creation form.

## 5. Quiz API 403 (server-side role check)

As a student, open console and run:

```javascript
fetch('/api/quizzes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Hacked Quiz', topic: 'test', cards: [{ question: 'q', answer: 'a' }] })
}).then(r => r.json()).then(console.log)
```

**Expected:** Returns `{ "error": "Forbidden: only teachers can create quizzes" }` with status 403.

## 6. RLS enforcement (direct table access)

Using the Supabase dashboard or `supabase-js` client, try to read another user's conversations:

```sql
SELECT * FROM conversations WHERE user_id != auth.uid();
```

**Expected:** Returns 0 rows regardless of how many conversations exist for other users.

## 7. Claude API timeout

To test: temporarily reduce the timeout in `app/api/chat/route.ts` from 30000 to 1 (1ms):

```javascript
setTimeout(() => reject(new Error('Claude API timed out')), 1)
```

**Expected:** Chat shows "Error: Claude API timed out after 30 seconds" in the assistant message. Chat remains usable. (Revert after testing.)

## 8. Plugin iframe load failure

Change a plugin URL in the database to a non-existent path:

```sql
UPDATE plugins SET url = 'http://localhost:3000/plugins/nonexistent.html' WHERE name = 'chess';
```

**Expected:** After 10 seconds, plugin panel shows "Plugin failed to load within 10 seconds". Chat remains usable. (Revert after testing.)

## 9. Error boundary

To test: temporarily add `throw new Error('test')` in the MessageList component render.

**Expected:** Error boundary catches it, shows "Something went wrong" with a "Try Again" button. Chat input remains functional. (Revert after testing.)

## Results

| # | Test | Pass/Fail | Notes |
|---|------|-----------|-------|
| 1 | Fake postMessage | | |
| 2 | Rate limiting | | |
| 3 | Circuit breaker | | |
| 4 | Teacher auth gate | | |
| 5 | Quiz API 403 | | |
| 6 | RLS enforcement | | |
| 7 | Claude API timeout | | |
| 8 | Plugin load failure | | |
| 9 | Error boundary | | |
