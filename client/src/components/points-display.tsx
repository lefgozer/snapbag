import { Card, CardContent } from "@/components/ui/card";
import { Star, Trophy } from "lucide-react";
import { useDesignMode } from "@/hooks/useDesignMode";

interface PointsDisplayProps {
  points: number;
  lifetimeXP: number;
  level: number;
  animate?: boolean;
}

export default function PointsDisplay({ 
  points, 
  lifetimeXP, 
  level, 
  animate = false 
}: PointsDisplayProps) {
  const { gradientClass, cardClass, isProfessional } = useDesignMode();
  
  const cardStyles = isProfessional ? 
    `${gradientClass} text-white ${cardClass}` : 
    'snapbag-gradient text-white shadow-lg';

  return (
    <Card className={cardStyles}>
      <CardContent className={isProfessional ? "p-8" : "p-6"}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Jouw Punten</h2>
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Star className="w-4 h-4" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/80 text-sm">Punten</p>
            <p 
              className={`text-2xl font-bold ${animate ? 'pulse-points' : ''}`}
              data-testid="text-points-display"
            >
              {points.toLocaleString()}
            </p>
            <p className="text-white/60 text-xs">punten</p>
          </div>
          <div>
            <p className="text-white/80 text-sm">Level</p>
            <p className="text-2xl font-bold" data-testid="text-level-display">
              {level}
            </p>
            <div className="mt-2 space-y-1">
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div 
                  className="bg-white h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, ((lifetimeXP) % 500) / 500 * 100)}%`
                  }}
                />
              </div>
              <p className="text-white/60 text-xs">
                nog {500 - ((lifetimeXP) % 500)} XP voor level {level + 1}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
