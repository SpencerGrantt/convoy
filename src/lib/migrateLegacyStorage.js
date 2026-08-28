import { openDB, deleteDB } from 'idb'

// One-time cleanup after the Convoy -> Vantar rebrand: carries a user's
// existing preferences/queued data forward from the old `convoy*` storage
// keys to the new `vantar*` ones instead of just discarding them. Safe to
// call on every boot — once the old key/DB is gone there's nothing left to
// migrate, so this becomes a no-op for everyone within one visit.

const LOCAL_STORAGE_RENAMES = {
  'convoy_theme': 'vantar_theme',
  'convoy_dashboard_period': 'vantar_dashboard_period',
  'convoy_finances_period': 'vantar_finances_period',
  'convoy_analytics_trend_chart': 'vantar_analytics_trend_chart',
  'convoy_analytics_category_chart': 'vantar_analytics_category_chart',
  'convoy-dismissed-alerts': 'vantar-dismissed-alerts',
  'convoy_dev_view_role': 'vantar_dev_view_role',
}

function migrateLocalStorage() {
  for (const [oldKey, newKey] of Object.entries(LOCAL_STORAGE_RENAMES)) {
    const oldValue = localStorage.getItem(oldKey)
    if (oldValue === null) continue
    if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, oldValue)
    localStorage.removeItem(oldKey)
  }
}

function migrateSessionStorage() {
  const oldPrefix = 'convoy_mfa_verified_'
  const newPrefix = 'vantar_mfa_verified_'
  for (const key of Object.keys(sessionStorage)) {
    if (!key.startsWith(oldPrefix)) continue
    const newKey = newPrefix + key.slice(oldPrefix.length)
    if (sessionStorage.getItem(newKey) === null) sessionStorage.setItem(newKey, sessionStorage.getItem(key))
    sessionStorage.removeItem(key)
  }
}

// The offline action queue (src/lib/offline.js) renamed its IndexedDB from
// `convoy-offline` to `vantar-offline`. A plain rename would silently orphan
// any not-yet-synced queued actions, so copy them across before dropping the
// old database.
async function migrateOfflineQueueDb() {
  if (!('indexedDB' in window) || typeof indexedDB.databases !== 'function') return
  const dbs = await indexedDB.databases()
  if (!dbs.some((d) => d.name === 'convoy-offline')) return

  const oldDb = await openDB('convoy-offline', 1)
  if (!oldDb.objectStoreNames.contains('queue')) {
    oldDb.close()
    await deleteDB('convoy-offline')
    return
  }
  const items = await oldDb.getAll('queue')
  oldDb.close()

  if (items.length > 0) {
    const newDb = await openDB('vantar-offline', 1, {
      upgrade(db) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
      },
    })
    const tx = newDb.transaction('queue', 'readwrite')
    // Drop the old auto-incremented id so the new store assigns its own.
    await Promise.all(items.map(({ id: _id, ...rest }) => tx.store.add(rest)))
    await tx.done
    newDb.close()
  }

  await deleteDB('convoy-offline')
}

export function migrateLegacyConvoyStorage() {
  migrateLocalStorage()
  migrateSessionStorage()
  migrateOfflineQueueDb().catch((err) => console.error('Offline queue migration failed:', err))
}
