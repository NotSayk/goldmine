import { describe, expect, it } from 'vitest';
import { runCues } from '../src/director/cues';
import { Director, type Clock } from '../src/director/director';
import type { Cue, Sequence } from '../src/director/sequences';

/** Horloge factice : les minuteries ne partent que quand le test avance le temps. */
class FakeClock implements Clock {
  private time = 0;
  private nextHandle = 1;
  private timers = new Map<number, { at: number; fn: () => void }>();

  now(): number {
    return this.time;
  }

  setTimeout(fn: () => void, ms: number): unknown {
    const handle = this.nextHandle++;
    this.timers.set(handle, { at: this.time + ms, fn });
    return handle;
  }

  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }

  advance(ms: number): void {
    const end = this.time + ms;
    for (;;) {
      let next: [number, { at: number; fn: () => void }] | undefined;
      for (const entry of this.timers) {
        if (entry[1].at <= end && (!next || entry[1].at < next[1].at)) next = entry;
      }
      if (!next) break;
      this.timers.delete(next[0]);
      this.time = next[1].at;
      next[1].fn();
    }
    this.time = end;
  }
}

let ids = 1;

function sequence(partial: Partial<Sequence> = {}): Sequence {
  return {
    id: ids++,
    dwarfId: null,
    title: 'Test',
    name: '',
    detail: '',
    extra: [],
    visual: { kind: 'skipped' },
    tone: 'info',
    duration: 1000,
    cues: [],
    important: false,
    targetPlayerId: null,
    flight: null,
    ...partial,
  };
}

function setup(options: { maxQueue?: number } = {}) {
  const clock = new FakeClock();
  const started: number[] = [];
  const ended: { id: number; skipped: boolean }[] = [];
  const speeds: number[] = [];
  const director = new Director(
    {
      onStart: (s, speed) => {
        started.push(s.id);
        speeds.push(speed);
      },
      onEnd: (s, skipped) => ended.push({ id: s.id, skipped }),
    },
    clock,
    options,
  );
  return { clock, director, started, ended, speeds };
}

describe('réalisateur', () => {
  it('joue les séquences une par une, dans l’ordre', () => {
    const { clock, director, started, ended } = setup();
    const [a, b] = [sequence(), sequence()];
    director.enqueue([a, b]);
    expect(started).toEqual([a.id]);
    expect(director.snapshot().current?.id).toBe(a.id);
    clock.advance(999);
    expect(ended).toEqual([]);
    clock.advance(1000);
    expect(started).toEqual([a.id, b.id]);
    clock.advance(1000);
    expect(ended).toEqual([
      { id: a.id, skipped: false },
      { id: b.id, skipped: false },
    ]);
    expect(director.snapshot().current).toBeNull();
  });

  it('passe une séquence ou toute la file', () => {
    const { director, started, ended } = setup();
    const [a, b, c] = [sequence(), sequence(), sequence()];
    director.enqueue([a, b, c]);
    director.skip();
    expect(started).toEqual([a.id, b.id]);
    director.skipAll();
    expect(ended.map((e) => e.id).sort()).toEqual([a.id, b.id, c.id].sort());
    expect(ended.every((e) => e.skipped)).toBe(true);
    expect(director.snapshot()).toMatchObject({ current: null, queued: 0 });
  });

  it('ne laisse pas la file déborder et garde les séquences importantes', () => {
    const { director, ended } = setup({ maxQueue: 3 });
    const important = sequence({ important: true });
    const minor = [sequence(), sequence(), sequence(), sequence()];
    director.enqueue([sequence()]);
    director.enqueue([important, ...minor]);
    expect(director.snapshot().queued).toBe(3);
    const dropped = ended.filter((e) => e.skipped).map((e) => e.id);
    expect(dropped).not.toContain(important.id);
    expect(dropped).toHaveLength(2);
  });

  it('accélère quand la file s’allonge et quand c’est au joueur, sans dépasser le plafond', () => {
    const calm = setup();
    calm.director.enqueue([sequence()]);
    const busy = setup();
    busy.director.enqueue([sequence(), sequence(), sequence(), sequence(), sequence()]);
    const urgent = setup();
    urgent.director.setUrgent(true);
    urgent.director.setBaseSpeed(1.6);
    urgent.director.enqueue([sequence(), sequence(), sequence(), sequence(), sequence()]);
    expect(calm.speeds[0]).toBe(1);
    expect(busy.speeds[0]).toBe(2);
    expect(urgent.speeds[0]).toBe(3);
    expect(busy.director.snapshot().durationMs).toBe(500);
  });
});

describe('repères d’une séquence', () => {
  const cues: Cue[] = [
    { at: 0, type: 'sound', sound: 'draw' },
    { at: 600, type: 'shake', strength: 1 },
    { at: 900, type: 'reveal' },
  ];

  it('les programme à l’échelle de la vitesse', () => {
    const clock = new FakeClock();
    const played: string[] = [];
    runCues(
      sequence({ cues }),
      2,
      { accepts: () => true, onCue: (cue) => played.push(`${cue.type}@${clock.now()}`) },
      clock,
    );
    clock.advance(1000);
    expect(played).toEqual(['sound@0', 'shake@300', 'reveal@450']);
  });

  it('filtre les effets mais garde toujours la révélation', () => {
    const clock = new FakeClock();
    const played: string[] = [];
    runCues(
      sequence({ cues }),
      1,
      { accepts: (cue) => cue.type === 'sound', onCue: (cue) => played.push(cue.type) },
      clock,
    );
    clock.advance(1000);
    expect(played).toEqual(['sound', 'reveal']);
  });

  it('saute à l’état final quand la séquence est passée', () => {
    const clock = new FakeClock();
    const played: string[] = [];
    const stop = runCues(
      sequence({ cues }),
      1,
      { accepts: () => true, onCue: (cue) => played.push(cue.type) },
      clock,
    );
    clock.advance(100);
    stop();
    clock.advance(2000);
    // Le tremblement à venir est abandonné, la nouvelle vue est montrée tout de suite.
    expect(played).toEqual(['sound', 'reveal']);
  });
});
