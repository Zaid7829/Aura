import React from 'react';
import { Play, MapPin } from 'lucide-react';
import { ArtworkImage } from '../ui/ArtworkImage';
import { Badge } from '../ui/Badge';

export interface ArtistCardProps {
  name: string;
  location?: string;
  genre?: string;
  artworkUrl: string;
  tracksCount?: number;
  onClick?: () => void;
  className?: string;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({
  name,
  location,
  genre,
  artworkUrl,
  tracksCount,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer p-3 sm:p-4 rounded-2xl bg-aura-850/60 border border-aura-800/80 hover:border-aura-700 transition-all duration-200 tactile-card tactile-card-hover flex flex-col items-center text-center select-none active:scale-[0.98] w-full min-w-0 ${className}`}
    >
      <div className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden mb-2.5 sm:mb-4 border-2 border-aura-700/80 shadow-md shrink-0">
        <ArtworkImage src={artworkUrl} alt={name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-aura-accent text-white flex items-center justify-center shadow-lg">
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      <h4 className="font-serif text-sm sm:text-base text-aura-100 font-medium group-hover:text-aura-accent transition-colors line-clamp-1 w-full px-1">
        {name}
      </h4>

      {location && (
        <p className="text-[11px] sm:text-xs text-aura-400 font-sans mt-0.5 flex items-center justify-center gap-1 w-full truncate px-1">
          <MapPin className="w-3 h-3 text-aura-accent shrink-0" />
          <span className="truncate">{location}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5 w-full">
        {genre && <Badge variant="default" size="sm" className="text-[10px] py-0.5 px-2">{genre}</Badge>}
        {tracksCount !== undefined && (
          <span className="text-[10px] font-mono text-aura-500 shrink-0">
            {tracksCount} {tracksCount === 1 ? 'Cut' : 'Cuts'}
          </span>
        )}
      </div>
    </div>
  );
};
