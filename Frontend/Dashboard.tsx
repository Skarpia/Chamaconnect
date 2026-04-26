'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useIntersectionObserver } from 'react-intersection-observer';
import { useLiteMode } from './LiteModeContext';
import { OptimizedImage } from './OptimizedImage';
import { VirtualizedTable } from './VirtualizedTable';

// Dashboard metrics interface
interface DashboardMetrics {
  totalMembers: number;
  activeMembers: number;
  totalContributions: number;
  pendingLoans: number;
  totalLoans: number;
  recentActivity: Array<{
    id: string;
    type: 'contribution' | 'loan' | 'repayment';
    amount: number;
    member: string;
    date: string;
  }>;
}

// Fetch dashboard data with caching
async function fetchDashboardData(): Promise<DashboardMetrics> {
  const response = await fetch('/api/dashboard-summary', {
    headers: {
      'Cache-Control': 'max-age=300', // 5 minutes cache
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  
  return response.json();
}

export default function Dashboard() {
  const { isLiteMode } = useLiteMode();
  const [ref, inView] = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Only fetch data when component is in view
  const { data: metrics, isLoading, error } = useQuery(
    'dashboard-metrics',
    fetchDashboardData,
    {
      enabled: inView,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Memoize expensive calculations
  const metricsCards = useMemo(() => {
    if (!metrics) return [];
    
    return [
      {
        title: 'Total Members',
        value: metrics.totalMembers.toLocaleString(),
        change: '+12%',
        icon: 'users',
        color: 'blue',
      },
      {
        title: 'Active Members',
        value: metrics.activeMembers.toLocaleString(),
        change: '+8%',
        icon: 'user-check',
        color: 'green',
      },
      {
        title: 'Total Contributions',
        value: `KES ${metrics.totalContributions.toLocaleString()}`,
        change: '+23%',
        icon: 'trending-up',
        color: 'purple',
      },
      {
        title: 'Pending Loans',
        value: metrics.pendingLoans.toLocaleString(),
        change: '-5%',
        icon: 'clock',
        color: 'orange',
      },
    ];
  }, [metrics]);

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Failed to load dashboard data</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className={`p-6 ${isLiteMode ? 'lite-dashboard' : ''}`}>
      {/* Header with lite mode toggle */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggleLiteMode'))}
          className={`px-3 py-1 rounded text-sm ${
            isLiteMode 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {isLiteMode ? '🚀 Lite Mode ON' : '📱 Lite Mode OFF'}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Cards */}
      {!isLoading && metricsCards.map((card, index) => (
        <MetricCard key={index} card={card} isLiteMode={isLiteMode} />
      ))}

      {/* Recent Activity Table */}
      {!isLoading && metrics && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <VirtualizedTable 
            data={metrics.recentActivity}
            isLiteMode={isLiteMode}
          />
        </div>
      )}

      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-yellow-50 rounded text-sm">
          <p>🚀 Performance Mode: {isLiteMode ? 'Lite' : 'Full'}</p>
          <p>📊 Component Rendered: {new Date().toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
}

// Optimized metric card component
function MetricCard({ card, isLiteMode }: { card: any; isLiteMode: boolean }) {
  const [ref, inView] = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <div 
      ref={ref}
      className={`bg-white rounded-lg shadow p-6 transform transition-all duration-300 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${isLiteMode ? 'lite-card' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{card.title}</p>
          <p className={`text-2xl font-bold ${isLiteMode ? 'text-gray-800' : 'text-gray-900'}`}>
            {card.value}
          </p>
          <p className={`text-sm ${card.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {card.change}
          </p>
        </div>
        {!isLiteMode && (
          <div className={`w-12 h-12 bg-${card.color}-100 rounded-lg flex items-center justify-center`}>
            <span className="text-2xl">{getIcon(card.icon)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function getIcon(iconName: string): string {
  const icons: Record<string, string> = {
    users: '👥',
    'user-check': '✅',
    'trending-up': '📈',
    clock: '⏰',
  };
  return icons[iconName] || '📊';
}
