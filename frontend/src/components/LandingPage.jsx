import React from 'react';
import { CloudRain, Zap, Shield, GitBranch, LayoutGrid, BarChart2 } from 'lucide-react';
import bgImage from '../assets/bg2.jpeg';

// --- Configuration & Constants ---
const COLORS = {
  // Primary RainSafe Blue derived from existing components
  accentBlue: '#1F6783', 
  // Brighter blue for gradient
  skyBlue: '#4C7CFF', 
  // Dark text
  textDark: '#06304F', 
  // Muted text
  textMuted: '#286198', 
  // Background
  bgLight: '#F9FAFB',
  // ✅ NEW BACKGROUND COLOR (FFFAED)
  bgAlt: '#FFFAED', 
};

// ✅ UPDATED: Array of new background colors for feature cards
const FEATURE_CARD_COLORS = [
  '#C7E0FE', // Hybrid Risk Assessment
  '#c6f4e3', // ML-Powered Prediction
  '#C7E0FE', // Real-Time User Reports
  '#DBEFE1', // Scalable FastAPI Backend
  '#A3C7E3', // Live Dashboard Data
  '#ABD2B7', // Non-Blocking NLP Analysis 
];

const FEATURES = [
  { 
    title: "Hybrid Risk Assessment", 
    description: "Combines ML prediction with real-time user reports for the most authoritative flood score.", 
    icon: Shield,
    // ✅ Keep index
    cardBgIndex: 0 
  },
  { 
    title: "ML-Powered Prediction", 
    description: "A trained ML model assesses flood risk based on weather, user reports, and geographic data.", 
    icon: Zap,
    // ✅ Keep index
    cardBgIndex: 1 
  },
  { 
    title: "Real-Time User Reports", 
    description: "Users can submit flood conditions with location and severity via a simple, intuitive report system.", 
    icon: CloudRain,
    // ✅ Keep index
    cardBgIndex: 2 
  },
  { 
    title: "Scalable FastAPI Backend", 
    description: "A highly performant, asynchronous Python backend built with FastAPI for speed and resilience.", 
    icon: GitBranch,
    // ✅ Keep index
    cardBgIndex: 3 
  },
  { 
    title: "Live Dashboard Data", 
    description: "API endpoints deliver map points and aggregated insights to feed interactive frontend dashboards.", 
    icon: LayoutGrid,
    // ✅ Keep index
    cardBgIndex: 4 
  },
  { 
    title: "Non-Blocking NLP Analysis", 
    description: "Utilities for asynchronous natural language processing of user report descriptions.", 
    icon: BarChart2,
    // ✅ Keep index
    cardBgIndex: 5 
  },
];

