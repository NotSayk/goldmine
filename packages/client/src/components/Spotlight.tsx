import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { PlayerView } from '@pepite/engine';
import type { DwarfLook } from '@pepite/shared';
import { PACE } from '@pepite/shared/pacing';
import { CardBack, ExitCardFace, ExtractionCardArt } from '../assets/Cards';
import { DragonHead, Flame } from '../assets/Dragon';
import { DwarfToken } from '../assets/DwarfToken';
import { IconSkip, IconSkull, IconSparkle } from '../assets/Icons';
import {
  COIN_FLIP_MS,
  FLIP_AT,
  FLY_MS,
  REVEAL_AT,
  type Sequence,
  type SequenceVisual,
} from '../director/sequences';
import { useLooks } from '../looks';
import { reducedMotion } from '../preferences';
import { client } from '../store';
import { Card3D, type CardFinish } from './Card3D';

const FLIP_MS = PACE.flipMs;
/** Départ de la carte vers la pile ou la défausse, avant la fin de la séquence. */
const LEAVE_MS = 650;

type Layout = 'card' | 'banner' | 'dramatic';

function layoutOf(visual: SequenceVisual): Layout {
  switch (visual.kind) {
    case 'extraction':
    case 'exit':
    case 'exitBack':
    case 'coin':
      return 'card';
    case 'eliminated':
      return 'dramatic';
    default:
      return 'banner';
  }
}

function rectCenter(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function visibleRect(element: Element | null): DOMRect | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const visible =
    rect.width > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth;
  return visible ? rect : null;
}

/**
 * Carte mise en scène : elle quitte la pioche en courbe, marque une pause de
 * suspense (identique quelle que soit la carte), se retourne, puis rejoint la
 * pile du joueur ou se consume dans la défausse. Seules `transform`,
 * `opacity` et `filter` sont animées.
 */
