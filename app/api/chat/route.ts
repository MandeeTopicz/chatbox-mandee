import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import { checkRateLimit, CHAT_LIMIT, TOOL_LIMIT } from '@/lib/rate-limit'
import { validateToolResult } from '@/lib/tool-result-validator'
import { logger } from '@/lib/logger'

const ROUTE = '/api/chat'

const anthropic = new Anthropic()

const BASE_SYSTEM_PROMPT = `You are ChatBridge, a friendly AI tutor for K-12 students.

RESPONSE STYLE:
- Keep responses SHORT — 1-3 sentences for simple actions, max 4-5 sentences for explanations.
- Do NOT list multiple options or suggestions unless the student specifically asks.
- When a tool is available for what the student wants, USE IT IMMEDIATELY without asking follow-up questions.
- After a tool result, give a brief natural summary. Do NOT echo JSON, FEN strings, or technical data.
- Never provide homework answers directly — guide discovery.

CHESS:
- "let's play chess" → immediately call start_chess_game. Brief response like "Board's ready! You're white — make your first move."
- When it's your turn as black, you MUST call make_move with {from, to} squares. Do NOT just describe your move in words — you must use the tool. Keep commentary to 1-2 sentences.
- Vary your openings! Randomly pick from: Sicilian (c5), French (e6), Caro-Kann (c6), Scandinavian (d5), Pirc (d6/Nf6), Dutch (f5), King's Indian setups, or other sound responses. Never play the same opening twice in a row.
- Play strong, creative chess. Adapt your style to the position — be tactical when ahead, solid when behind.
- "what should I do?" → call get_board_state, give brief tactical advice.
- After game ends, give a short 2-3 sentence summary of key moments.

GRAPHING:
- "graph x^2 - 4" → immediately call render_graph. Convert natural language to math notation.
- After render, briefly explain roots and shape in 2-3 sentences.

QUIZZES:
- "quiz me on [topic]" → immediately call start_quiz with that topic. Do NOT list available topics unless the student asks "what quizzes are available?"
- After quiz completes, focus on missed questions. 1 sentence per weak area.
- If the student asks for a topic that doesn't exist, say so briefly and suggest they ask what's available.

WEATHER:
- "what's the weather in [city]?" → immediately call get_weather with that city. Brief response.
- After result, connect it to learning if relevant (geography, climate, science).
- Keep weather responses short — 1-2 sentences about the conditions.

SPOTIFY:
- "make me a playlist about [topic]" → call create_playlist with a name and search query related to the topic.
- "find songs about [topic]" → call search_tracks with the topic as query.
- Connect music to learning when possible (e.g., "Here are some songs about space exploration!").
- Keep responses brief — 1-2 sentences about the results.`

