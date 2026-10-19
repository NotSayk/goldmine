import { useEffect, useRef } from 'react';
import type { LogEntry } from '../store';

export function GameLog({ entries }: { entries: readonly LogEntry[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [entries]);
  return (
    <details className="panel collapsible" open>
      <summary>Journal de la partie</summary>
      <ol className="log" ref={listRef} aria-live="polite" aria-relevant="additions">
        {entries.length === 0 && (
          <li className="muted">Les actions de la partie s’afficheront ici.</li>
        )}
        {entries.map((entry) => (
          <li key={entry.id} data-tone={entry.tone}>
            {entry.text}
          </li>
        ))}
      </ol>
    </details>
  );
}
