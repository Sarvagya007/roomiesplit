import {
  Cat, Dog, Rabbit, Bird, Fish, Squirrel,
  ShoppingBasket, KeyRound, Zap, Wifi, UtensilsCrossed, SprayCan, Bus, Sparkles,
} from 'lucide-react';
import { AVATAR_COLORS, AVATAR_ICONS, CATEGORY_ICONS } from '../../utils/constants.js';

const ICONS = { Cat, Dog, Rabbit, Bird, Fish, Squirrel, ShoppingBasket, KeyRound, Zap, Wifi, UtensilsCrossed, SprayCan, Bus, Sparkles };

const SIZES = { sm: 'h-8 w-8', md: 'h-11 w-11', lg: 'h-14 w-14' };
const ICON_SIZES = { sm: 16, md: 22, lg: 28 };

/** Roommate avatar: colour + animal icon, both customisable. Decorative; the name is always shown next to it. */
export default function Avatar({ roommate, size = 'md', ring = false }) {
  const color = AVATAR_COLORS[roommate.color % AVATAR_COLORS.length].hex;
  const Icon = ICONS[AVATAR_ICONS[roommate.icon % AVATAR_ICONS.length]];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl text-white ${SIZES[size]} ${ring ? 'ring-2 ring-card' : ''}`}
      style={{ backgroundColor: color }}
    >
      <Icon size={ICON_SIZES[size]} strokeWidth={2.2} />
    </span>
  );
}

export function CategoryIcon({ category, size = 18 }) {
  const Icon = ICONS[CATEGORY_ICONS[category] ?? 'Sparkles'];
  return (
    <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lilac-soft text-lilac">
      <Icon size={size} />
    </span>
  );
}
