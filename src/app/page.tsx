import React from 'react';
import CustomerNav from '@/components/CustomerNav';
import HeroSection from '@/app/components/HeroSection';
import PopularBites from '@/app/components/PopularBites';
import PhilosophySection from '@/app/components/PhilosophySection';
import ScheduleAndPhilosophy from '@/app/components/ScheduleAndPhilosophy';
import LandingCTA from '@/app/components/LandingCTA';
import LandingFooter from '@/app/components/LandingFooter';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: offers } = await supabase
    .from('special_offers')
    .select('id,title,description,image,category,badge,badge_color')
    .eq('active', true)
    .order('sort');

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      <HeroSection />
      <PopularBites />
      <PhilosophySection initialOffers={offers || []} />
      <ScheduleAndPhilosophy />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}