const cache = new Map()
let lastRequestAt = 0

// Free, keyless geocoding via OpenStreetMap Nominatim. No maps API key is
// provisioned anywhere in this app — adding a paid provider (Google/Mapbox)
// is a billing decision for the account owner, not something to wire in
// silently. Nominatim's usage policy asks for max ~1 request/second and
// non-bulk use, which comfortably covers a dispatcher geocoding one or two
// addresses per run — the module-level throttle below enforces that even if
// two fields get geocoded in quick succession.
export async function geocodeAddress(address) {
  const key = address?.trim().toLowerCase()
  if (!key) return null
  if (cache.has(key)) return cache.get(key)

  const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequestAt = Date.now()

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Geocoding failed (${res.status})`)
    const results = await res.json()
    const hit = results?.[0]
    const coords = hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null
    cache.set(key, coords)
    return coords
  } catch {
    return null
  }
}
