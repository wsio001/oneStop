import { Calendar, CalendarDays, FileText } from 'lucide-react';
import type { TabName } from '../types';

type TabBarProps = {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
};

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs: { id: TabName; label: string; icon: typeof Calendar }[] = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'weekly', label: 'Weekly', icon: CalendarDays },
    { id: 'bulletin', label: 'Bulletin', icon: FileText },
  ];

  return (
    <nav className="flex items-center justify-around bg-white border-t border-gray-200 h-16">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-4 ${
              isActive ? 'text-purple-600' : 'text-gray-500'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
