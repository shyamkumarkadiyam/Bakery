import React from 'react';
import CustomerNav from '@/components/CustomerNav';
import HeroSection from '@/app/components/HeroSection';
import PopularBites from '@/app/components/PopularBites';
import PhilosophySection from '@/app/components/PhilosophySection';
import ScheduleAndPhilosophy from '@/app/components/ScheduleAndPhilosophy';
import LandingCTA from '@/app/components/LandingCTA';
import LandingFooter from '@/app/components/LandingFooter';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <HeroSection />
      <PopularBites />
      <PhilosophySection />
      <ScheduleAndPhilosophy />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}