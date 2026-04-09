import { useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';
import Toggle from './Toggle';
import { fetchAvailableGroups } from '../lib/api';
import type { UserProfile } from '../types';

type ProfileFormData = {
  homeAddresses: string;
  city: string;
  selfName: string;
  selfAliases: string;
  married: boolean;
  showSpouseEvents: boolean;
  spouseName: string;
  spouseAliases: string;
  hasKids: boolean;
  showKidsEvents: boolean;
  kids: { name: string; aliases: string }[];
  groups: string[];
};

type ProfileFormProps = {
  initialValue: UserProfile | null;
  onSubmit: (data: ProfileFormData) => void;
  submitLabel: string;
  showHeader?: boolean;
  onCancel?: () => void;
};

const AVAILABLE_CITIES = [{ id: 'irvine', name: 'Irvine' }];

export default function ProfileForm({
  initialValue,
  onSubmit,
  submitLabel,
  showHeader = false,
  onCancel,
}: ProfileFormProps) {
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>(() => {
    if (!initialValue || initialValue.memberships.length === 0) {
      return {
        homeAddresses: '',
        city: 'irvine',
        selfName: '',
        selfAliases: '',
        married: false,
        showSpouseEvents: false,
        spouseName: '',
        spouseAliases: '',
        hasKids: false,
        showKidsEvents: false,
        kids: [],
        groups: [],
      };
    }

    const membership = initialValue.memberships[0];
    return {
      homeAddresses: initialValue.home_addresses?.join(', ') || '',
      city: membership.city_id || 'irvine',
      selfName: membership.self.display_name || '',
      selfAliases: membership.self.aliases.join(', '),
      married: membership.married,
      showSpouseEvents: membership.show_spouse_events,
      spouseName: membership.spouse?.display_name || '',
      spouseAliases: membership.spouse?.aliases.join(', ') || '',
      hasKids: membership.has_kids,
      showKidsEvents: membership.show_kids_events,
      kids: membership.dependents.map((d) => ({
        name: d.display_name,
        aliases: d.aliases.join(', '),
      })),
      groups: membership.groups || [],
    };
  });

  const [isDirty, setIsDirty] = useState(false);

  // Fetch available groups when city is selected
  useEffect(() => {
    if (formData.city === 'irvine') {
      setLoadingGroups(true);
      fetchAvailableGroups()
        .then((groups) => {
          setAvailableGroups(groups);
        })
        .catch((error) => {
          console.error('Failed to fetch groups:', error);
          setAvailableGroups([]);
        })
        .finally(() => {
          setLoadingGroups(false);
        });
    }
  }, [formData.city]);

  useEffect(() => {
    const initialJson = JSON.stringify(getInitialFormData());
    const currentJson = JSON.stringify(formData);
    setIsDirty(initialJson !== currentJson);
  }, [formData]);

  function getInitialFormData(): ProfileFormData {
    if (!initialValue || initialValue.memberships.length === 0) {
      return {
        homeAddresses: '',
        city: 'irvine',
        selfName: '',
        selfAliases: '',
        married: false,
        showSpouseEvents: false,
        spouseName: '',
        spouseAliases: '',
        hasKids: false,
        showKidsEvents: false,
        kids: [],
        groups: [],
      };
    }

    const membership = initialValue.memberships[0];
    return {
      homeAddresses: initialValue.home_addresses?.join(', ') || '',
      city: membership.city_id || 'irvine',
      selfName: membership.self.display_name || '',
      selfAliases: membership.self.aliases.join(', '),
      married: membership.married,
      showSpouseEvents: membership.show_spouse_events,
      spouseName: membership.spouse?.display_name || '',
      spouseAliases: membership.spouse?.aliases.join(', ') || '',
      hasKids: membership.has_kids,
      showKidsEvents: membership.show_kids_events,
      kids: membership.dependents.map((d) => ({
        name: d.display_name,
        aliases: d.aliases.join(', '),
      })),
      groups: membership.groups || [],
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.selfName.trim()) return;
    onSubmit(formData);
  }

  function addKid() {
    setFormData((prev) => ({
      ...prev,
      kids: [...prev.kids, { name: '', aliases: '' }],
    }));
  }

  function removeKid(index: number) {
    setFormData((prev) => ({
      ...prev,
      kids: prev.kids.filter((_, i) => i !== index),
    }));
  }

  function updateKid(index: number, field: 'name' | 'aliases', value: string) {
    setFormData((prev) => ({
      ...prev,
      kids: prev.kids.map((kid, i) =>
        i === index ? { ...kid, [field]: value } : kid
      ),
    }));
  }

  function toggleGroup(groupId: string) {
    setFormData((prev) => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter((g) => g !== groupId)
        : [...prev.groups, groupId],
    }));
  }

  const canSubmit = formData.selfName.trim().length > 0 && (showHeader ? isDirty : true);

  return (
    <div className="w-full max-w-md mx-auto">
      {showHeader && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-base font-medium text-gray-900">Profile</h2>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`text-sm font-medium ${
              canSubmit ? 'text-purple-700 hover:text-purple-800' : 'text-gray-400'
            }`}
          >
            Save
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {!showHeader && (
          <h2 className="text-lg font-medium text-gray-900">Tell us about you</h2>
        )}

        {/* City */}
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            City
          </label>
          <select
            value={formData.city}
            onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {AVAILABLE_CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Home Addresses */}
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Home Address
          </label>
          <p className="text-[9px] text-gray-400 mb-2">
            How your home is referred to (comma-separated if multiple)
          </p>
          <input
            type="text"
            value={formData.homeAddresses}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, homeAddresses: e.target.value }))
            }
            placeholder="e.g. Goldstone, GS"
            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* You Section */}
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            You
          </label>
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">Display name</label>
              <input
                type="text"
                value={formData.selfName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, selfName: e.target.value }))
                }
                required
                placeholder="John"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">Also known as</label>
              <input
                type="text"
                value={formData.selfAliases}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, selfAliases: e.target.value }))
                }
                placeholder="John Smith, Johnny"
                className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Married Toggle */}
        <div
          className={`border rounded-lg p-3 ${
            formData.married ? 'border-purple-300 bg-purple-50' : 'border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-900">Married?</label>
            <Toggle
              enabled={formData.married}
              onChange={(enabled) => {
                setFormData((prev) => ({
                  ...prev,
                  married: enabled,
                  showSpouseEvents: enabled ? prev.showSpouseEvents : false,
                }));
              }}
            />
          </div>

          {formData.married && (
            <>
              <div className="border-t border-purple-300 pt-3 mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] text-purple-900">
                      Show spouse's events too?
                    </label>
                  </div>
                  <Toggle
                    enabled={formData.showSpouseEvents}
                    onChange={(enabled) =>
                      setFormData((prev) => ({ ...prev, showSpouseEvents: enabled }))
                    }
                  />
                </div>
                {!formData.showSpouseEvents && (
                  <p className="text-[9px] text-purple-900 mt-1">
                    {formData.spouseName
                      ? `${formData.spouseName}'s info is saved but hidden from your feed`
                      : 'You can turn this on later if you change your mind'}
                  </p>
                )}
              </div>

              {formData.showSpouseEvents && (
                <div className="border-t border-purple-300 pt-3 space-y-2">
                  <div>
                    <label className="block text-[10px] text-purple-900 mb-1">
                      Spouse's name
                    </label>
                    <input
                      type="text"
                      value={formData.spouseName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, spouseName: e.target.value }))
                      }
                      placeholder="Sarah"
                      className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.spouseAliases}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, spouseAliases: e.target.value }))
                    }
                    placeholder="Sarah Smith, Sarah S."
                    className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Kids Toggle */}
        <div
          className={`border rounded-lg p-3 ${
            formData.hasKids ? 'border-purple-300 bg-purple-50' : 'border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-900">Have kids?</label>
            <Toggle
              enabled={formData.hasKids}
              onChange={(enabled) => {
                setFormData((prev) => ({
                  ...prev,
                  hasKids: enabled,
                  showKidsEvents: enabled ? prev.showKidsEvents : false,
                  kids: enabled ? prev.kids : [],
                }));
              }}
            />
          </div>

          {formData.hasKids && (
            <>
              <div className="border-t border-purple-300 pt-3 mb-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-purple-900">
                    Show kids' events too?
                  </label>
                  <Toggle
                    enabled={formData.showKidsEvents}
                    onChange={(enabled) =>
                      setFormData((prev) => ({ ...prev, showKidsEvents: enabled }))
                    }
                  />
                </div>
                {!formData.showKidsEvents && formData.kids.length > 0 && (
                  <p className="text-[9px] text-purple-900 mt-1">
                    Kids' info is saved but hidden from your feed
                  </p>
                )}
              </div>

              {formData.showKidsEvents && (
                <div className="border-t border-purple-300 pt-3 space-y-2">
                  {formData.kids.map((kid, index) => (
                    <div
                      key={index}
                      className="bg-white border border-purple-300 rounded-lg p-2.5 flex items-start justify-between gap-2"
                    >
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={kid.name}
                          onChange={(e) => updateKid(index, 'name', e.target.value)}
                          placeholder="Child's name"
                          className="w-full text-[11px] font-medium text-purple-900 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={kid.aliases}
                          onChange={(e) => updateKid(index, 'aliases', e.target.value)}
                          placeholder="Nicknames"
                          className="w-full text-[9px] text-purple-900 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeKid(index)}
                        className="text-[11px] text-purple-900 hover:text-purple-700 mt-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addKid}
                    className="w-full border border-dashed border-purple-300 rounded-lg py-1.5 text-[10px] text-purple-900 hover:bg-purple-100"
                  >
                    + Add child
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Groups */}
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            Groups
          </label>
          {loadingGroups ? (
            <div className="text-xs text-gray-500">Loading groups...</div>
          ) : availableGroups.length === 0 ? (
            <div className="text-xs text-gray-500">No groups available</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableGroups.map((group) => {
                const isSelected = formData.groups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className={`text-[10px] px-3 py-1 rounded-full font-medium ${
                      isSelected
                        ? 'bg-purple-200 text-purple-900'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {group} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Button */}
        {!showHeader && (
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-2.5 rounded-lg font-medium text-xs flex items-center justify-center gap-2 ${
              canSubmit
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  );
}
