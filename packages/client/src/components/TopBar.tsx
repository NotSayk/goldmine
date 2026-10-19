import { useState, type ReactNode } from 'react';
import { BRANDING } from '@pepite/shared/branding';
import { IconBook, IconGear } from '../assets/Icons';
import { Nugget } from '../assets/Nugget';
import { RulesDialog } from './RulesDialog';
import { SettingsDialog } from './SettingsDialog';

export function TopBar({ meta, children }: { meta?: ReactNode; children?: ReactNode }) {
  const [rules, setRules] = useState(false);
  const [settings, setSettings] = useState(false);
  return (
    <header className="topbar">
      <p className="topbar__title">
        <Nugget size={24} />
        {BRANDING.gameName}
        {meta && <span className="topbar__meta">{meta}</span>}
      </p>
      {children}
      <button
        type="button"
        className="icon-btn"
        onClick={() => setRules(true)}
        aria-label="Règles du jeu"
        title="Règles"
      >
        <IconBook />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setSettings(true)}
        aria-label="Réglages"
        title="Réglages"
      >
        <IconGear />
      </button>
      <RulesDialog open={rules} onClose={() => setRules(false)} />
      <SettingsDialog open={settings} onClose={() => setSettings(false)} />
    </header>
  );
}
