import { useSearchParams } from 'react-router-dom'
import TopBar from '../components/layout/TopBar'

export default function Photos() {
  const [params] = useSearchParams()
  const runId = params.get('runId')

  return (
    <div className="pb-24">
      <TopBar title="Photos" />
      <div className="px-4 pt-6 text-center text-gray-400">
        <p className="text-4xl mb-3">📸</p>
        <p className="font-medium text-gray-600">{runId ? `Run ${runId.slice(0, 8)}…` : 'Select a run first'}</p>
        <p className="text-sm mt-1">Photo capture coming in Week 2</p>
      </div>
    </div>
  )
}
