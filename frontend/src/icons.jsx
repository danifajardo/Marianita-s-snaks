/**
 * Iconos de lucide como componentes de React.
 *
 * Antes se usaba `createIcons()`, que busca los `<i data-lucide="...">` del DOM y
 * los SUSTITUYE por un `<svg>` (`parentNode.replaceChild`). Eso rompe React de dos
 * maneras:
 *
 *   1. El `<i>` que React creó queda fuera del documento, así que cualquier cambio
 *      posterior se aplica a un nodo huérfano: un icono que cambia de nombre nunca
 *      se actualiza en pantalla. Era un fallo real — al saldar una deuda la fila
 *      pasaba a decir "Efectivo" pero conservaba el icono de fiado.
 *   2. Obligaba a llamar a `createIcons()` en un efecto tras cada render.
 *
 * Aquí el SVG lo dibuja React a partir de los datos del icono (lucide los exporta
 * como `[['path', { d }], ['circle', { cx, cy, r }], …]`), así que se comporta como
 * cualquier otro elemento: se actualiza solo y no hay efectos ni mutaciones.
 *
 * Importar solo los iconos usados mantiene el bundle pequeño: `import * as icons`
 * arrastraba las ~1950 definiciones del set completo.
 *
 * Al añadir un `<Icon name="..." />` nuevo hay que registrarlo abajo.
 */
import {
  ArrowRightLeft,
  Banknote,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  HandCoins,
  Hourglass,
  KeyRound,
  Lock,
  Package,
  Pencil,
  Plus,
  Receipt,
  Search,
  SearchX,
  ShoppingBag,
  Users,
  UsersRound,
  X,
} from 'lucide'

// Nombres en kebab-case, igual que los `data-lucide` de antes.
const ICONOS = {
  'arrow-right-left': ArrowRightLeft,
  'banknote': Banknote,
  'check': Check,
  'check-check': CheckCheck,
  'chevron-down': ChevronDown,
  'clock': Clock,
  'eye': Eye,
  'eye-off': EyeOff,
  'hand-coins': HandCoins,
  'hourglass': Hourglass,
  'key-round': KeyRound,
  'lock': Lock,
  'package': Package,
  'pencil': Pencil,
  'plus': Plus,
  'receipt': Receipt,
  'search': Search,
  'search-x': SearchX,
  'shopping-bag': ShoppingBag,
  'users': Users,
  'users-round': UsersRound,
  'x': X,
}

/**
 * @param {string} name  nombre del icono (ver `ICONOS`)
 * @param {string} label texto para lectores de pantalla; sin él el icono se marca
 *                       como decorativo (`aria-hidden`), que es lo habitual porque
 *                       casi siempre va acompañado de su etiqueta visible.
 */
export function Icon({ name, className, label }) {
  const partes = ICONOS[name]
  if (!partes) return null

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['lucide', 'lucide-' + name, className].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      {partes.map(([Etiqueta, attrs], i) => <Etiqueta key={i} {...attrs} />)}
    </svg>
  )
}
