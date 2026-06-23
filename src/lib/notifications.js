export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function sendLocalNotification(title, body, icon = '/icons/icon-192.png') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  new Notification(title, { body, icon })
}

export function scheduleOverdueRunCheck(runs) {
  runs.forEach(run => {
    if (run.status !== 'in_transit' || !run.picked_up_at) return
    const elapsed = Date.now() - new Date(run.picked_up_at).getTime()
    const twoHours = 2 * 60 * 60 * 1000
    if (elapsed > twoHours) {
      sendLocalNotification(
        '⏱ Run Overdue',
        `Delivery to ${run.dropoff_address} has been in transit for over 2 hours.`
      )
    }
  })
}

export function checkContractRenewals(contracts) {
  contracts.forEach(c => {
    if (!c.end_date) return
    const daysLeft = Math.ceil((new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 30 && daysLeft >= 0) {
      sendLocalNotification(
        '📋 Contract Renewal Due',
        `"${c.name}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
      )
    }
  })
}
