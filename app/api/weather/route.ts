import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const ROUTE = '/api/weather'
const UA = 'ChatBridge/1.0 (education platform)'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    logger.warn('auth.unauthorized', { route: ROUTE })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')

  if (!city) {
    return NextResponse.json({ error: 'city parameter is required' }, { status: 400 })
  }

  try {
    // Geocode city → coordinates
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    )
    if (!geoRes.ok) {
      return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 })
    }
    const geoData = await geoRes.json()
    if (!geoData.results?.length) {
      return NextResponse.json({ error: `City "${city}" not found` }, { status: 404 })
    }

    const { latitude, longitude, name, country } = geoData.results[0]

    // Get weather.gov grid point
    const pointsRes = await fetch(
      `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`,
      { headers: { 'User-Agent': UA } }
    )
    if (!pointsRes.ok) {
      return NextResponse.json({ error: 'weather.gov only covers US locations' }, { status: 404 })
    }

    const pointsData = await pointsRes.json()
    const forecastUrl = pointsData.properties?.forecast
    if (!forecastUrl) {
      return NextResponse.json({ error: 'Could not determine forecast grid' }, { status: 500 })
    }

    const forecastRes = await fetch(forecastUrl, { headers: { 'User-Agent': UA } })
    if (!forecastRes.ok) {
      return NextResponse.json({ error: 'Forecast unavailable' }, { status: 502 })
    }

    const forecastData = await forecastRes.json()
    const current = forecastData.properties?.periods?.[0]
    if (!current) {
      return NextResponse.json({ error: 'No forecast data' }, { status: 500 })
    }

    logger.info('weather.fetched', { route: ROUTE, userId: user.id, data: { city: name } })
    return NextResponse.json({
      city: name,
      country,
      temp: current.temperature,
      temp_unit: current.temperatureUnit,
      description: current.shortForecast,
      wind_speed: current.windSpeed,
      wind_direction: current.windDirection,
      period: current.name,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('weather.fetch_error', { route: ROUTE, userId: user.id, data: { error: message } })
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}
