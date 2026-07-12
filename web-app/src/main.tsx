import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { config } from './config/wagmi'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </QueryClientProvider>
      </WagmiProvider>
    </BrowserRouter>
    <Toaster position="bottom-right" />
  </StrictMode>,
)
