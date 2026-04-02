# ChatBridge Cost Analysis

## Model

Claude claude-sonnet-4 (`claude-sonnet-4-20250514`)
- Input: $3.00 / million tokens
- Output: $15.00 / million tokens

## Per-Session Estimates

| Component | Input tokens | Output tokens |
|-----------|-------------|---------------|
| System prompt (base + chess/graph/quiz instructions) | ~800 | — |
| Tool schemas (3 plugins, 8 tools) | ~1,200 | — |
| Average user message | ~50 | — |
| Average assistant response | — | ~200 |
| Tool call + result round-trip | ~300 input | ~100 output |
| Chess game (avg 15 moves × 2 API calls/move) | ~9,000 | ~3,000 |
| Graph invocation (single tool call) | ~500 | ~300 |
| Quiz (5-card quiz, start + completion) | ~1,000 | ~400 |

**Typical session (8 turns, 3 tool invocations):**
- Input: ~12,000 tokens
- Output: ~3,000 tokens
- Cost: ~$0.081/session

## Prompt Caching Opportunity

The system prompt (~800 tokens) and tool schemas (~1,200 tokens) are static across all requests in a session. With Anthropic's prompt caching:
- First request: full price on cached prefix
- Subsequent requests: 90% discount on cached prefix (~2,000 tokens)
- Per-session savings: ~$0.005 (small per session, significant at scale)

At 10,000+ users, prompt caching on the static prefix saves ~15% of total input costs.

## Production Projections

Assumptions: 8 turns/session, 3 tool invocations/session, ~12,000 input tokens/session, ~3,000 output tokens/session.

| Scale | Sessions/month | Input tokens | Output tokens | Monthly cost |
|-------|---------------|-------------|---------------|-------------|
| Development | < 200 | 2.4M | 600K | ~$16 |
| 100 users | 300 | 3.6M | 900K | ~$24 |
| 1,000 users | 3,000 | 36M | 9M | ~$243 |
| 10,000 users | 30,000 | 360M | 90M | ~$2,430 |
| 100,000 users | 300,000 | 3.6B | 900M | ~$24,300 |

With prompt caching at scale (10,000+ users):

| Scale | Without caching | With caching | Savings |
|-------|----------------|-------------|---------|
| 10,000 users | $2,430 | $2,070 | 15% |
| 100,000 users | $24,300 | $20,655 | 15% |

## Infrastructure Costs

| Service | Free tier | Paid tier (est.) |
|---------|-----------|-----------------|
| Vercel | 100GB bandwidth, serverless | $20/mo Pro |
| Supabase | 500MB DB, 50K MAU | $25/mo Pro |
| Total infra | $0 | $45/mo |

## Cost Optimization Strategies

1. **Prompt caching**: Cache the static system prompt + tool schemas prefix
2. **Context summarization**: Summarize tool results older than 8 turns to reduce input tokens
3. **Selective tool injection**: Only inject tool schemas for plugins the user has used in the session
4. **Response length limits**: Set `max_tokens` appropriately per use case (1024 for chat, 512 for tool follow-ups)
5. **Rate limiting**: Already implemented at 60 req/min to prevent abuse

## Development Spend

Check the [Anthropic Console](https://console.anthropic.com/settings/usage) for actual token usage during the build week. Expected development cost: < $20 total.
