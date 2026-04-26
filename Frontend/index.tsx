import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useLiteMode } from '../components/LiteModeContext';

// Lazy loaded components for code splitting
const Dashboard = dynamic(() => import('../components/Dashboard'), {
  loading: () => <div className="loading-spinner" />,
  ssr: false
});

const HeroSection = dynamic(() => import('../components/HeroSection'), {
  loading: () => <div className="loading-spinner" />,
});

const Features = dynamic(() => import('../components/Features'), {
  loading: () => <div className="loading-spinner" />,
});

export default function HomePage() {
  const router = useRouter();
  const { isLiteMode } = useLiteMode();

  return (
    <div className={`min-h-screen ${isLiteMode ? 'lite-mode' : ''}`}>
      <Suspense fallback={<div className="loading-spinner" />}>
        <HeroSection />
        <Features />
        <Dashboard />
      </Suspense>
    </div>
  );
}

// Static generation for performance
export async function getStaticProps() {
  return {
    props: {},
    revalidate: 60, // Revalidate every 60 seconds
  };
}
