import type { ExitActionKind, ExtractionKind } from '@pepite/engine';
import { BRANDING } from '@pepite/shared/branding';
import { ExitActionIcon, ExtractionCardArt } from '../assets/Cards';
import { DragonHead } from '../assets/Dragon';
import { BigNugget } from '../assets/Nugget';
import { EXIT_LABELS, EXTRACTION_LABELS } from '../i18n/fr';
import { Modal } from './Modal';

const EXTRACTION_ORDER: ExtractionKind[] = ['redDoor', 'blueDoor', 'noDoor'];
const EXIT_ORDER: ExitActionKind[] = ['step', 'doubleStep', 'allTogether', 'swap', 'goldBonus'];

/** Aide au jeu : résumé des règles, rédigé pour cette version. */
export function RulesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Comment jouer" onClose={onClose}>
      <div className="rules">
        <p>
          Chaque joueur guide un nain dans une mine. Tout le monde part du <strong>Wagon</strong>,
          au milieu de la piste. À gauche, la <strong>Sortie</strong> ; à droite, le dragon{' '}
          <strong>{BRANDING.dragonName}</strong>, qui avance vers la Sortie en brûlant les galeries.
          La partie dure <strong>3 manches</strong>.
        </p>
        <h3>À votre tour : creuser ou fuir</h3>
        <ul>
          <li>
            <strong>Creuser</strong> : piochez la carte du dessus de la pioche Extraction, face
            cachée. Elle est montrée à tous, rapporte de l’or et peut déplacer votre nain.
          </li>
          <li>
            <strong>Fuir</strong> : piochez une carte Exit, face cachée, pour avancer vers la Sortie
            ou jouer un tour à un adversaire.
          </li>
        </ul>
        <h3>Cartes Extraction</h3>
        <ul>
          {EXTRACTION_ORDER.map((kind) => (
            <li key={kind} className="legend">
              <span style={{ width: 36, display: 'inline-block' }}>
                <ExtractionCardArt kind={kind} />
              </span>
              <span>
                <strong>{EXTRACTION_LABELS[kind].name}</strong> : {EXTRACTION_LABELS[kind].effect}.
              </span>
            </li>
          ))}
        </ul>
        <h3>Le dragon</h3>
        <p className="legend">
          <DragonHead size={40} />
          <span>
            Après chaque carte creusée, la carte suivante de la pioche est retournée si c’est un
            dragon : {BRANDING.dragonName} avance d’une carte, la galerie dépassée devient rouge et
            les nains qui s’y trouvaient sont éliminés, avec leur or. Leur pion reste, grisé, sur la
            galerie brûlée. Plusieurs dragons à la suite le font avancer plusieurs fois. S’il arrive
            juste devant la Sortie, la manche s’arrête aussitôt. Un nain collé au dragon ne peut pas
            avancer vers lui (il prend quand même l’or).
          </span>
        </p>
        <h3>Cartes Exit</h3>
        <ul>
          {EXIT_ORDER.map((action) => (
            <li key={action} className="legend">
              <ExitActionIcon action={action} />
              <span>
                <strong>{EXIT_LABELS[action].name}</strong> : {EXIT_LABELS[action].effect}
              </span>
            </li>
          ))}
        </ul>
        <p>
          Une carte à deux actions vous laisse choisir ; si une action est impossible, l’autre
          s’applique.
        </p>
        <h3>La Sortie</h3>
        <p>
          Un nain qui atteint la Sortie met son or à l’abri et ne joue plus de la manche. Il prend
          la plus haute place libre sur l’échelle : elle départage les égalités. La manche se
          termine quand plus aucun nain n’est dans la mine, ou quand le dragon arrive devant la
          Sortie.
        </p>
        <h3>Décompte</h3>
        <p className="legend">
          <BigNugget size={28} />
          <span>
            Manches 1 et 2 : les trois nains sortis les plus riches gagnent 3, 2 et 1 Grosses
            pépites (pas de récompense sans or). Manche 3 : chaque Grosse pépite vaut une pépite et
            s’ajoute à votre or ; le plus riche gagne. Un nain éliminé en manche 3 ne garde que ses
            Grosses pépites.
          </span>
        </p>
        <h3>À 2 joueurs</h3>
        <p>
          Variante conseillée : chacun guide deux nains qui jouent l’un après l’autre et partagent
          leur or. Si l’un est éliminé, l’autre garde l’or. Si l’un sort, il emporte l’or amassé et
          son équipier repart de zéro.
        </p>
        <h3>Temps de jeu</h3>
        <p>
          Chaque joueur a 45 secondes pour jouer son tour (un compte à rebours s’affiche). Passé ce
          délai, une pièce est lancée devant tout le monde : pile, il creuse ; face, il fuit. Même
          chose pour choisir entre les deux actions d’une carte Exit (au moins 15 secondes pour lire
          la carte). Les bots ne sont pas chronométrés.
        </p>
        <h3>Ce que l’on voit</h3>
        <p>
          Les deux pioches sont face cachée : on découvre une carte en la piochant, et tout le monde
          la voit à ce moment-là. Seul le nombre total de cartes restantes est affiché. L’or de
          chaque joueur est visible de tous. Les pioches sont mélangées une seule fois en début de
          manche : l’ordre des cartes est fixé à l’avance, rien n’est tiré au hasard au moment où
          l’on pioche.
        </p>
      </div>
    </Modal>
  );
}
