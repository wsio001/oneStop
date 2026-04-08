import { useState, useEffect } from 'react';
import { useProfile } from './lib/useProfile';
import { useAppStore } from './store/appStore';
import WelcomeScreen from './screens/WelcomeScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import Header from './components/Header';
import TabBar from './components/TabBar';
import SettingsModal from './components/SettingsModal';
import TodayTab from './tabs/TodayTab';
import WeeklyTab from './tabs/WeeklyTab';
import BulletinTab from './tabs/BulletinTab';
import type { TabName } from './types';

export default function App() {
  const profile = useProfile();
  const refreshAll = useAppStore((state) => state.refreshAll);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState<TabName>('today');
  const [showSettings, setShowSettings] = useState(false);

  // Navigation state
  const hasSeenWelcome = localStorage.getItem('has_seen_welcome') === 'true';

  // Trigger initial data sync when profile loads
  useEffect(() => {
    if (profile && hasSeenWelcome) {
      // Kick off the auth + data flow
      refreshAll();
    }
  }, [profile, hasSeenWelcome, refreshAll]);

  function handleGetStarted() {
    localStorage.setItem('has_seen_welcome', 'true');
    setShowWelcome(false);
  }

  function handleOnboardingComplete() {
    // Profile is now set, app will automatically show main content
    // Auth flow will be triggered by the useEffect above
  }

  // Show welcome screen if first time
  if (!hasSeenWelcome && showWelcome) {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  // Show onboarding if no profile
  if (!profile) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Main app
  const tabTitles: Record<TabName, { title: string; subtitle?: string }> = {
    today: {
      title: 'Today',
      subtitle: new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    },
    weekly: { title: 'Weekly' },
    bulletin: { title: 'Bulletin' },
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header
        title={tabTitles[activeTab].title}
        subtitle={tabTitles[activeTab].subtitle}
        profile={profile}
        onProfileClick={() => setShowSettings(true)}
      />

      <div className="flex-1 overflow-hidden">
        {activeTab === 'today' && <TodayTab profile={profile} />}
        {activeTab === 'weekly' && <WeeklyTab />}
        {activeTab === 'bulletin' && <BulletinTab />}
      </div>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {showSettings && (
        <SettingsModal
          profile={profile}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
