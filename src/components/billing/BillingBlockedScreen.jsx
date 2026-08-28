import { useNavigate } from 'react-router-dom'

const MESSAGES = {
  trialing: {
    title: 'Your trial has ended',
    body: 'Add a payment method to keep using Vantar.',
    action: 'Add Payment Method',
  },
  past_due: {
    title: 'There was a problem with your last payment',
    body: 'Update your payment method to restore access.',
    action: 'Update Payment Method',
  },
  canceled: {
    title: 'Your subscription was canceled',
    body: 'Reactivate billing to keep using Vantar. Nothing has been deleted.',
    action: 'Reactivate Billing',
  },
}

export default function BillingBlockedScreen({ status, isOwner }) {
  const navigate = useNavigate()
  const config = MESSAGES[status] ?? MESSAGES.trialing

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 text-center gap-4">
      <p className="text-fg font-bold text-lg">{config.title}</p>
      <p className="text-fg/50 text-sm max-w-sm">{config.body}</p>
      {isOwner ? (
        <button
          onClick={() => navigate('/settings?tab=billing')}
          className="bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl"
        >
          {config.action}
        </button>
      ) : (
        <p className="text-fg/40 text-sm">Ask your company owner to sort out billing.</p>
      )}
    </div>
  )
}
