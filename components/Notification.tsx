import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface NotificationProps {
  type: 'success' | 'error' | 'info'
  message: string
}

export function Notification({ type, message }: NotificationProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  }

  const colors = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-md flex items-center ${colors[type]}`}>
      {icons[type]}
      <span className="ml-2">{message}</span>
    </div>
  )
}

