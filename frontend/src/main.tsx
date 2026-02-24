import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ToastProvider } from './context/ToastContext'
import { WalletProvider } from './context/WalletContext'
import { NotificationProvider } from './context/NotificationContext'
import { AppErrorBoundary } from './components/ErrorHandler'
import { flushOfflineErrorQueue } from './components/ErrorReporting'

function AppWithErrorBoundary() {
  useEffect(() => {
    const onOnline = () => {
      flushOfflineErrorQueue().catch(() => {})
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <WalletProvider>
        <NotificationProvider>
          <AppWithErrorBoundary />
        </NotificationProvider>
      </WalletProvider>
    </ToastProvider>
  </React.StrictMode>,
)
