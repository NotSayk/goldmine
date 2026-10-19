import {
  setPreferences,
  usePreferences,
  type MotionPreference,
  type ThemePreference,
} from '../preferences';
import { Modal } from './Modal';

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <div className="segmented">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const preferences = usePreferences();
  return (
    <Modal open={open} title="Réglages" onClose={onClose}>
      <div className="menu">
        <Segmented<ThemePreference>
          label="Thème"
          value={preferences.theme}
          options={[
            { value: 'auto', label: 'Système' },
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
          onChange={(theme) => setPreferences({ theme })}
        />
        <Segmented<MotionPreference>
          label="Animations"
          value={preferences.motion}
          options={[
            { value: 'auto', label: 'Système' },
            { value: 'full', label: 'Activées' },
            { value: 'reduced', label: 'Réduites' },
          ]}
          onChange={(motion) => setPreferences({ motion })}
        />
      </div>
    </Modal>
  );
}