// --- Component: Hero Section ---
const HeroSection = ({ onNavigate }) => (
  <div 
    className="relative min-h-screen flex items-center justify-center overflow-hidden py-16"
    style={{ 
      backgroundImage: `url(${bgImage})`, 
      backgroundSize: 'cover', 
      backgroundPosition: 'center',
      clipPath: 'polygon(0 0, 100% 0, 100% 75%, 0% 98%)' // Subtle wave effect at the bottom
    }}
  >
    {/* Global Map Illustration (Simplified SVG or component could replace this) */}
    <div className="absolute inset-0 opacity-20 flex items-center justify-center">
      {/* Placeholder for the map background visual, similar to the attached image */}
      {/* <CloudRain className="w-96 h-96 text-white" /> */}
    </div>

    <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 animate-fadeInUp">
        <span className="block">RainSafe:</span> Urban Flood Intelligence
      </h1>
      <p className="text-xl md:text-2xl font-light mb-10 opacity-90 animate-fadeInUp delay-100">
        Leveraging ML, FastAPI, and OpenWeather Data for Smarter Urban Safety.
      </p>
      
      {/* Call-to-Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-fadeInUp delay-200">
        <button
          onClick={() => onNavigate('AuthPage')}
          className="px-10 py-4 text-lg font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
          // ✅ Change: Button background changed from 'white' to COLORS.bgAlt
          style={{ backgroundColor: COLORS.bgAlt, color: COLORS.accentBlue }}
        >
          Get Started
        </button>
      </div>
    </div>
  </div>
);

// --- Component: About Section ---
const AboutSection = () => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 -mt-16 relative z-20">
    <div 
      // ✅ Change: Background was hardcoded white (bg-white), now use bgAlt
      className="p-8 md:p-12 rounded-2xl shadow-2xl border-t-4 border-b-4" 
      style={{ 
        backgroundColor: COLORS.bgAlt, // Apply new background color
        borderColor: COLORS.accentBlue 
      }}
    >
      <h2 className="text-[3rem] font-bold text-center mb-4" style={{ color: COLORS.textDark }}>
        The RainSafe Hybrid Intelligence Platform
      </h2>
      <p className="text-center max-w-3xl mx-auto mb-10 text-xl" style={{ color: COLORS.textMuted }}>
        RainSafe is a full-stack flood monitoring solution that combines crowdsourced user reports with machine learning models to deliver real-time risk assessments for specific urban areas, ensuring quick and reliable information for citizens and authorities.
      </p>

      {/* About Feature Icons Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
        {[
          { icon: <Zap className="w-8 h-8" style={{ color: COLORS.accentBlue }} />, label: "ML-Powered Prediction" },
          { icon: <CloudRain className="w-8 h-8" style={{ color: COLORS.accentBlue }} />, label: "Automated Data Fetching" },
          { icon: <Shield className="w-8 h-8" style={{ color: COLORS.accentBlue }} />, label: "Real-Time Risk Scoring" },
          { icon: <LayoutGrid className="w-8 h-8" style={{ color: COLORS.accentBlue }} />, label: "Interactive Map Dashboard" },
        ].map((item, index) => (
          <div key={index} className="flex flex-col items-center text-center p-3">
            <div className="p-3 mb-2 rounded-full bg-blue-50/50 transform transition duration-300 hover:scale-110">
              {item.icon}
            </div>
            <p className="text-l font-semibold" style={{ color: COLORS.textDark }}>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// --- Component: Features Section ---
const FeaturesSection = () => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20" style={{ backgroundColor: COLORS.bgAlt }}> {/* Background applied to the section container */}
    <h2 className="text-[3rem] font-bold text-center" style={{ color: COLORS.textDark }}>
      Core Features
    </h2>
    <p className="text-center max-w-3xl mx-auto mb-12 text-xl" style={{ color: COLORS.textMuted }}>
      A complete, end-to-end system built on modern and robust technologies.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {FEATURES.map((feature, index) => (
        <div 
          key={index} 
          // ✅ USE UPDATED COLORS HERE
          className="p-8 rounded-xl shadow-lg border-t-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
          style={{ 
            // Apply the unique background color
            backgroundColor: FEATURE_CARD_COLORS[feature.cardBgIndex], 
            // Use the dark accent color for the border
            borderColor: COLORS.accentBlue 
          }}
        >
          <div className="p-3 inline-flex rounded-lg mb-4" style={{ backgroundColor: COLORS.accentBlue + '20' }}>
            <feature.icon className="w-6 h-6" style={{ color: COLORS.accentBlue }} />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.textDark }}>{feature.title}</h3>
          <p className="text-base" style={{ color: COLORS.textMuted }}>{feature.description}</p>
        </div>
      ))}
    </div>
  </div>
);

// --- Component: Call-to-Action Section ---
const CTASection = ({ onNavigate }) => (
  // ✅ Change: Replace COLORS.bgLight with COLORS.bgAlt
  <div className="py-24" style={{ backgroundColor: COLORS.bgAlt }}>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <div 
        // ✅ Change: Background was hardcoded white (bg-white), now use bgAlt
        className="max-w-4xl mx-auto p-10 md:p-16 rounded-2xl shadow-xl border-l-8" 
        style={{ 
          backgroundColor: COLORS.bgAlt, // Apply new background color
          borderColor: COLORS.accentBlue 
        }}
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: COLORS.textDark }}>
          Ready to Track Urban Floods?
        </h2>
        <p className="text-lg mb-8" style={{ color: COLORS.textMuted }}>
          Sign up now to access real-time data, submit reports, and view detailed risk maps for your city.
        </p>
        <button
          onClick={() => onNavigate('AuthPage')}
          className="px-12 py-4 text-xl font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl"
          style={{ backgroundColor: COLORS.accentBlue, color: 'white', boxShadow: `0 8px 25px -5px ${COLORS.accentBlue}50` }}
        >
          Get Started Now!
        </button>
      </div>
    </div>
  </div>
);

// --- Main Component: LandingPage ---
export default function LandingPage({ onNavigate }) {
  return (
    // ✅ Change: Apply the new color to the main container
    <div className="min-h-screen" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: COLORS.bgAlt }}>
      <HeroSection onNavigate={onNavigate} />
      <AboutSection />
      <FeaturesSection />
      <CTASection onNavigate={onNavigate} />

    </div>
  );
}