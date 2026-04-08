type ToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export default function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-7 h-4 rounded-full transition-colors ${
        enabled ? 'bg-purple-500' : 'bg-gray-300'
      }`}
    >
      <div
        className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform ${
          enabled ? 'right-0.5' : 'left-0.5'
        } ${!enabled && 'border border-gray-300'}`}
      />
    </button>
  );
}
