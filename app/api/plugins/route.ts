import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/plugins — returns all allowed plugins and their tool schemas
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // RLS policy already filters to allowed=true only
  const { data, error } = await supabase
    .from('plugins')
    .select('id, name, url, tool_schemas, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST /api/plugins — register a new plugin (admin only via service role)
export async function POST(request: Request) {
  const supabase = await createClient()

  // Auth check — only authenticated users can attempt registration
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a teacher (admin proxy for now)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'teacher') {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { name, url, tool_schemas } = body

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }
  if (!tool_schemas || !Array.isArray(tool_schemas)) {
    return NextResponse.json({ error: 'tool_schemas must be an array' }, { status: 400 })
  }

  // Validate each tool schema has required fields
  for (const schema of tool_schemas) {
    if (!schema.name || typeof schema.name !== 'string') {
      return NextResponse.json({ error: 'Each tool schema must have a name' }, { status: 400 })
    }
    if (!schema.description || typeof schema.description !== 'string') {
      return NextResponse.json({ error: `Tool "${schema.name}" must have a description` }, { status: 400 })
    }
    if (!schema.input_schema || typeof schema.input_schema !== 'object') {
      return NextResponse.json({ error: `Tool "${schema.name}" must have an input_schema` }, { status: 400 })
    }
  }

  // Insert via service role to bypass RLS (plugins table has no insert policy for users)
  const { createServiceClient } = await import('@/lib/supabase/server')
  const serviceClient = await createServiceClient()

  const { data, error } = await serviceClient
    .from('plugins')
    .insert({
      name,
      url,
      tool_schemas,
      allowed: false, // Must be manually approved
    })
    .select('id, name, url, allowed, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Plugin "${name}" already exists` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
