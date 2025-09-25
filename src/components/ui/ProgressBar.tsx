interface ProgressBarProps {
  current: number
  max: number
  className?: string
  showLabel?: boolean
}

export default function ProgressBar({ current, max, className = '', showLabel = true }: ProgressBarProps) {
  const percentage = Math.round((current / max) * 100)

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">Progress</span>
          <span className="text-sm text-slate-500">{current}/{max} qualities approved</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-safetalk-green h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}