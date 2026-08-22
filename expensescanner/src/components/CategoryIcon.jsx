import { Car, CircleParking, Fuel, Hotel, MoreHorizontal, Utensils } from 'lucide-react';

// Only the glyphs the categories actually use, imported by name so the
// bundler can drop the rest of the icon set.
const ICONS = {
  Fuel,
  Car,
  CircleParking,
  Hotel,
  Utensils,
  MoreHorizontal,
};

export default function CategoryIcon({ name, size = 16, color, style }) {
  const Glyph = ICONS[name] || MoreHorizontal;
  return <Glyph size={size} color={color} style={style} aria-hidden="true" />;
}
