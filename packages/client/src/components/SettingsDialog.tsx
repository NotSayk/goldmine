import { useId } from 'react';
import {
  setPreferences,
  usePreferences,
  type AnimationSpeed,
  type MotionPreference,
  type QualityPreference,
  type ThemePreference,
} from '../preferences';
import { Modal } from './Modal';

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  return (
    <div className="field" role="group" aria-label={label}>
      <span className="field__label">{label}</span>
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
      {hint && <span className="small muted">{hint}</span>}
    </div>
  );
}

function Volume({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const percent = Math.round(value * 100);
  return (
    <div className="field range">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{percent} %</output>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {hint && <span className="muted small"> {hint}</span>}
      </span>
    </label>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const preferences = usePreferences();
  return (
    <Modal open={open} title="Réglages" onClose={onClose}>
      <div className="menu">
        <section className="menu__section" aria-label="Affichage">
          <h3>Affichage</h3>
          <Segmented<ThemePreference>
            label="Thème"
            value={preferences.theme}
            options={[
              { value: 'auto', label: 'Système' },
              { value: 'mine', label: 'Mine' },
              { value: 'contrast', label: 'Contraste élevé' },
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
            hint="Réduites : fondus courts, sans tremblement, parallaxe ni particules."
          />
          <Segmented<AnimationSpeed>
            label="Vitesse des cinématiques"
            value={preferences.animationSpeed}
            options={[
              { value: 'normal', label: 'Normale' },
              { value: 'fast', label: 'Rapide' },
            ]}
            onChange={(animationSpeed) => setPreferences({ animationSpeed })}
          />
          <Segmented<QualityPreference>
            label="Qualité des effets"
            value={preferences.quality}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'low', label: 'Basse' },
              { value: 'medium', label: 'Moyenne' },
              { value: 'high', label: 'Élevée' },
            ]}
            onChange={(quality) => setPreferences({ quality })}
            hint="Auto baisse la qualité si l’animation devient saccadée."
          />
        </section>
        <section className="menu__section" aria-label="Son">
          <h3>Son</h3>
          <Toggle
            label="Couper le son"
            checked={preferences.muted}
            onChange={(muted) => setPreferences({ muted })}
          />
          <Volume
            label="Musique"
            value={preferences.musicVolume}
            disabled={preferences.muted}
            onChange={(musicVolume) => setPreferences({ musicVolume })}
          />
          <Volume
            label="Effets sonores"
            value={preferences.sfxVolume}
            disabled={preferences.muted}
            onChange={(sfxVolume) => setPreferences({ sfxVolume })}
          />
        </section>
        <section className="menu__section" aria-label="Divers">
          <h3>Divers</h3>
          <Toggle
            label="Vibrations"
            hint="(téléphone : dragon et éliminations)"
            checked={preferences.vibration}
            onChange={(vibration) => setPreferences({ vibration })}
          />
          <Toggle
            label="Réactions des joueurs"
            hint="(afficher les réactions rapides envoyées pendant la partie)"
            checked={preferences.emotes}
            onChange={(emotes) => setPreferences({ emotes })}
          />
        </section>
      </div>
    </Modal>
  );
}
