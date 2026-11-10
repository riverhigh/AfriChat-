import { GamifyMilestone } from '../types';

export const MILESTONE_DEFINITIONS: Record<'artisan' | 'store' | 'errand' | 'tutor', { count: number; name: string; icon: string; title: string; desc: string }[]> = {
  artisan: [
    { count: 5, name: 'Bronze Artisan', icon: '🥉', title: '5 Jobs Done', desc: 'Completed 5 verified artisan services.' },
    { count: 15, name: 'Silver Craftsman', icon: '🥈', title: '15 Jobs Done', desc: 'Trusted professional with 15 completed jobs.' },
    { count: 30, name: 'Gold Master Artisan', icon: '🥇', title: '30 Bookings Done', desc: 'Elite Master Artisan with 30+ completed jobs and 5-star reputation!' },
    { count: 50, name: 'Diamond Station', icon: '💎', title: '50 Bookings Done', desc: 'Top 1% artisan workshop across the region.' },
    { count: 100, name: 'African Guild Legend', icon: '👑', title: '100+ Master Bookings', desc: 'Legendary guildmaster status.' },
  ],
  store: [
    { count: 5, name: 'Bronze Merchant', icon: '🥉', title: '5 Orders Fulfilled', desc: 'First 5 escrow orders delivered smoothly.' },
    { count: 15, name: 'Silver Retailer', icon: '🥈', title: '15 Orders Fulfilled', desc: 'Consistent, trusted marketplace seller.' },
    { count: 30, name: 'Gold Super-Store', icon: '🥇', title: '30 Sales Completed', desc: 'Verified Top Merchant with 30+ escrow completed sales!' },
    { count: 50, name: 'Diamond Enterprise', icon: '💎', title: '50 Sales Completed', desc: 'High-volume verified store.' },
    { count: 100, name: 'African Trade Titan', icon: '👑', title: '100+ Sales Completed', desc: 'Legendary African commerce pioneer.' },
  ],
  errand: [
    { count: 5, name: 'Bronze Runner', icon: '🥉', title: '5 Errands Done', desc: 'Completed 5 shopping and delivery runs.' },
    { count: 15, name: 'Silver Swift', icon: '🥈', title: '15 Errands Done', desc: 'Dependable street runner with 15 successful deliveries.' },
    { count: 30, name: 'Gold Errand Master', icon: '🥇', title: '30 Errands Completed', desc: 'Champion Errand Runner with 30+ on-time delivery code unlocks!' },
    { count: 50, name: 'Diamond Express', icon: '💎', title: '50 Errands Completed', desc: 'Fastest and most trusted runner in the neighborhood.' },
    { count: 100, name: 'City Legend Runner', icon: '👑', title: '100+ Errands Completed', desc: 'Top neighborhood concierge legend.' },
  ],
  tutor: [
    { count: 5, name: 'Bronze Mentor', icon: '🥉', title: '5 Students Enrolled', desc: 'Taught first 5 learners.' },
    { count: 15, name: 'Silver Educator', icon: '🥈', title: '15 Students Enrolled', desc: '15 students trained with video lessons.' },
    { count: 30, name: 'Gold Academy Master', icon: '🥇', title: '30 Students Graduated', desc: 'Master tutor with 30+ paid students and high ratings!' },
    { count: 50, name: 'Diamond Professor', icon: '💎', title: '50 Students Graduated', desc: 'Regional academic and creative leader.' },
    { count: 100, name: 'African Chancellor', icon: '👑', title: '100+ Students Graduated', desc: 'Legendary African educator.' },
  ],
};

export const getHighestMilestone = (category: 'artisan' | 'store' | 'errand' | 'tutor', completedCount: number) => {
  const list = MILESTONE_DEFINITIONS[category];
  const achieved = list.filter((m) => completedCount >= m.count);
  if (achieved.length === 0) return null;
  return achieved[achieved.length - 1];
};

export const getNextMilestone = (category: 'artisan' | 'store' | 'errand' | 'tutor', completedCount: number) => {
  const list = MILESTONE_DEFINITIONS[category];
  return list.find((m) => completedCount < m.count) || null;
};