export async function POST(request: Request) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    logger.warn('auth.unauthorized', { route: ROUTE })
    return new Response('Unauthorized', { status: 401 })
  }

  // Rate limiting: 60 chat requests/min per user
  const chatLimit = checkRateLimit(`chat:${user.id}`, CHAT_LIMIT.maxRequests, CHAT_LIMIT.windowMs)
  if (!chatLimit.allowed) {
    logger.warn('rate_limit.chat', { route: ROUTE, userId: user.id, data: { resetInMs: chatLimit.resetInMs } })
    return new Response(
      JSON.stringify({
        error: 'Rate limited',
        message: `Too many requests. Try again in ${Math.ceil(chatLimit.resetInMs / 1000)} seconds.`,
        retryAfterMs: chatLimit.resetInMs,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(chatLimit.resetInMs / 1000)) } }
    )
  }

  const body = await request.json()
  const { message, conversationId, toolResult } = body

  // toolResult flow: frontend sends back a tool result to continue the conversation
  // message flow: user sends a new chat message
  if (!message && !toolResult) {
    return new Response('Message or toolResult is required', { status: 400 })
  }

  logger.info('chat.request', { route: ROUTE, userId: user.id, data: { hasMessage: !!message, hasToolResult: !!toolResult, conversationId: conversationId || 'new' } })

  // Rate limiting for tool invocations: 30/min per user
  if (toolResult) {
    const toolLimit = checkRateLimit(`tool:${user.id}`, TOOL_LIMIT.maxRequests, TOOL_LIMIT.windowMs)
    if (!toolLimit.allowed) {
      logger.warn('rate_limit.tool', { route: ROUTE, userId: user.id })
      return new Response(
        JSON.stringify({
          error: 'Rate limited',
          message: `Too many tool invocations. Try again in ${Math.ceil(toolLimit.resetInMs / 1000)} seconds.`,
          retryAfterMs: toolLimit.resetInMs,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(toolLimit.resetInMs / 1000)) } }
      )
    }
  }

  // Get or create conversation
  let convId = conversationId
  if (!convId) {
    if (toolResult) {
      return new Response('conversationId required for tool results', { status: 400 })
    }
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: message.slice(0, 100) })
      .select('id')
      .single()

    if (convError) {
      return new Response(`Failed to create conversation: ${convError.message}`, {
        status: 500,
      })
    }
    convId = conv.id
  } else {
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', convId)
      .single()

    if (!conv) {
      return new Response('Conversation not found', { status: 404 })
    }
  }

  // Save user message (only for new messages, not tool results)
  if (message) {
    const { error: userMsgError } = await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
    })

    if (userMsgError) {
      return new Response(`Failed to save message: ${userMsgError.message}`, {
        status: 500,
      })
    }
  }

  // If this is a tool result, validate and save it to the DB
  if (toolResult) {
    // Validate and sanitize the tool result before storing/injecting into Claude context
    const toolName = toolResult.toolName || 'unknown'
    const validation = validateToolResult(toolName, toolResult.result)
    const passed = validation.warnings.length === 0
    logger.info('tool_result.received', { route: ROUTE, userId: user.id, data: { toolName, passed, warnings: validation.warnings.length } })
    if (validation.warnings.length > 0) {
      logger.warn('tool_result.validation_warnings', { route: ROUTE, userId: user.id, data: { toolName, warnings: validation.warnings } })
    }
    const sanitizedResult = validation.sanitized

    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'tool',
      content: JSON.stringify(sanitizedResult),
      tool_results: {
        tool_use_id: toolResult.toolUseId,
        result: sanitizedResult,
      } as unknown as Json,
    })
  }

  // Load conversation history for context
  const { data: history } = await supabase
    .from('messages')
    .select('role, content, tool_calls, tool_results')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })

  // Load allowed plugins and their tool schemas
  const { data: plugins } = await supabase
    .from('plugins')
    .select('id, name, url, tool_schemas')

  // Build Claude tools from plugin schemas
  const tools: Anthropic.Tool[] = []
  const pluginToolMap: Record<string, { pluginId: string; pluginName: string; pluginUrl: string }> = {}

  if (plugins) {
    for (const plugin of plugins) {
      const schemas = plugin.tool_schemas as Array<{
        name: string
        description: string
        input_schema: Anthropic.Tool.InputSchema
      }>
      if (Array.isArray(schemas)) {
        for (const schema of schemas) {
          tools.push({
            name: schema.name,
            description: schema.description,
            input_schema: schema.input_schema,
          })
          pluginToolMap[schema.name] = {
            pluginId: plugin.id,
            pluginName: plugin.name,
            pluginUrl: plugin.url,
          }
        }
      }
    }
  }

  // Load available quiz topics so Claude knows what exists
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('title, topic')

  let systemPrompt = BASE_SYSTEM_PROMPT
  if (quizzes && quizzes.length > 0) {
    const topicList = quizzes.map((q) => `"${q.topic}" (${q.title})`).join(', ')
    systemPrompt += `\n\nAVAILABLE QUIZZES: ${topicList}. Only suggest these topics for quizzes. If the student asks for a topic not listed, say no quiz exists for that topic yet.`
  }

  // Load active app sessions for this conversation (e.g., current chess FEN)
  if (convId) {
    const { data: appSessions } = await supabase
      .from('app_sessions')
      .select('plugin_id, state_blob')
      .eq('conversation_id', convId)

    if (appSessions && appSessions.length > 0) {
      const stateLines: string[] = []
      for (const session of appSessions) {
        // Look up plugin name
        const plugin = plugins?.find((p) => p.id === session.plugin_id)
        const name = plugin?.name || 'unknown'
        const state = session.state_blob

        if (name === 'chess' && typeof state === 'string') {
          stateLines.push(
            `\n\nACTIVE CHESS GAME:\nCurrent board position (FEN): ${state}\nThe chess board is currently displayed in the chat. You can use get_board_state for detailed analysis or make_move to suggest moves.`
          )
        } else if (state) {
          stateLines.push(`\n\nActive ${name} session state: ${JSON.stringify(state)}`)
        }
      }
      if (stateLines.length > 0) {
        systemPrompt += stateLines.join('')
      }
    }
  }

  // Build messages for Claude, properly handling tool use/result pairs
  const messages: Anthropic.MessageParam[] = buildClaudeMessages(history || [])

  // Stream response via SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Send conversation ID first
        send({ type: 'conversation_id', id: convId })

        const requestParams: Anthropic.MessageCreateParams = {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }

        // Only include tools if we have any
        if (tools.length > 0) {
          requestParams.tools = tools
        }

        // Use non-streaming to properly handle tool_use stop reasons
        // 30-second timeout on Claude API call
        const response = await Promise.race([
          anthropic.messages.create(requestParams),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Claude API timed out after 30 seconds')), 30_000)
          ),
        ])

        let fullTextContent = ''
        const toolCalls: Array<{
          id: string
          name: string
          input: Record<string, unknown>
        }> = []

        for (const block of response.content) {
          if (block.type === 'text') {
            fullTextContent += block.text
            // Send text in chunks for a streaming feel
            const chunkSize = 20
            for (let i = 0; i < block.text.length; i += chunkSize) {
              send({ type: 'text_delta', text: block.text.slice(i, i + chunkSize) })
            }
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            })
          }
        }

        // Save assistant message with any tool calls
        await supabase.from('messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullTextContent,
          tool_calls: toolCalls.length > 0 ? (toolCalls as unknown as Json) : null,
        })

        // If Claude called tools, send tool_invoke events to the frontend
        // Enrich tool params with server-side data for sandboxed iframes
        // (iframes with sandbox="allow-scripts" cannot make fetch requests)
        if (toolCalls.length > 0 && response.stop_reason === 'tool_use') {
          for (const call of toolCalls) {
            const pluginInfo = pluginToolMap[call.name]
            if (pluginInfo) {
              logger.info('tool.invoked', { route: ROUTE, userId: user.id, data: { toolName: call.name, pluginName: pluginInfo.pluginName } })
              // Enrich tool params with server-side data (iframes can't fetch)
              let enrichedParams = call.input
              if (call.name === 'start_quiz') {
                enrichedParams = await enrichQuizParams(supabase, call.input)
              } else if (call.name === 'get_weather') {
                enrichedParams = await enrichWeatherParams(call.input)
              } else if (call.name === 'search_tracks' || call.name === 'create_playlist') {
                enrichedParams = await enrichSpotifyParams(user.id, call.name, call.input)
              }

              send({
                type: 'tool_invoke',
                toolUseId: call.id,
                toolName: call.name,
                params: enrichedParams,
                pluginId: pluginInfo.pluginId,
                pluginName: pluginInfo.pluginName,
                pluginUrl: pluginInfo.pluginUrl,
              })
            }
          }
        } else {
          // Normal completion — update conversation title if first exchange
          if (history && history.length <= 1 && message) {
            await supabase
              .from('conversations')
              .update({ title: message.slice(0, 100) })
              .eq('id', convId)
          }
        }

        send({ type: 'done', stopReason: response.stop_reason })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error('chat.stream_error', { route: ROUTE, userId: user.id, data: { error: errorMessage } })
        send({ type: 'error', error: errorMessage })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

