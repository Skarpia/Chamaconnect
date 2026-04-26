'use client';

import { useState, useEffect } from 'react';
import { useIntersectionObserver } from 'react-intersection-observer';
import { useLiteMode } from '../contexts/LiteModeContext';
import { OptimizedImage } from './OptimizedImage';

export default function HeroSection() {
  const { isLiteMode } = useLiteMode();
  const [ref, inView] = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (inView) {
      setIsVisible(true);
    }
  }, [inView]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${isLiteMode ? 'lite-hero' : ''}`}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <OptimizedImage
          src="/images/hero-bg.webp"
          alt="ChamaConnect Hero Background"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
          priority={true}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-purple-900/90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className={`text-center text-white transform transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <h1 className={`font-bold mb-6 ${
            isLiteMode ? 'text-4xl' : 'text-6xl'
          }`}>
            Empowering Chamas with
            <span className="text-yellow-400"> Smart Financial Management</span>
          </h1>
          
          <p className={`mb-8 max-w-3xl mx-auto ${
            isLiteMode ? 'text-lg' : 'text-xl'
          }`}>
            Transform your community savings group with our comprehensive digital platform. 
            Track contributions, manage loans, and grow together with real-time insights 
            and seamless collaboration tools.
          </p>

          {!isLiteMode && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button className="px-8 py-4 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-300 transform hover:scale-105 transition-all duration-200 shadow-lg">
                Get Started Free
              </button>
              <button className="px-8 py-4 bg-white/20 backdrop-blur text-white font-semibold rounded-lg hover:bg-white/30 transform hover:scale-105 transition-all duration-200 border border-white/30">
                Watch Demo
              </button>
            </div>
          )}

          {/* Stats Section */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 ${
            isLiteMode ? 'mt-8' : 'mt-16'
          }`}>
            {[
              { number: '10,000+', label: 'Active Members' },
              { number: '500+', label: 'Chamas' },
              { number: 'KES 50M+', label: 'Total Savings' },
              { number: '99.9%', label: 'Uptime' },
            ].map((stat, index) => (
              <div
                key={index}
                className={`transform transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className={`font-bold ${
                  isLiteMode ? 'text-2xl' : 'text-4xl'
                } text-yellow-400 mb-2`}>
                  {stat.number}
                </div>
                <div className={`${
                  isLiteMode ? 'text-sm' : 'text-base'
                } text-white/80`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Preview */}
      {!isLiteMode && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent">
          <div className="container mx-auto px-6 py-8">
            <div className="flex justify-center space-x-8 text-white/60 text-sm">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>Real-time Updates</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <span>Secure Transactions</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                <span>Mobile First</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
