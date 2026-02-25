import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  logoUrl?: string | null;
  description?: string | null;
}

interface Reward {
  id: string;
  title: string;
  description?: string | null;
  pointsCost: number;
  isMainReward: boolean;
  partner: Partner;
  maxRedemptions?: number | null;
  currentRedemptions: number;
}

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  compact?: boolean;
  onTitleClick?: (reward: Reward) => void;
}

export default function RewardCard({ reward, userPoints, compact = false, onTitleClick }: RewardCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const canAfford = userPoints >= reward.pointsCost;
  const isAvailable = !reward.maxRedemptions || reward.currentRedemptions < reward.maxRedemptions;

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await apiRequest("POST", "/api/rewards/claim", { rewardId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reward geclaimd!",
        description: data.message,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error) => {
      toast({
        title: "Claim mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClaim = () => {
    claimMutation.mutate(reward.id);
  };

  return (
    <Card className={`relative ${canAfford && isAvailable ? '' : 'bg-gray-50 dark:bg-gray-900 border-dashed'}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img 
              src={reward.partner.logoUrl || 'https://via.placeholder.com/48x48?text=' + reward.partner.name[0]}
              alt={`${reward.partner.name} logo`}
              className={`w-12 h-12 rounded-lg object-cover ${!canAfford || !isAvailable ? 'opacity-50' : ''}`}
              data-testid={`img-partner-${reward.partner.id}`}
            />
            {(!canAfford || !isAvailable) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm border">
                  <Lock className="w-3 h-3 text-gray-500" />
                </div>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h4 
              className={`font-semibold ${!canAfford || !isAvailable ? 'opacity-50' : ''} ${onTitleClick ? 'text-blue-600 hover:text-blue-800 cursor-pointer hover:underline' : ''}`} 
              data-testid={`text-reward-title-${reward.id}`}
              onClick={() => onTitleClick?.(reward)}
            >
              {reward.title}
            </h4>
            <div className={`text-muted-foreground text-sm ${!canAfford || !isAvailable ? 'opacity-50' : ''}`} data-testid={`text-reward-description-${reward.id}`}>
              {reward.description && reward.description.length > 100 ? (
                <>
                  <p className="line-clamp-2 leading-relaxed">
                    {reward.description}
                  </p>
                  <button 
                    onClick={() => onTitleClick?.(reward)}
                    className="text-blue-600 hover:text-blue-800 hover:underline text-xs mt-1 block font-medium"
                    data-testid={`button-read-more-${reward.id}`}
                  >
                    lees meer...
                  </button>
                </>
              ) : (
                <p className="line-clamp-2 leading-relaxed">
                  {reward.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <span className={`bg-secondary/10 text-secondary px-2 py-1 rounded-md text-xs font-medium ${!canAfford || !isAvailable ? 'opacity-50' : ''}`}>
                {reward.pointsCost} punten
              </span>
              <span className={`text-xs font-medium flex items-center space-x-1 ${
                canAfford && isAvailable ? 'text-accent' : 'text-muted-foreground'
              }`}>
                {(!canAfford || !isAvailable) && <Lock className="w-3 h-3" />}
                <span>
                  {canAfford && isAvailable 
                    ? 'Beschikbaar' 
                    : !canAfford 
                      ? 'Onvoldoende punten'
                      : 'Uitverkocht'
                  }
                </span>
              </span>
            </div>
          </div>
          <Button
            onClick={handleClaim}
            disabled={!canAfford || !isAvailable || claimMutation.isPending}
            className={`${
              canAfford && isAvailable
                ? 'snapbag-button-primary'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-not-allowed'
            }`}
            data-testid={`button-claim-${reward.id}`}
          >
            {claimMutation.isPending ? 'Claimen...' : 'Claim'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