interface DbMessage {
  role: string
  content: string
  tool_calls: Json | null
  tool_results: Json | null
}

/**
 * Build Claude-compatible message array from DB history.
 * Handles tool_use / tool_result pairs correctly.
 */
function buildClaudeMessages(history: DbMessage[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = []

  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content })
    } else if (msg.role === 'assistant') {
      // Build content blocks for assistant messages
      // Use Anthropic.ContentBlockParam for request-compatible types
      const content: Array<
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
      > = []

      // Add text content if present
      if (msg.content) {
        content.push({ type: 'text', text: msg.content })
      }

      // Add tool_use blocks if present
      if (msg.tool_calls) {
        const calls = msg.tool_calls as Array<{
          id: string
          name: string
          input: Record<string, unknown>
        }>
        for (const call of calls) {
          content.push({
            type: 'tool_use',
            id: call.id,
            name: call.name,
            input: call.input,
          })
        }
      }

      messages.push({
        role: 'assistant',
        content: content.length > 0 ? content : msg.content,
      })
    } else if (msg.role === 'tool') {
      // Tool results must be sent as user messages with tool_result content
      const toolResults = msg.tool_results as {
        tool_use_id: string
        result: unknown
      } | null

      if (toolResults) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolResults.tool_use_id,
              content: JSON.stringify(toolResults.result),
            },
          ],
        })
      }
    }
  }

  // Fix orphaned tool_use blocks: if the last assistant message has tool_use
  // but there's no following tool_result, add synthetic error results so Claude
  // doesn't reject the request. This happens when a plugin fails to load.
  if (messages.length > 0) {
    const last = messages[messages.length - 1]
    if (last.role === 'assistant' && Array.isArray(last.content)) {
      const toolUseBlocks = (last.content as Array<{ type: string; id?: string }>).filter(
        (b) => b.type === 'tool_use'
      )
      if (toolUseBlocks.length > 0) {
        // Check if there's already a following tool_result — if not, add one
        const resultBlocks = toolUseBlocks.map((block) => ({
          type: 'tool_result' as const,
          tool_use_id: block.id!,
          content: 'Tool invocation failed: plugin did not respond.',
          is_error: true as const,
        }))
        messages.push({ role: 'user', content: resultBlocks })
      }
    }
  }

  return messages
}

