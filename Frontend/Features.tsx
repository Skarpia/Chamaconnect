'use client';

import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useLiteMode } from './LiteModeContext';

export default function Features() {
  const { isLiteMode } = useLiteMode();
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const features = [
    {
      icon: '💰',
      title: 'Smart Contributions',
      description: 'Track and manage member contributions with automated reminders and real-time updates.',
      color: 'blue',
    },
    {
      icon: '🏦',
      title: 'Loan Management',
      description: 'Streamlined loan applications, approvals, and repayments with transparent tracking.',
      color: 'green',
    },
    {
      icon: '📊',
      title: 'Financial Reports',
      description: 'Comprehensive analytics and reporting for better financial decision-making.',
      color: 'purple',
    },
    {
      icon: '👥',
      title: 'Member Management',
      description: 'Efficient member onboarding, profile management, and communication tools.',
      color: 'orange',
    },
    {
      icon: '🔔',
      title: 'Smart Notifications',
      description: 'Automated alerts for contributions, meetings, and important deadlines.',
      color: 'red',
    },
    {
      icon: '📱',
      title: 'Mobile First',
      description: 'Access your chama finances anytime, anywhere with our mobile-optimized platform.',
      color: 'indigo',
    },
  ];

  return (
    <div ref={ref} className={`py-20 ${isLiteMode ? 'lite-features' : ''}`}>
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className={`font-bold mb-4 text-gray-900 ${
            isLiteMode ? 'text-3xl' : 'text-4xl'
          }`}>
            Everything Your Chama Needs
          </h2>
          <p className={`text-gray-600 max-w-2xl mx-auto ${
            isLiteMode ? 'text-lg' : 'text-xl'
          }`}>
            Powerful features designed to simplify chama management and promote financial growth.
          </p>
        </div>

        {/* Features Grid */}
        <div className={`grid gap-8 ${
          isLiteMode 
            ? 'grid-cols-1 md:grid-cols-2' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              feature={feature}
              index={index}
              isLiteMode={isLiteMode}
              inView={inView}
            />
          ))}
        </div>

        {/* CTA Section */}
        {!isLiteMode && (
          <div className="mt-20 text-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
              <h3 className="text-3xl font-bold mb-4">
                Ready to Transform Your Chama?
              </h3>
              <p className="text-xl mb-8 text-white/90">
                Join thousands of chamas already using ChamaConnect to manage their finances better.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200">
                  Start Free Trial
                </button>
                <button className="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transform hover:scale-105 transition-all duration-200">
                  Schedule Demo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FeatureCardProps {
  feature: {
    icon: string;
    title: string;
    description: string;
    color: string;
  };
  index: number;
  isLiteMode: boolean;
  inView: boolean;
}

function FeatureCard({ feature, index, isLiteMode, inView }: FeatureCardProps) {
  const { ref: cardRef, inView: cardInView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '-50px',
  });

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-xl shadow-lg p-8 transform transition-all duration-700 hover:shadow-xl hover:scale-105 ${
        cardInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Icon */}
      <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${colorClasses[feature.color] || 'from-gray-500 to-gray-600'} flex items-center justify-center text-2xl mb-6`}>
        {feature.icon}
      </div>

      {/* Content */}
      <h3 className={`font-bold mb-4 text-gray-900 ${
        isLiteMode ? 'text-xl' : 'text-2xl'
      }`}>
        {feature.title}
      </h3>
      
      <p className="text-gray-600 leading-relaxed">
        {feature.description}
      </p>

      {/* Learn More Link */}
      {!isLiteMode && (
        <div className="mt-6">
          <a href="#" className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors">
            Learn more
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
