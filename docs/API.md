# ChatBridge API Reference

## Authentication

All endpoints require an authenticated Supabase session (cookie-based). Unauthenticated requests return `401 Unauthorized`.

---

## Chat

### POST /api/chat

Stream an AI response. Handles both user messages and tool result submissions.

**Auth:** Required

**Request Body:**

```json
// New user message
{ "message": "string", "conversationId": "uuid | null" }

// Tool result submission
{ "conversationId": "uuid", "toolResult": { "toolUseId": "string", "result": {}, "toolName": "string" } }
```

**Response:** `text/event-stream` (SSE)

```
data: {"type":"conversation_id","id":"uuid"}
data: {"type":"text_delta","text":"Hello..."}
data: {"type":"tool_invoke","toolUseId":"id","toolName":"start_chess_game","params":{},"pluginId":"uuid","pluginName":"chess","pluginUrl":"..."}
data: {"type":"done","stopReason":"end_turn"}
data: {"type":"error","error":"message"}
```

**Errors:** `400` bad request, `401` unauthorized, `404` conversation not found, `429` rate limited, `500` server error

**Rate Limits:** 60 requests/minute per user. 30 tool result submissions/minute per user.

---

## Conversations

### GET /api/conversations

List all conversations for the authenticated user.

**Response:** `200`
```json
[{ "id": "uuid", "title": "string", "created_at": "timestamp", "updated_at": "timestamp" }]
```

### GET /api/conversations/[id]

Get conversation with full message history.

**Response:** `200`
```json
{
  "id": "uuid", "title": "string", "created_at": "timestamp", "updated_at": "timestamp",
  "messages": [{ "id": "uuid", "role": "user|assistant|system|tool", "content": "string", "tool_calls": null, "tool_results": null, "created_at": "timestamp" }]
}
```

**Errors:** `404` not found

### DELETE /api/conversations/[id]

Delete a conversation and all its messages.

**Response:** `200` `{ "success": true }`

---

## Plugins

### GET /api/plugins

List all approved plugins with tool schemas.

**Response:** `200`
```json
[{ "id": "uuid", "name": "string", "url": "string", "tool_schemas": [...], "created_at": "timestamp" }]
```

### POST /api/plugins

Register a new plugin. Requires teacher role.

**Request Body:**
```json
{ "name": "string", "url": "string", "tool_schemas": [{ "name": "string", "description": "string", "input_schema": {} }] }
```

**Response:** `201`
```json
{ "id": "uuid", "name": "string", "url": "string", "allowed": false, "created_at": "timestamp" }
```

**Errors:** `403` not a teacher, `409` plugin name already exists

---

## Quizzes

### GET /api/quizzes

List all quizzes. Optional `?topic=` filter (case-insensitive partial match).

**Response:** `200`
```json
[{ "id": "uuid", "title": "string", "topic": "string", "created_at": "timestamp" }]
```

### GET /api/quizzes/[id]

Get full quiz content including cards.

**Response:** `200`
```json
{ "id": "uuid", "teacher_id": "uuid", "title": "string", "topic": "string", "cards": [{ "question": "string", "answer": "string" }], "created_at": "timestamp" }
```

### POST /api/quizzes

Create a new quiz. **Requires role=teacher.**

**Request Body:**
```json
{ "title": "string", "topic": "string", "cards": [{ "question": "string", "answer": "string" }] }
```

**Response:** `201`
```json
{ "id": "uuid", "title": "string", "topic": "string", "created_at": "timestamp" }
```

**Errors:** `403` not a teacher, `400` invalid cards

---

## Chess

### GET /api/chess/profile

Get authenticated user's chess stats.

**Response:** `200`
```json
{ "wins": 0, "losses": 0, "draws": 0, "streak": 0, "rating": 1200, "hasProfile": false }
```

### POST /api/chess/result

Record a game result. Updates chess profile.

**Request Body:**
```json
{ "outcome": "win|loss|draw" }
```

**Response:** `200`
```json
{ "wins": 1, "losses": 0, "draws": 0, "streak": 1, "rating": 1225 }
```

---

## App Sessions

### POST /api/app-sessions

Persist plugin state for a conversation.

**Request Body:**
```json
{ "conversationId": "uuid", "pluginId": "uuid", "state": {} }
```

