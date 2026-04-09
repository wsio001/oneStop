import { useState, useEffect } from 'react';
import { useProfile } from './lib/useProfile';
import { useAppStore } from './store/appStore';
import { checkAuth } from './lib/api';
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
  const [activeTab, setActiveTab] = useState<TabName>('today');
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Navigation state
  const hasSeenWelcome = localStorage.getItem('has_seen_welcome') === 'true';

  // DEBUG: Add a global reset function you can call from console
  useEffect(() => {
    (window as any).resetApp = () => {
      console.log('🔄 Resetting app...');

      // Clear localStorage
      localStorage.clear();
      console.log('✅ Cleared localStorage');

      // Clear all cookies more aggressively
      const cookies = document.cookie.split(";");
      console.log('🍪 Found cookies:', cookies);

      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

        // Clear cookie for all possible paths and domains
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + window.location.hostname;

        console.log('🗑️  Deleted cookie:', name);
      }

      console.log('✅ All cleared! Reloading...');
      setTimeout(() => window.location.reload(), 100);
    };
    console.log('💡 TIP: Run resetApp() in console to start fresh!');
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    console.log('🔍 Auth check useEffect - hasSeenWelcome:', hasSeenWelcome);
    if (hasSeenWelcome) {
      console.log('📡 Calling checkAuth()...');
      checkAuth().then((authenticated) => {
        console.log('✅ checkAuth result:', authenticated);
        setIsAuthenticated(authenticated);
      });
    }
  }, [hasSeenWelcome]);

  // Trigger initial data sync when profile loads
  useEffect(() => {
    if (profile && hasSeenWelcome) {
      // Kick off the auth + data flow
      refreshAll();
    }
  }, [profile, hasSeenWelcome, refreshAll]);

  function handleGetStarted() {
    console.log('🚀 handleGetStarted called');
    // Set flag in localStorage
    localStorage.setItem('has_seen_welcome', 'true');
    console.log('✅ Set has_seen_welcome flag');
    // Redirect IMMEDIATELY to OAuth - don't wait for state updates
    console.log('🔄 Redirecting to /api/auth/start');
    window.location.href = '/api/auth/start';
  }

  function handleOnboardingComplete() {
    // Profile is now set, app will automatically show main content
    // Auth flow will be triggered by the useEffect above
  }

  // Show welcome screen if first time
  if (!hasSeenWelcome) {
    console.log('📺 Rendering: WelcomeScreen');
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  // If user has seen welcome but we're still checking auth, show loading
  if (hasSeenWelcome && isAuthenticated === null) {
    console.log('⏳ Rendering: Checking authentication... (isAuthenticated=null)');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-500">Checking authentication...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to OAuth
  if (hasSeenWelcome && isAuthenticated === false) {
    console.log('🔐 Not authenticated! Redirecting to /api/auth/start');
    window.location.href = '/api/auth/start';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-500">Redirecting to sign in...</div>
        </div>
      </div>
    );
  }

  // Show onboarding if authenticated but no profile
  if (isAuthenticated && !profile) {
    console.log('📝 Rendering: OnboardingScreen (authenticated but no profile)');
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // If no profile and not sure about auth status, don't show anything yet
  if (!profile) {
    console.log('⏳ Rendering: Loading... (no profile, auth status:', isAuthenticated, ')');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  console.log('🏠 Rendering: Main App');

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
    <div className="main-app-container h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0">
        <Header
          title={tabTitles[activeTab].title}
          subtitle={tabTitles[activeTab].subtitle}
          profile={profile}
          onProfileClick={() => setShowSettings(true)}
        />
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-32">
        {activeTab === 'today' && <TodayTab profile={profile} />}
        {activeTab === 'weekly' && <WeeklyTab />}
        {activeTab === 'bulletin' && <BulletinTab />}
      </div>

      {/* Fixed TabBar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

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
