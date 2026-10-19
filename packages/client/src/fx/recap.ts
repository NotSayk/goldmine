import type { PlayerView } from '@pepite/engine';
import { BRANDING } from '@pepite/shared/branding';
import type { GoldSample } from './gold';

export interface RecapData {
  readonly title: string;
  readonly date: string;
  readonly playerCount: number;
  readonly headline: string;
  readonly standings: readonly {
    readonly rank: number;
    readonly name: string;
    readonly total: number;
    readonly you: boolean;
  }[];
  /** Courbe du joueur seulement : rien de privé sur les autres, hors scores finaux publics. */
  readonly curve: readonly GoldSample[];
  readonly rounds: number;
}

/** Données du récapitulatif de fin de partie (aucune donnée privée d'autrui). */
export function buildRecap(
  view: PlayerView,
  history: readonly GoldSample[],
  now: Date = new Date(),
): RecapData | null {
  const result = view.finalResult;
  if (!result) return null;
  const nameOf = (id: string): string => view.players.find((p) => p.id === id)?.name ?? '?';
  const winners = result.winners.map(nameOf);
  const youWon = view.viewerId !== null && result.winners.includes(view.viewerId);
  return {
    title: BRANDING.gameName,
    date: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    playerCount: view.players.length,
    headline: youWon
      ? 'Victoire !'
      : `${winners.join(' et ')} ${winners.length > 1 ? 'gagnent' : 'gagne'}`,
    standings: result.standings.map((s) => ({
      rank: s.rank,
      name: nameOf(s.playerId),
      total: s.total,
      you: s.playerId === view.viewerId,
    })),
    curve: history,
    rounds: view.totalRounds,
  };
}

const SIZE = 1080;

/** Dessine le récapitulatif (1080 × 1080) et le rend en PNG. */
export async function renderRecap(data: RecapData): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  const display = '"Cinzel", Georgia, serif';
  const body = '"Inter", Arial, sans-serif';

  // Fond : nuit de la mine, lueur dorée en haut, braise en bas à droite.
  const background = ctx.createLinearGradient(0, 0, 0, SIZE);
  background.addColorStop(0, '#141b2b');
  background.addColorStop(1, '#07090f');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const glow = ctx.createRadialGradient(SIZE / 2, -80, 40, SIZE / 2, -80, 700);
  glow.addColorStop(0, 'rgba(242, 182, 50, 0.32)');
  glow.addColorStop(1, 'rgba(242, 182, 50, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const ember = ctx.createRadialGradient(SIZE, SIZE, 20, SIZE, SIZE, 520);
  ember.addColorStop(0, 'rgba(255, 90, 30, 0.28)');
  ember.addColorStop(1, 'rgba(255, 90, 30, 0)');
  ctx.fillStyle = ember;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = 'rgba(242, 182, 50, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, SIZE - 56, SIZE - 56);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd36a';
  ctx.font = `800 84px ${display}`;
  ctx.fillText(data.title, SIZE / 2, 140);
  ctx.fillStyle = '#b2b9c9';
  ctx.font = `500 30px ${body}`;
  ctx.fillText(`${data.date} · ${data.playerCount} joueurs`, SIZE / 2, 192);
  ctx.fillStyle = '#f0e9da';
  ctx.font = `800 54px ${display}`;
  ctx.fillText(data.headline, SIZE / 2, 282);

  // Classement final (scores publics).
  ctx.textAlign = 'left';
  const rowHeight = 50;
  let y = 352;
  for (const standing of data.standings.slice(0, 6)) {
    if (standing.you) {
      ctx.fillStyle = 'rgba(242, 182, 50, 0.16)';
      ctx.fillRect(140, y - 36, SIZE - 280, rowHeight - 4);
    }
    ctx.fillStyle = standing.rank === 1 ? '#ffd36a' : '#f0e9da';
    ctx.font = `800 34px ${display}`;
    ctx.fillText(`${standing.rank}`, 170, y);
    ctx.font = `600 32px ${body}`;
    ctx.fillText(standing.name + (standing.you ? ' (vous)' : ''), 230, y);
    ctx.textAlign = 'right';
    ctx.font = `800 34px ${body}`;
    ctx.fillText(`${standing.total}`, SIZE - 170, y);
    ctx.textAlign = 'left';
    y += rowHeight;
  }

  // Courbe d'or du joueur, coup après coup, une zone par manche.
  const chart = { left: 140, right: SIZE - 110, top: y + 70, bottom: SIZE - 110 };
  ctx.fillStyle = '#b2b9c9';
  ctx.font = `600 28px ${body}`;
  ctx.fillText('Votre or, coup après coup', chart.left, chart.top - 26);
  const points = data.curve.length > 0 ? data.curve : [{ round: 1, gold: 0 }];
  // Échelle ronde : graduations entières tous les quarts.
  const max = Math.ceil(Math.max(4, ...points.map((p) => p.gold)) / 4) * 4;
  const step = (chart.right - chart.left) / Math.max(1, points.length - 1);
  const xOf = (i: number): number => chart.left + i * step;
  const yOf = (gold: number): number => chart.bottom - (gold / max) * (chart.bottom - chart.top);
  ctx.strokeStyle = 'rgba(236, 226, 205, 0.18)';
  ctx.lineWidth = 2;
  ctx.font = `500 22px ${body}`;
  ctx.textAlign = 'right';
  for (let t = 0; t <= 4; t++) {
    const value = (max * t) / 4;
    const ty = yOf(value);
    ctx.beginPath();
    ctx.moveTo(chart.left, ty);
    ctx.lineTo(chart.right, ty);
    ctx.stroke();
    ctx.fillStyle = '#8a93a8';
    ctx.fillText(`${value}`, chart.left - 14, ty + 8);
  }
  ctx.textAlign = 'left';
  points.forEach((point, i) => {
    if (i === 0 || points[i - 1]!.round === point.round) return;
    const x = xOf(i);
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(95, 212, 236, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x, chart.top);
    ctx.lineTo(x, chart.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#5fd4ec';
    ctx.fillText(`Manche ${point.round}`, x + 8, chart.top + 24);
  });
  const area = ctx.createLinearGradient(0, chart.top, 0, chart.bottom);
  area.addColorStop(0, 'rgba(242, 182, 50, 0.45)');
  area.addColorStop(1, 'rgba(242, 182, 50, 0)');
  ctx.beginPath();
  ctx.moveTo(xOf(0), chart.bottom);
  points.forEach((point, i) => ctx.lineTo(xOf(i), yOf(point.gold)));
  ctx.lineTo(xOf(points.length - 1), chart.bottom);
  ctx.closePath();
  ctx.fillStyle = area;
  ctx.fill();
  ctx.beginPath();
  points.forEach((point, i) => {
    if (i === 0) ctx.moveTo(xOf(i), yOf(point.gold));
    else ctx.lineTo(xOf(i), yOf(point.gold));
  });
  ctx.strokeStyle = '#ffd36a';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a93a8';
  ctx.font = `500 22px ${body}`;
  ctx.fillText('Projet de fan non officiel · nom de travail provisoire', SIZE / 2, SIZE - 52);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image vide'))), 'image/png');
  });
}
