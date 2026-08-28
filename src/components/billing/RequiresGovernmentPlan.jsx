import { useNavigate } from 'react-router-dom'

export default function RequiresGovernmentPlan({ isOwner }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 text-center gap-4">
      <p className="text-fg font-bold text-lg">Contracts is a Government-plan feature</p>
      <p className="text-fg/50 text-sm max-w-sm">
        SAM.gov contract matching and the Contracts page are included on the
        Government plan. Your company is currently on Standard.
      </p>
      {isOwner ? (
        <button
          onClick={() => navigate('/settings?tab=billing')}
          className="bg-brand-600 text-white font-bold px-5 py-2.5 rounded-xl"
        >
          Upgrade to Government
        </button>
      ) : (
        <p className="text-fg/40 text-sm">Ask your company owner to upgrade the plan.</p>
      )}
    </div>
  )
}
