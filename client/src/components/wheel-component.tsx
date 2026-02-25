import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlayCircle, Trophy, Coins, Gift, Star } from "lucide-react";
import { useLocation } from "wouter";

interface WheelComponentProps {
  spinsAvailable: number;
}

export default function WheelComponent({ spinsAvailable }: WheelComponentProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Fetch wheel prizes from API (with fallback to hardcoded) - uses default queryFn with credentials
  const { data: wheelPrizesData } = useQuery<{ prizes: any[] }>({
    queryKey: ['/api', 'wheel-prizes'],
  });

  // Use API prizes or fallback to hardcoded (for backward compatibility)
  // Map API response to wheel segment format (prizeTitle -> label)
  const wheelSegments = (wheelPrizesData?.prizes?.length ?? 0) > 0 
    ? wheelPrizesData!.prizes.map((prize: any) => ({
        ...prize,
        label: prize.prizeTitle || prize.label || 'Prijs'
      }))
    : [
        { id: '1', label: '10 Punten', color: '#8B5CF6', startAngle: 345, endAngle: 15 },
        { id: '2', label: '25 Punten', color: '#10B981', startAngle: 15, endAngle: 45 },
        { id: '3', label: '15 Punten', color: '#3B82F6', startAngle: 45, endAngle: 75 },
        { id: '4', label: 'JACKPOT', color: '#F59E0B', startAngle: 75, endAngle: 105 },
        { id: '5', label: '55 Punten', color: '#EAB308', startAngle: 105, endAngle: 135 },
        { id: '6', label: 'Helaas', color: '#6B7280', startAngle: 135, endAngle: 165 },
        { id: '7', label: '55 Punten', color: '#EC4899', startAngle: 165, endAngle: 195 },
        { id: '8', label: '10 Punten', color: '#06B6D4', startAngle: 195, endAngle: 225 },
        { id: '9', label: 'Helaas', color: '#059669', startAngle: 225, endAngle: 255 },
        { id: '10', label: '20 Punten', color: '#1D4ED8', startAngle: 255, endAngle: 285 },
        { id: '11', label: '10 Punten', color: '#DC2626', startAngle: 285, endAngle: 315 },
        { id: '12', label: '30 Punten', color: '#7C3AED', startAngle: 315, endAngle: 345 }
      ];

  // Function to create SVG path for each segment
  const createSegmentPath = (startAngle: number, endAngle: number, centerX: number, centerY: number, radius: number) => {
    // Handle wrap-around case (345-15 degrees)
    let actualEndAngle = endAngle;
    if (startAngle > endAngle) {
      actualEndAngle = endAngle + 360;
    }
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (actualEndAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArcFlag = actualEndAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Function to determine which segment the pointer lands on
  const getSegmentAtAngle = (wheelRotation: number) => {
    // De pointer staat altijd bovenaan (12 o'clock = 270° in CSS coordinaten)
    // Maar mijn segmenten zijn gedefinieerd alsof 0° bovenaan is
    // Dus ik moet de wheel rotatie omzetten naar "waar de pointer naar wijst"
    
    // CSS rotatie draait clockwise, maar mijn segmenten gaan ook clockwise vanaf top
    // De pointer staat op 270° in CSS coordinaten, dus ik moet daar voor compenseren
    const pointerAngleInCSS = 270; // Pointer staat bovenaan
    
    // Bereken waar de pointer naar wijst op het wiel
    const pointingAt = (pointerAngleInCSS - wheelRotation) % 360;
    const normalizedAngle = ((pointingAt % 360) + 360) % 360;
    
    console.log(`🎯 Pointer wijst naar:`, normalizedAngle, '°');
    
    // Find which segment this angle falls into
    for (const segment of wheelSegments) {
      let { startAngle, endAngle } = segment;
      
      // Handle wrap-around case (e.g., 345-15 degrees)
      if (startAngle > endAngle) {
        if (normalizedAngle >= startAngle || normalizedAngle <= endAngle) {
          console.log(`🎯 Match gevonden:`, segment.label, `(${startAngle}°-${endAngle}°)`);
          return segment;
        }
      } else {
        if (normalizedAngle >= startAngle && normalizedAngle <= endAngle) {
          console.log(`🎯 Match gevonden:`, segment.label, `(${startAngle}°-${endAngle}°)`);
          return segment;
        }
      }
    }
    
    console.log(`🎯 Geen match gevonden, fallback naar:`, wheelSegments[0].label);
    // Fallback to first segment if nothing found
    return wheelSegments[0];
  };

  const spinMutation = useMutation({
    mutationFn: async (finalRotation: number) => {
      // Calculate where the pointer is pointing
      // Pointer is at top = 270° in SVG coordinates
      // When wheel rotates clockwise, pointer points at (270 - rotation)
      const wheelRotation = finalRotation % 360;
      const landingAngle = ((270 - wheelRotation) % 360 + 360) % 360;
      
      console.log(`🎯 Verzenden naar server:`, {
        wheelRotation,
        landingAngle
      });
      
      const response = await apiRequest("POST", "/api/wheel/spin", {
        landingAngle
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Show result after wheel stops (4 seconds for better timing)
      setTimeout(() => {
        setResult(data);
        setShowResult(true);
        setIsSpinning(false);
      }, 4000);
      
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error) => {
      toast({
        title: "Spin mislukt",
        description: error.message,
        variant: "destructive",
      });
      setIsSpinning(false);
    },
  });

  const handleSpin = () => {
    if (spinsAvailable <= 0) {
      toast({
        title: "Geen spins beschikbaar",
        description: "Je hebt geen spins meer. Scan een QR-code om een nieuwe spin te krijgen!",
        variant: "destructive",
      });
      return;
    }

    setIsSpinning(true);
    setShowResult(false);
    
    // Generate a random final position for the wheel
    const currentRotation = wheelRotation % 360;
    const extraSpins = 4 + Math.random() * 3; // 4-7 full rotations
    const randomFinalAngle = Math.random() * 360; // Random final position
    const finalRotation = currentRotation + (extraSpins * 360) + randomFinalAngle;
    
    // Start the wheel spinning
    setWheelRotation(finalRotation);
    
    // After animation completes, determine landing position and send to backend
    setTimeout(() => {
      spinMutation.mutate(finalRotation);
    }, 4000); // Match the CSS animation duration
  };

  const closeResult = () => {
    setShowResult(false);
    setResult(null);
    // Navigate to rewards page if voucher was won
    if (result?.voucher) {
      navigate('/rewards');
    }
  };

  return (
    <>
      <div className="relative mb-8">
        {/* Programmable SVG Wheel - Rotates */}
        <div 
          className="w-96 h-96 relative"
          style={{
            transform: `rotate(${wheelRotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.23, 1, 0.32, 1)' : 'none'
          }}
        >
          <svg width="384" height="384" className="w-full h-full drop-shadow-2xl">
            {/* Outer circle border */}
            <circle cx="192" cy="192" r="180" fill="none" stroke="#1F2937" strokeWidth="8" />
            
            {/* Wheel Segments */}
            {wheelSegments.map((segment: any, index: number) => {
              const path = createSegmentPath(segment.startAngle, segment.endAngle, 192, 192, 175);
              
              // Calculate text position
              const midAngle = segment.startAngle > segment.endAngle 
                ? (segment.startAngle + segment.endAngle + 360) / 2
                : (segment.startAngle + segment.endAngle) / 2;
              const textRad = (midAngle * Math.PI) / 180;
              const textRadius = 120;
              const textX = 192 + textRadius * Math.cos(textRad);
              const textY = 192 + textRadius * Math.sin(textRad);
              
              return (
                <g key={index}>
                  <path 
                    d={path} 
                    fill={segment.color}
                    stroke="white" 
                    strokeWidth="3"
                  />
                  <text 
                    x={textX} 
                    y={textY} 
                    textAnchor="middle" 
                    dominantBaseline="central"
                    className="font-bold text-white fill-white"
                    fontSize="16"
                    transform={`rotate(${midAngle}, ${textX}, ${textY})`}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
            
            {/* Center circle */}
            <circle cx="192" cy="192" r="25" fill="#1F2937" stroke="white" strokeWidth="4" />
          </svg>
        </div>
        
        {/* Static Pointer - BIGGER and positioned to clearly point into wheel */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-20">
          {/* Much bigger pointer for clear color detection */}
          <div className="relative flex flex-col items-center">
            {/* Bigger pointer base */}
            <div className="w-8 h-8 bg-red-600 rounded-full border-4 border-white shadow-2xl mb-2 animate-pulse"></div>
            {/* Much bigger arrow pointing deep into wheel for color detection */}
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-red-600 drop-shadow-2xl" 
                 style={{ borderTopWidth: '32px', borderLeftWidth: '16px', borderRightWidth: '16px' }}></div>
            {/* Pointer tip for exact color detection */}
            <div className="absolute top-12 w-1 h-8 bg-red-600 shadow-xl"></div>
          </div>
        </div>
      </div>
      
      {/* Spin Information */}
      <div className="text-center mb-6">
        <p className="text-white text-lg font-semibold mb-2" data-testid="text-spins-available">
          Je hebt {spinsAvailable} spin{spinsAvailable !== 1 ? 's' : ''} beschikbaar!
        </p>
        <p className="text-white/80 text-sm">
          Spin het wiel voor een kans op extra punten
        </p>
      </div>
      
      {/* Spin Button */}
      <Button 
        onClick={handleSpin}
        disabled={isSpinning || spinsAvailable <= 0 || spinMutation.isPending}
        className="bg-white text-secondary px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-shadow"
        data-testid="button-spin-wheel"
      >
        {isSpinning ? (
          <>
            <div className="animate-spin w-5 h-5 border-2 border-secondary border-t-transparent rounded-full mr-2" />
            Aan het draaien...
          </>
        ) : (
          <>
            <PlayCircle className="w-5 h-5 mr-2" />
            Spin het wiel!
          </>
        )}
      </Button>

      {/* Simplified Result Modal */}
      {showResult && result && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <Card className="w-full max-w-md animate-in fade-in zoom-in duration-500">
            <CardContent className="p-8 text-center">
              {/* Icon based on result */}
              <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                {result.voucher ? (
                  <Gift className="text-white w-10 h-10" />
                ) : result.pointsWon >= 50 ? (
                  <Trophy className="text-yellow-300 w-10 h-10" />
                ) : result.pointsWon >= 25 ? (
                  <Star className="text-yellow-300 w-10 h-10" />
                ) : result.pointsWon >= 10 ? (
                  <Coins className="text-yellow-300 w-10 h-10" />
                ) : result.pointsWon > 0 ? (
                  <Coins className="text-yellow-300 w-10 h-10" />
                ) : (
                  <div className="text-white text-2xl">😔</div>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-2xl font-bold mb-3" data-testid="text-result-title">
                {result.voucher || result.pointsWon > 0 ? "🎉 Gefeliciteerd!" : "😔 Helaas!"}
              </h3>
              
              {/* Simplified Message */}
              <p className="text-foreground text-lg mb-8" data-testid="text-result-message">
                {result.voucher 
                  ? `Je hebt een prijs gewonnen! Ga naar je Rewards om deze te claimen.`
                  : result.pointsWon > 0 
                    ? `Je hebt ${result.pointsWon} punten gewonnen!` 
                    : result.message}
              </p>
              
              {/* Action Button */}
              <Button 
                onClick={closeResult} 
                className="w-full bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-white py-3 text-lg font-semibold"
                data-testid="button-close-result"
              >
                {result.voucher ? "Ga naar Rewards" : "Sluiten"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}