/**
 * Enrich start_quiz tool params with quiz data fetched server-side.
 * Sandboxed iframes cannot make fetch requests, so we pass the quiz
 * cards directly via the TOOL_INVOKE payload.
 */
async function enrichQuizParams(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const topic = params.topic as string | undefined
  const quizId = params.quizId as string | undefined

  try {
    if (quizId) {
      const { data } = await supabase
        .from('quizzes')
        .select('id, title, topic, cards')
        .eq('id', quizId)
        .single()
      if (data) {
        return { ...params, _quizData: data }
      }
    } else if (topic) {
      const { data } = await supabase
        .from('quizzes')
        .select('id, title, topic, cards')
        .ilike('topic', `%${topic}%`)
        .limit(1)
      if (data && data.length > 0) {
        return { ...params, _quizData: data[0] }
      }
    }
  } catch (err) {
    console.warn('[enrichQuizParams] Failed to fetch quiz:', err)
  }

  return params // Return original if enrichment fails
}

/**
 * Enrich get_weather tool params with actual weather data fetched server-side.
 * Uses weather.gov (free, no API key) with Open-Meteo geocoding for city→coords.
 * Sandboxed iframes cannot make fetch requests, so we fetch here and pass
 * the result via the TOOL_INVOKE payload.
 */
