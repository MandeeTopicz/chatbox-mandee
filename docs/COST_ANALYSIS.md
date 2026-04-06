# ChatBridge Cost Analysis

## Model

Claude claude-sonnet-4 (`claude-sonnet-4-20250514`)

- Input: $3.00 / million tokens
- Output: $15.00 / million tokens

## Development and Testing Costs (Actual)

| Metric | Value |
|--------|-------|
| ChatBridge API calls (via app) | 21 |
| Input tokens (app) | ~25,200 |
| Output tokens (app) | ~6,300 |
| App-specific LLM cost | ~$0.17 |
| Date range | April 1 to April 5, 2026 |

**Note:** Total workspace usage during the build week was 7.0M input tokens and 64.9K output tokens (~$22), the majority of which was Claude Code generating the application code itself. The 21 Claude API calls above represent actual ChatBridge user interactions during development and testing, measured directly from the `messages` table.

## Per-Session Cost Breakdown

Based on observed usage: ~1,200 input tokens and ~300 output tokens per Claude call, with an average of 3 Claude calls per user session (one initial message, one tool invocation follow-up, one closing response).

| Component | Tokens | Cost |
|-----------|--------|------|
| Input per session | ~3,600 | ~$0.011 |
| Output per session | ~900 | ~$0.014 |
| **Total per session** | **~4,500** | **~$0.025** |

## Production Cost Projections

**Assumptions:** 10 sessions per user per month, 3 Claude calls per session, 1 tool invocation per session on average.

| Scale | Users | Sessions/month | Est. cost/month | Cost per user |
|-------|-------|----------------|-----------------|---------------|
| 100 users | 100 | 1,000 | ~$25 | $0.25 |
| 1,000 users | 1,000 | 10,000 | ~$250 | $0.25 |
| 10,000 users | 10,000 | 100,000 | ~$2,500 | $0.25 |
| 100,000 users | 100,000 | 1,000,000 | ~$25,000 | $0.25 |

Pricing based on claude-sonnet-4: $3.00 per million input tokens, $15.00 per million output tokens.

## How Cost Scales and Where to Optimize

**At low scale** (under 1,000 users) the LLM cost is negligible. The dominant costs are infrastructure: Supabase Pro at $25/month and Vercel Pro at $20/month. LLM cost does not become the primary expense until roughly 5,000 active users.

**At mid scale** (1,000 to 10,000 users) the cost remains linear at approximately $0.025 per session. No architectural changes are needed. Prompt caching becomes worth enabling at this tier.

**At high scale** (10,000 to 100,000 users) three levers reduce cost significantly:

1. **Prompt caching** is the largest single lever. Tool schemas are injected into every Claude request and are identical across all sessions for a given school. Anthropic's prompt caching reduces cached input token cost by up to 90%. Since tool schemas account for roughly 40 percent of input tokens per request, enabling caching reduces total input cost by approximately 36 percent. At 100,000 users this saves roughly $9,000 per month.

2. **Model tiering** is the second lever. Not every interaction requires claude-sonnet-4. Greeting messages, simple quiz feedback, and graph explanations could run on claude-haiku-4-5 at roughly one fifth the cost. Routing short, low-stakes interactions to Haiku while reserving Sonnet for chess analysis and complex tutoring responses would reduce blended cost by an estimated 30 to 40 percent at scale.

3. **Context window management** becomes critical beyond 10,000 users. Long conversations with many tool invocations accumulate tokens rapidly. Summarizing tool results older than 8 turns and compressing conversation history keeps per-session token counts bounded. Without this, heavy users with long sessions could cost 3 to 5 times the average.

Infrastructure costs at scale also shift. Supabase scales on compute and egress. At 100,000 users a dedicated Supabase instance ($599/month) replaces the Pro tier. Vercel scales on function execution and bandwidth but remains cost-efficient for Next.js. Total infrastructure cost at 100,000 users is estimated at $1,500 to $2,500 per month on top of LLM costs, bringing the fully-loaded cost to approximately $27,000 to $28,000 per month or $0.27 to $0.28 per user per month.

---

## Google Classroom API

Google Classroom API calls (listing courses, creating assignments) are **free** and do not consume any LLM tokens. They are direct REST calls to Google's API using the teacher's OAuth tokens. These calls:

- Do not route through Claude
- Do not count toward Anthropic API usage
- Are not rate-limited by ChatBridge (Google has its own quotas)
- Have no per-call cost from Google

The `post_to_classroom` tool registered as a plugin can be invoked by Claude, but the tool call itself only costs the standard tool-use tokens (~300 input, ~100 output). The actual Google API call that follows is free.

---

## Infrastructure Costs (baseline)

| Service | Free tier | Paid tier (est.) |
|---------|-----------|------------------|
| Vercel | 100GB bandwidth, serverless | $20/mo Pro |
| Supabase | 500MB DB, 50K MAU | $25/mo Pro |
| Total infra | $0 | $45/mo |

## Additional Cost Optimization Strategies

1. **Prompt caching**: Cache the static system prompt + tool schemas prefix (see scaling section above).
2. **Context summarization**: Summarize tool results older than 8 turns to reduce input tokens.
3. **Selective tool injection**: Only inject tool schemas for plugins the user has used in the session.
4. **Response length limits**: Set `max_tokens` appropriately per use case (1024 for chat, 512 for tool follow-ups).
5. **Rate limiting**: Already implemented at 60 req/min to prevent abuse.
