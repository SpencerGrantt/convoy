import { openDB } from 'idb'

let dbPromise

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB('convoy-offline', 1, {
      upgrade(db) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
      },
    })
  }
  return dbPromise
}

export async function queueAction(action, payload) {
  const db = await getDb()
  await db.add('queue', { action, payload, createdAt: new Date() })
}

export async function drainQueue(syncFn) {
  const db = await getDb()
  const all = await db.getAll('queue')
  for (const item of all) {
    try {
      await syncFn(item)
      await db.delete('queue', item.id)
    } catch {
      // leave in queue to retry next time
    }
  }
}

window.addEventListener('online', () => drainQueue(() => Promise.resolve()))