async function enrichWeatherParams(
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const city = params.city as string | undefined
  if (!city) return { ...params, _weatherError: 'No city specified' }

  const headers = { 'User-Agent': 'ChatBridge/1.0 (education platform)' }

  try {
    // Step 1: Geocode city name to coordinates via Open-Meteo (free, no key)
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    )
    if (!geoRes.ok) return { ...params, _weatherError: 'Geocoding service unavailable' }

    const geoData = await geoRes.json()
    if (!geoData.results || geoData.results.length === 0) {
      return { ...params, _weatherError: `City "${city}" not found. Try a major city name.` }
    }

    const { latitude, longitude, name: resolvedCity, country, admin1 } = geoData.results[0]

    // Step 2: Get weather.gov grid point for the coordinates
    const pointsRes = await fetch(
      `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      { headers }
    )
    if (!pointsRes.ok) {
      // weather.gov only covers US locations
      return { ...params, _weatherError: `Weather data not available for ${resolvedCity}. weather.gov only covers US locations.` }
    }

    const pointsData = await pointsRes.json()
    const forecastUrl = pointsData.properties?.forecast

    if (!forecastUrl) {
      return { ...params, _weatherError: 'Could not determine forecast grid' }
    }

    // Step 3: Fetch the actual forecast
    const forecastRes = await fetch(forecastUrl, { headers })
    if (!forecastRes.ok) return { ...params, _weatherError: 'Forecast service unavailable' }

    const forecastData = await forecastRes.json()
    const current = forecastData.properties?.periods?.[0]

    if (!current) return { ...params, _weatherError: 'No forecast data available' }

    return {
      ...params,
      _weatherData: {
        city: resolvedCity,
        country: country || 'US',
        region: admin1 || '',
        temp: current.temperature,
        temp_unit: current.temperatureUnit,
        description: current.shortForecast,
        detail: current.detailedForecast,
        wind_speed: current.windSpeed,
        wind_direction: current.windDirection,
        period: current.name,
        icon: current.icon,
        is_daytime: current.isDaytime,
      },
    }
  } catch {
    return { ...params, _weatherError: 'Failed to fetch weather data' }
  }
}

/**
 * Enrich Spotify tool params with data fetched server-side.
 */
async function enrichSpotifyParams(
  userId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const { getValidToken } = await import('@/lib/oauth-tokens')
    const token = await getValidToken(userId, 'spotify')
    if (!token) {
      return { ...params, _spotifyError: 'Spotify not connected. Connect at /api/auth/oauth/spotify' }
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    if (toolName === 'search_tracks') {
      const query = params.query as string
      if (!query) return { ...params, _spotifyError: 'No search query provided' }

      const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, { headers })
      if (!res.ok) return { ...params, _spotifyError: 'Spotify search failed' }

      const data = await res.json()
      const tracks = (data.tracks?.items || []).map((t: { id: string; name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[] }; external_urls: { spotify: string }; duration_ms: number }) => ({
        id: t.id, name: t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        album: t.album.name,
        albumArt: t.album.images?.[0]?.url || null,
        url: t.external_urls.spotify,
        durationMs: t.duration_ms,
      }))
      return { ...params, _spotifyData: { tracks } }
    }

    if (toolName === 'create_playlist') {
      const name = params.name as string || 'ChatBridge Playlist'
      const description = params.description as string || 'Created by ChatBridge AI tutor'
      const query = params.query as string

      // Search for tracks first
      let trackIds: string[] = []
      if (query) {
        const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, { headers })
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          trackIds = (searchData.tracks?.items || []).map((t: { id: string }) => t.id)
        }
      }

      // Get Spotify user ID
      const meRes = await fetch('https://api.spotify.com/v1/me', { headers })
      if (!meRes.ok) return { ...params, _spotifyError: 'Failed to get Spotify profile' }
      const me = await meRes.json()

      // Create playlist
      const plRes = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
        method: 'POST', headers,
        body: JSON.stringify({ name, description, public: false }),
      })
      if (!plRes.ok) return { ...params, _spotifyError: 'Failed to create playlist' }
      const playlist = await plRes.json()

      // Add tracks
      if (trackIds.length > 0) {
        await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: 'POST', headers,
          body: JSON.stringify({ uris: trackIds.map((id) => `spotify:track:${id}`) }),
        })
      }

      return {
        ...params,
        _spotifyData: {
          playlist: {
            id: playlist.id,
            name: playlist.name,
            url: playlist.external_urls.spotify,
            trackCount: trackIds.length,
          },
        },
      }
    }

    return params
  } catch {
    return { ...params, _spotifyError: 'Spotify API error' }
  }
}
