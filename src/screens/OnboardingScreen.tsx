import ProfileForm from '../components/ProfileForm';
import { updateProfile, createMembership, createPerson } from '../lib/userProfile';
import type { UserProfile } from '../types';

type OnboardingScreenProps = {
  onComplete: () => void;
};

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  function handleSubmit(formData: any) {
    const homeAddresses = formData.homeAddresses
      .split(',')
      .map((a: string) => a.trim())
      .filter(Boolean);

    const selfAliases = formData.selfAliases
      .split(',')
      .map((a: string) => a.trim())
      .filter(Boolean);

    const spouseAliases = formData.spouseAliases
      .split(',')
      .map((a: string) => a.trim())
      .filter(Boolean);

    const familyReferences = formData.familyReferences
      .split(',')
      .map((a: string) => a.trim())
      .filter(Boolean);

    const membership = createMembership({
      city_id: formData.city,
      city_name: 'Irvine',
      region_id: 'west_coast',
      self: createPerson(formData.selfName, selfAliases),
      spouse:
        formData.married && formData.showSpouseEvents && formData.spouseName
          ? createPerson(formData.spouseName, spouseAliases)
          : null,
      dependents:
        formData.hasKids && formData.showKidsEvents
          ? formData.kids
              .filter((k: any) => k.name.trim())
              .map((k: any) =>
                createPerson(
                  k.name,
                  k.aliases
                    .split(',')
                    .map((a: string) => a.trim())
                    .filter(Boolean)
                )
              )
          : [],
      groups: formData.groups,
      married: formData.married,
      show_spouse_events: formData.showSpouseEvents,
      has_kids: formData.hasKids,
      show_kids_events: formData.showKidsEvents,
      family_references: familyReferences,
    });

    const profile: Partial<UserProfile> = {
      home_addresses: homeAddresses,
      memberships: [membership],
    };

    updateProfile(profile);
    onComplete();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
        <ProfileForm
          initialValue={null}
          onSubmit={handleSubmit}
          submitLabel="Continue"
        />
      </div>
    </div>
  );
}
