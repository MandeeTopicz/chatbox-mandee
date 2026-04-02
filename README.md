# ChatBridge

ChatBridge is an AI chat platform for TutorMeAI that enables third-party educational applications to run inside the chat window. The AI tutor (powered by Claude) remains aware of what is happening inside those applications — it can invoke them, respond to their output, and continue the conversation with full context. The platform ships with three integrated plugins: a chess game with persistent player profiles, a graphing calculator with structured data analysis, and a flashcard quiz system with teacher-authored content and personalized follow-up.

**Deployed URL:** _[set after Vercel deployment]_

## Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

### Installation

```bash
git clone <your-fork-url>
cd chatbox-mandee
pnpm install
```

### Environment

Copy the example and fill in your keys:

```bash
cp .env.local.example .env.local
```

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role secret |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys |

### Database

Run the migration in the Supabase SQL Editor:

```sql
-- Paste the contents of supabase/migrations/001_initial_schema.sql
```

This creates 7 tables with Row Level Security enabled on all of them:

- `users` — platform auth, student/teacher roles
- `conversations` — chat sessions
- `messages` — full message history including tool calls
- `plugins` — registered third-party app registry
- `app_sessions` — per-conversation plugin state
- `chess_profiles` — win/loss/streak/rating per user
- `quizzes` — teacher-created flashcard sets

Disable "Confirm email" in Supabase Authentication → Providers → Email for development.

### Seed Plugins

```bash
npx tsx scripts/seed-all-plugins.ts
```

For production, set the base URL:

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app npx tsx scripts/seed-all-plugins.ts
```

### Run

```bash
pnpm next:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

ChatBridge is built on Next.js 14 App Router with TypeScript, Tailwind CSS, and shadcn/ui conventions. The backend runs entirely in Next.js API routes — there is no separate server. Authentication and data persistence use Supabase (Postgres + Auth), with Row Level Security enforcing access control at the database layer rather than the application layer.

The chat system sends user messages to a server-side API route (`/api/chat`) that calls the Anthropic API with Claude claude-sonnet-4. Before each request, the route loads all approved plugins from the database and injects their tool schemas into the Claude request. When Claude decides to use a tool, the response is intercepted: instead of streaming text, the server sends a structured SSE event to the frontend indicating which tool was called and with what parameters.

The frontend receives this event and activates the corresponding plugin. Plugins are self-contained HTML files served from `/public/plugins/` and rendered inside sandboxed iframes (`sandbox="allow-scripts"` only — `allow-same-origin` is never used). Communication between the platform and plugins follows a typed postMessage protocol. The platform sends `TOOL_INVOKE` messages to the iframe; the iframe responds with `TOOL_RESULT`, `STATE_UPDATE`, or `PLUGIN_COMPLETE` messages. Every inbound message is validated against the registered plugin ID and conversation ID before processing.

When a plugin sends a `TOOL_RESULT`, the frontend forwards it back to `/api/chat`, which injects it into the Claude conversation as a `tool_result` content block and gets Claude's follow-up response. This creates a loop: user speaks → Claude calls tool → plugin processes → result flows back to Claude → Claude responds with context. For stateful plugins like chess, the current game state (FEN) is persisted in the `app_sessions` table and injected into Claude's system prompt on each turn, keeping the AI aware of the live application state.

The flashcard quiz adds a teacher auth gate: quiz creation endpoints check `role=teacher` both in the API route and via RLS policies on the `quizzes` table. Students can take quizzes but cannot create or modify them.

Security is layered: RLS on all tables, iframe sandboxing, postMessage origin validation, tool result schema validation, rate limiting (60 chat/min, 30 tool/min), circuit breaker on plugin failures, CSP headers, and React error boundaries.

## Plugin Contract

Plugins communicate with the platform via `window.postMessage`. Every message has the shape:

```typescript
{
  type: string
  conversationId: string
  pluginId: string
  payload: object
}
```

### Message Types

| Type | Direction | Description |
|------|-----------|-------------|
| `PLUGIN_READY` | Plugin → Platform | Plugin has loaded and is ready to receive tool invocations. |
| `TOOL_INVOKE` | Platform → Plugin | Claude called a tool. Contains `toolName`, `params`, and `invocationId`. |
| `TOOL_RESULT` | Plugin → Platform | Tool execution result. Contains `invocationId`, `result`, and optional `error`. |
| `STATE_UPDATE` | Plugin → Platform | Current application state. Stored in `app_sessions`, passed to Claude on next turn. |
| `PLUGIN_COMPLETE` | Plugin → Platform | Task complete. Contains a `summary` string with context for Claude's follow-up. |
| `PLUGIN_ERROR` | Plugin → Platform | Application-level error. Counts toward the circuit breaker (3 = disabled). |

### Registering a New Plugin

1. Create a self-contained HTML file in `public/plugins/your-plugin/index.html`
2. On load, send `PLUGIN_READY` via `parent.postMessage()`
3. Listen for `TOOL_INVOKE` messages, process them, send `TOOL_RESULT` back
4. Add the plugin to the `plugins` table with tool schemas (use `scripts/seed-all-plugins.ts` as a template)
5. Set `allowed: true` to activate

## Deployment (Vercel)

1. Push repo to GitHub
2. Import in Vercel, set build command to `next build`
3. Add all 4 environment variables from `.env.local`
4. In Supabase Auth settings, add the Vercel URL to Site URL and Redirect URLs
5. Re-seed plugins with the production URL:
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app npx tsx scripts/seed-all-plugins.ts
   ```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui conventions |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| LLM | Anthropic Claude claude-sonnet-4 with tool use |
| Plugin layer | iframe + postMessage (sandboxed) |
| Streaming | Server-Sent Events (SSE) |
| Deployment | Vercel |
