import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Vehicles joined with their maintenance history and a lightweight trip
// count derived from runs — mirrors useDrivers' shape (profiles joined with
// compliance_docs) so Fleet.jsx can follow the same list/detail pattern as
// Drivers.jsx.
export function useVehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const [{ data: vehicleRows }, { data: runRows }] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*, maintenance_logs(*)')
        .order('name', { ascending: true }),
      supabase
        .from('runs')
        .select('vehicle_id, status'),
    ])

    const trips = new Map()
    ;(runRows ?? []).forEach(r => {
      if (!r.vehicle_id) return
      const entry = trips.get(r.vehicle_id) ?? { total: 0, delivered: 0 }
      entry.total += 1
      if (r.status === 'delivered') entry.delivered += 1
      trips.set(r.vehicle_id, entry)
    })

    const withTrips = (vehicleRows ?? []).map(v => ({
      ...v,
      maintenance_logs: (v.maintenance_logs ?? []).sort((a, b) =>
        (b.performed_at ?? '').localeCompare(a.performed_at ?? '')
      ),
      tripCount: trips.get(v.id)?.total ?? 0,
      deliveredCount: trips.get(v.id)?.delivered ?? 0,
    }))

    setVehicles(withTrips)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { vehicles, loading, refresh: fetch }
}
