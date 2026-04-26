import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import { LiteModeProvider } from '../contexts/LiteModeContext';
import '../styles/globals.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <LiteModeProvider>
        <Component {...pageProps} />
      </LiteModeProvider>
    </QueryClientProvider>
  );
}