function StagedCard({
  sequence,
  durationMs,
  speed,
  front,
  back,
  className,
  finish = 'plain',
}: {
  sequence: Sequence;
  durationMs: number;
  speed: number;
  front: ReactNode | null;
  back: ReactNode;
  className?: string;
  finish?: CardFinish;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const reduced = reducedMotion();
    const s = (ms: number): number => Math.max(1, ms / speed);
    const animations: Animation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const flight = sequence.flight;
    const flipAt = flight ? FLIP_AT : 150;

    // Départ depuis la pioche, en arc de cercle.
    const deckRect = flight ? visibleRect(document.querySelector(`[data-deck="${flight}"]`)) : null;
    if (deckRect && !reduced) {
      const slot = outer.getBoundingClientRect();
      const from = rectCenter(deckRect);
      const to = rectCenter(slot);
      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const scale = deckRect.width / Math.max(1, slot.width);
      const lift = Math.min(120, Math.abs(dy) * 0.4 + 40);
      animations.push(
        outer.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(-12deg)` },
            {
              transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(${(scale + 1.15) / 2}) rotate(7deg)`,
              offset: 0.5,
            },
            { transform: 'translate(0, -8px) scale(1.1) rotate(0deg)' },
          ],
          { duration: s(FLY_MS), easing: 'cubic-bezier(.25,.75,.3,1)', fill: 'backwards' },
        ),
      );
      // Suspense : la carte reste soulevée, puis se pose en se retournant.
      animations.push(
        outer.animate(
          [
            { transform: 'translate(0, -8px) scale(1.1)' },
            { transform: 'translate(0, -12px) scale(1.11)', offset: 0.6 },
            { transform: 'translate(0, 0) scale(1)' },
          ],
          {
            duration: s(flipAt + FLIP_MS - FLY_MS),
            delay: s(FLY_MS),
            easing: 'ease-in-out',
          },
        ),
      );
    } else if (!reduced) {
      animations.push(
        outer.animate(
          [
            { transform: 'translateY(-24px) scale(0.85)', opacity: 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: s(380), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
        ),
      );
    }

    // Retournement (sans mouvement : simple fondu de la face cachée).
    if (front) {
      const backFace = inner.querySelector<HTMLElement>('.staged-card__back');
      if (reduced) {
        if (backFace) {
          animations.push(
            backFace.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: s(180),
              delay: s(flipAt),
              fill: 'both',
            }),
          );
        }
      } else {
        animations.push(
          inner.animate(
            [
              { transform: 'rotateY(180deg)' },
              { transform: 'rotateY(-12deg)', offset: 0.75 },
              { transform: 'rotateY(0deg)' },
            ],
            { duration: s(FLIP_MS), delay: s(flipAt), easing: 'ease-out', fill: 'backwards' },
          ),
        );
      }
    }

    // Départ vers la pile du joueur ou la défausse.
    const leaveAt = durationMs - LEAVE_MS / speed;
    const destination = sequence.targetPlayerId
      ? `[data-gold-anchor="${CSS.escape(sequence.targetPlayerId)}"]`
      : sequence.visual.kind === 'exit'
        ? '[data-deck="exit-discard"]'
        : null;
    if (destination && front && leaveAt > (REVEAL_AT + 200) / speed) {
      const burn = !sequence.targetPlayerId;
      timers.push(
        setTimeout(() => {
          const target = visibleRect(document.querySelector(destination));
          const slot = outer.getBoundingClientRect();
          if (reduced || !target) {
            animations.push(
              outer.animate([{ opacity: 1 }, { opacity: 0 }], {
                duration: s(LEAVE_MS) * 0.8,
                fill: 'forwards',
              }),
            );
            return;
          }
          const from = rectCenter(slot);
          const to = rectCenter(target);
          const scale = Math.min(target.width, target.height) / Math.max(1, slot.width);
          animations.push(
            outer.animate(
              [
                { transform: 'none', opacity: 1, filter: 'none' },
                {
                  transform: `translate(${(to.x - from.x) * 0.5}px, ${(to.y - from.y) * 0.5 - 30}px) scale(${(scale + 1) / 2}) rotate(8deg)`,
                  opacity: 1,
                  filter: burn ? 'brightness(1.4) sepia(0.6) saturate(2)' : 'none',
                  offset: 0.55,
                },
                {
                  transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${scale}) rotate(14deg)`,
                  opacity: burn ? 0 : 0.2,
                  filter: burn ? 'brightness(2) sepia(1) saturate(4) blur(3px)' : 'none',
                },
              ],
              {
                duration: s(LEAVE_MS) * 0.95,
                easing: 'cubic-bezier(.5,0,.75,0)',
                fill: 'forwards',
              },
            ),
          );
        }, leaveAt),
      );
    }

    return () => {
      for (const animation of animations) animation.cancel();
      for (const timer of timers) clearTimeout(timer);
    };
    // Une seule mise en scène par séquence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence.id]);

  const flat = reducedMotion();
  return (
    <div
      ref={outerRef}
      className={`staged-card ${flat ? 'staged-card--flat' : ''} ${className ?? ''}`}
    >
      <Card3D finish={finish}>
        <div ref={innerRef} className="staged-card__inner">
          <div className="staged-card__face staged-card__back">{back}</div>
          {front && <div className="staged-card__face staged-card__front">{front}</div>}
        </div>
      </Card3D>
    </div>
  );
}

function CardVisual({
  sequence,
  durationMs,
  speed,
}: {
  sequence: Sequence;
  durationMs: number;
  speed: number;
}) {
  const visual = sequence.visual;
  switch (visual.kind) {
    case 'extraction':
      return (
        <StagedCard
          sequence={sequence}
          durationMs={durationMs}
          speed={speed}
          back={<CardBack deck="extraction" />}
          front={<ExtractionCardArt kind={visual.card} />}
          className="staged-card--gold"
          finish={visual.card === 'dragon' ? 'dragon' : 'gold'}
        />
      );
    case 'exitBack':
      return (
        <StagedCard
          sequence={sequence}
          durationMs={durationMs}
          speed={speed}
          back={<CardBack />}
          front={null}
          className="staged-card--waiting"
        />
      );
    case 'exit':
      return (
        <StagedCard
          sequence={sequence}
          durationMs={durationMs}
          speed={speed}
          back={<CardBack />}
          front={<ExitCardFace actions={visual.actions} chosen={visual.chosen} />}
        />
      );
    case 'coin':
      return (
        <div className="spot-coin">
          <div
            className={`coin${visual.side ? ' coin--flip' : ''}`}
            // Nombre pair de demi-tours : pile ; impair : face.
            style={
              {
                '--coin-end': visual.side === 'tails' ? '1980deg' : '1800deg',
                '--coin-dur': `${Math.round(COIN_FLIP_MS / speed)}ms`,
              } as CSSProperties
            }
          >
            <span className="coin__face coin__face--heads">
              <small>Pile</small>
              {visual.heads}
            </span>
            <span className="coin__face coin__face--tails">
              <small>Face</small>
              {visual.tails}
            </span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function BannerIcon({
  visual,
  color,
  look,
}: {
  visual: SequenceVisual;
  color: number | null;
  look: DwarfLook | undefined;
}) {
  switch (visual.kind) {
    case 'dragon':
      return (
        <span className="banner-icon banner-icon--dragon">
          <DragonHead size={64} />
          {visual.steps > 1 && <span className="spot-badge">×{visual.steps}</span>}
        </span>
      );
    case 'exited':
      return (
        <span className="banner-icon banner-icon--exit">
          <DwarfToken color={color ?? 0} look={look} mood="joy" size={56} />
          <IconSparkle className="banner-icon__sparkle" size={22} />
        </span>
      );
    case 'round':
      return (
        <span className="banner-icon banner-icon--shuffle">
          {[0, 1, 2].map((i) => (
            <span
              key={`x${i}`}
              className="shuffle-card shuffle-card--left"
              style={{ '--n': i } as CSSProperties}
            >
              <CardBack deck="extraction" />
            </span>
          ))}
          {[0, 1, 2].map((i) => (
            <span
              key={`e${i}`}
              className="shuffle-card shuffle-card--right"
              style={{ '--n': i } as CSSProperties}
            >
              <CardBack />
            </span>
          ))}
        </span>
      );
    default:
      return (
        <span className="banner-icon">
          <IconSkip size={40} />
        </span>
      );
  }
}

function Controls({ queued, yourTurn }: { queued: number; yourTurn: boolean }) {
  return (
    <div className="spotlight__controls">
      <button
        type="button"
        className="spot-skip"
        onClick={(event) => {
          event.stopPropagation();
          if (yourTurn) client.skipAllSequences();
          else client.skipSequence();
        }}
        title="Passer (Échap)"
      >
        <IconSkip size={16} />
        <span>{yourTurn ? 'À vous : passer' : 'Passer'}</span>
      </button>
      {queued > 0 && !yourTurn && (
        <button
          type="button"
          className="spot-skip"
          onClick={(event) => {
            event.stopPropagation();
            client.skipAllSequences();
          }}
          title="Passer toutes les animations en attente"
        >
          Tout ({queued + 1})
        </button>
      )}
    </div>
  );
}

/** Échap passe la séquence en cours, sauf si une fenêtre est ouverte. */
function useSkipKey(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      if (event.shiftKey) client.skipAllSequences();
      else client.skipSequence();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

/**
 * Coup en cours mis en scène par le réalisateur (carte piochée, action jouée,
 * dragon, sortie, élimination), posé sur la zone des pioches pour que la
 * piste reste visible. Le journal en donne l'équivalent textuel pour les
 * lecteurs d'écran ; un clic ou Échap passe.
 */
export function Spotlight({
  sequence,
  durationMs,
  speed,
  queued,
  view,
}: {
  sequence: Sequence | null;
  durationMs: number;
  speed: number;
  queued: number;
  view: PlayerView;
}) {
  useSkipKey(sequence !== null);
  const looks = useLooks();
  if (!sequence) return null;
  // À votre tour, un clic dégage tout de suite les pioches : toute la file est passée.
  const yourTurn = view.legal.yourTurn;
  const skip = (): void => (yourTurn ? client.skipAllSequences() : client.skipSequence());
  const layout = layoutOf(sequence.visual);
  const dwarf = sequence.dwarfId === null ? undefined : view.dwarves[sequence.dwarfId];
  const color = dwarf?.color ?? null;
  const look = dwarf ? looks.get(dwarf.ownerId) : undefined;
  // Le nom et l'effet de la carte s'affichent dès qu'elle commence à se retourner.
  const revealDelay = sequence.flight && layout === 'card' ? FLIP_AT / speed : 0;
  const style = {
    '--dur': `${durationMs}ms`,
    '--reveal-delay': `${Math.round(revealDelay)}ms`,
  } as CSSProperties;

  const text = (
    <div className="spotlight__text" aria-hidden>
      <p className="spotlight__title">
        {sequence.dwarfId !== null && color !== null && layout !== 'dramatic' && (
          <DwarfToken color={color} look={look} size={30} />
        )}
        <span>{sequence.title}</span>
      </p>
      <div className="spotlight__reveal">
        <p className="spotlight__name">{sequence.name}</p>
        <p className="spotlight__detail">{sequence.detail}</p>
        {sequence.extra.map((line, i) => (
          <p key={i} className="spotlight__extra">
            {line}
          </p>
        ))}
      </div>
    </div>
  );

  if (layout === 'dramatic' && sequence.visual.kind === 'eliminated') {
    const colors = sequence.visual.colors;
    return (
      <div className="spotlight spotlight--dramatic" style={style}>
        {/* Éclair rouge sur les bords de l'écran : le centre (la piste) reste dégagé. */}
        {createPortal(<div className="spot-flash" style={style} aria-hidden />, document.body)}
        <div
          key={sequence.id}
          className={`spotlight__panel spotlight__panel--${sequence.tone}`}
          onClick={skip}
        >
          <div className="spot-eliminated" aria-hidden>
            <span className="spot-flames">
              <Flame size={92} />
            </span>
            <span className="spot-dead-discs">
              {colors.map((dwarfColor, i) => (
                <DwarfToken
                  key={i}
                  color={dwarfColor}
                  mood="dead"
                  size={colors.length > 1 ? 40 : 60}
                />
              ))}
            </span>
            <IconSkull className="spot-skull" size={32} />
          </div>
          {text}
          <Controls queued={queued} yourTurn={yourTurn} />
          <span className="spotlight__timer" aria-hidden />
        </div>
      </div>
    );
  }

  if (layout === 'banner') {
    return (
      <div className={`spotlight spotlight--banner`} data-kind={sequence.visual.kind} style={style}>
        <div
          key={sequence.id}
          className={`spotlight__panel spotlight__panel--${sequence.tone}`}
          onClick={skip}
        >
          <div aria-hidden>
            <BannerIcon visual={sequence.visual} color={color} look={look} />
          </div>
          {text}
          <Controls queued={queued} yourTurn={yourTurn} />
          <span className="spotlight__timer" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="spotlight spotlight--card" data-kind={sequence.visual.kind} style={style}>
      <div
        key={sequence.id}
        className={`spotlight__panel spotlight__panel--${sequence.tone}`}
        onClick={skip}
      >
        <div className="spotlight__card" aria-hidden>
          <CardVisual sequence={sequence} durationMs={durationMs} speed={speed} />
        </div>
        {text}
        <Controls queued={queued} yourTurn={yourTurn} />
        <span className="spotlight__timer" aria-hidden />
      </div>
    </div>
  );
}
