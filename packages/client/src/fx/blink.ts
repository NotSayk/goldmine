/**
 * Clignements des nains. Leurs yeux sont dans le dessin SVG : leur animation
 * passe par le fil principal, et une image y est préparée tant qu'un œil
 * bouge. Un minuteur fait donc cligner les nains par vagues : toutes les 2,3 s
 * environ, chaque nain a une chance sur deux de cligner. Chacun cligne ainsi en
 * moyenne toutes les 4,6 s, à des moments variés, mais les yeux ne bougent que
 * pendant les vagues (environ 12 % du temps), sans événement d'animation entre deux.
 */
const WAVE_MS = 2300;
const BLINK_MS = 280;

export function startBlinking(): () => void {
  let timer: ReturnType<typeof setTimeout>;
  const wave = (): void => {
    const root = document.documentElement;
    if (document.hidden || root.dataset.quality === 'low' || root.dataset.motion === 'reduced') {
      return;
    }
    const blinking: Element[] = [];
    for (const token of document.querySelectorAll('.token--idle')) {
      if (Math.random() < 0.5) {
        token.classList.add('token--blink');
        blinking.push(token);
      }
    }
    if (blinking.length === 0) return;
    setTimeout(() => {
      for (const token of blinking) token.classList.remove('token--blink');
    }, BLINK_MS + 20);
  };
  const schedule = (): void => {
    timer = setTimeout(
      () => {
        wave();
        schedule();
      },
      WAVE_MS * (0.7 + Math.random() * 0.6),
    );
  };
  schedule();
  return () => clearTimeout(timer);
}
