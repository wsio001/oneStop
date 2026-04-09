import type { UserProfile } from '../types';

type HeaderProps = {
  title: string;
  subtitle?: string;
  profile: UserProfile;
  onProfileClick: () => void;
};

export default function Header({ title, subtitle, profile, onProfileClick }: HeaderProps) {
  const firstLetter = profile.memberships[0]?.self.display_name.charAt(0).toUpperCase() || 'U';
  const groupColor = profile.memberships[0]?.groups[0]
    ? 'bg-purple-200 text-purple-900'
    : 'bg-purple-200 text-purple-900';

  return (
    <header className="sticky top-0 z-10 px-4 pt-4 pb-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-h-[40px] flex flex-col justify-center">
          <h1 className="text-base font-medium text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          onClick={onProfileClick}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${groupColor}`}
        >
          {firstLetter}
        </button>
      </div>
    </header>
  );
}