**Response:** `200` `{ "success": true }`

---

## Google Classroom

### GET /api/auth/google

Initiates the Google OAuth flow. Redirects the authenticated teacher to Google's consent screen with scopes `classroom.courses.readonly` and `classroom.coursework.students`.

**Auth:** Required (redirects to /login if not authenticated)
**Response:** `302` redirect to Google OAuth URL

---

### GET /api/auth/google/callback

Handles the Google OAuth callback. Exchanges the authorization code for tokens, encrypts them with AES-256-GCM, and stores in the `google_tokens` table.

**Query params:** `code` (authorization code), `state` (user ID for CSRF verification)
**Response:** `302` redirect to `/teacher?google_connected=true` on success

**Error redirects:**
- `/teacher?google_error=denied` — user denied consent
- `/teacher?google_error=state_mismatch` — CSRF state mismatch
- `/teacher?google_error=token_exchange` — token exchange failed

---

### GET /api/classroom/courses

Returns the authenticated teacher's active Google Classroom courses.

**Auth:** Requires teacher role + connected Google account

**Response:** `200`
```json
[{ "id": "123456", "name": "AP History", "section": "Period 3" }]
```

**Errors:** `401` with `{ "needsAuth": true }` (Google not connected), `403` not a teacher

---

### POST /api/classroom/post-quiz

Posts a ChatBridge quiz to a Google Classroom course as an assignment.

**Auth:** Requires teacher role + connected Google account

**Request Body:**
```json
{ "quizId": "uuid", "courseId": "google-classroom-course-id" }
```

**Response:** `201`
```json
{ "success": true, "assignmentId": "google-assignment-id", "title": "Civil War Key Events" }
```

**Errors:** `401` with `{ "needsAuth": true }` (Google not connected), `404` quiz not found

---

### google_tokens Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid (PK, FK → users) | The teacher's user ID |
| `access_token` | text | AES-256-GCM encrypted Google access token |
| `refresh_token` | text | AES-256-GCM encrypted Google refresh token |
| `expires_at` | timestamptz | When the access token expires |
| `created_at` | timestamptz | Row creation time |

**RLS:** Users can only read/write their own row. Tokens are never returned raw from any API endpoint.

**Encryption:** AES-256-GCM with a 32-byte key from `ENCRYPTION_KEY`. Each value = base64(IV + ciphertext + authTag).

---

## Plugin postMessage Protocol

All messages between the platform and plugin iframes follow this shape:

```typescript
{
  type: string
  conversationId: string
  pluginId: string
  payload: object
}
```

### PLUGIN_READY (Plugin → Platform)

Sent when the plugin iframe has loaded and is ready.

```json
{ "type": "PLUGIN_READY", "conversationId": "...", "pluginId": "...", "payload": {} }
```

### TOOL_INVOKE (Platform → Plugin)

Sent when Claude calls a registered tool.

```json
{ "type": "TOOL_INVOKE", "conversationId": "...", "pluginId": "...", "payload": { "toolName": "start_chess_game", "params": {}, "invocationId": "toolu_..." } }
```

### TOOL_RESULT (Plugin → Platform)

Response to a TOOL_INVOKE.

```json
{ "type": "TOOL_RESULT", "conversationId": "...", "pluginId": "...", "payload": { "invocationId": "toolu_...", "result": { "fen": "...", "status": "active" }, "error": null } }
```

### STATE_UPDATE (Plugin → Platform)

Push current state for persistence and Claude context.

```json
{ "type": "STATE_UPDATE", "conversationId": "...", "pluginId": "...", "payload": { "state": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1" } }
```

### PLUGIN_COMPLETE (Plugin → Platform)

Signal that the plugin's task is done.

```json
{ "type": "PLUGIN_COMPLETE", "conversationId": "...", "pluginId": "...", "payload": { "summary": "Chess game ended. White won by checkmate after 24 moves." } }
```

### PLUGIN_ERROR (Plugin → Platform)

Report an error. 3 consecutive errors trigger the circuit breaker.

```json
{ "type": "PLUGIN_ERROR", "conversationId": "...", "pluginId": "...", "payload": { "code": "LOAD_FAILED", "message": "Could not load chess engine" } }
```
