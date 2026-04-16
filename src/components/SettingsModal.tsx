import { useEffect } from 'react';
import ProfileForm from './ProfileForm';
import { updateProfile, createMembership, createPerson } from '../lib/userProfile';
import type { UserProfile } from '../types';

type SettingsModalProps = {
  profile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
};

export default function SettingsModal({ profile, isOpen, onClose }: SettingsModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

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
        formData.married && formData.spouseName
          ? createPerson(formData.spouseName, spouseAliases)
          : null,
      dependents:
        formData.hasKids
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
      gender: formData.gender,
      married: formData.married,
      show_spouse_events: formData.showSpouseEvents,
      has_kids: formData.hasKids,
      show_kids_events: formData.showKidsEvents,
      family_references: familyReferences,
    });

    updateProfile({
      home_addresses: homeAddresses,
      memberships: [membership],
    });

    onClose();
  }

  function handleReset() {
    if (
      confirm(
        'Are you sure you want to reset the app? This will delete all your data and cannot be undone.'
      )
    ) {
      updateProfile(null);
      window.location.reload();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <ProfileForm
            initialValue={profile}
            onSubmit={handleSubmit}
            submitLabel="Save"
            showHeader={true}
            onCancel={onClose}
          />

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <button
              onClick={handleReset}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium"
            >
              Reset app
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
