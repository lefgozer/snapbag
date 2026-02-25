import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDesignMode } from "@/hooks/useDesignMode";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "@/components/navigation";
import PointsDisplay from "@/components/points-display";
import RewardCard from "@/components/reward-card";
import { QrCode, Gift, Star, TrendingUp, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect, useState } from "react";
import type { User, Transaction, Reward, Partner } from "@shared/schema";
import snapbagLogo from "@assets/Scherm­afbeelding 2025-09-03 om 18.11.49_1756915915522.png";
import profilePhoto from "@assets/assets_task_01k2t2q8hdey2rrjb23xa0429n_1755369511_img_0_1756914777969.webp";

type RewardWithPartner = Reward & { partner: Partner };

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { buttonClass, isProfessional } = useDesignMode();
  const [selectedAction, setSelectedAction] = useState<RewardWithPartner | null>(null);
  const [isActionDetailOpen, setIsActionDetailOpen] = useState(false);

  // Fetch user data with updated points
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Fetch rewards
  const { data: rewards } = useQuery<RewardWithPartner[]>({
    queryKey: ["/api/rewards"],
    retry: false,
  });

  // Fetch recent transactions
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    const handleError = (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Niet geautoriseerd",
          description: "Je sessie is verlopen. Opnieuw inloggen...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    };

    // This would be set up with query error handling in a more complete implementation
  }, [toast]);

  // Open action detail popup  
  const openActionDetail = (reward: RewardWithPartner) => {
    setSelectedAction(reward);
    setIsActionDetailOpen(true);
  };

  // Close action detail popup
  const closeActionDetail = () => {
    setSelectedAction(null);
    setIsActionDetailOpen(false);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL');
  };

  return (
    <div className="pb-20">
      <div className="p-4 space-y-6">
        {/* Header with Logo */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <img 
              src={snapbagLogo} 
              alt="Snapbag" 
              className="h-12 object-contain object-left"
              style={{ filter: 'drop-shadow(0 0 0 transparent)' }}
            />
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/profile">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300 flex-shrink-0">
                <img 
                  src={profilePhoto} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  data-testid="img-header-profile"
                />
              </div>
            </Link>
          </div>
        </div>
        {/* Points Display */}
        <PointsDisplay 
          points={currentUser?.points || 0}
          lifetimeXP={currentUser?.lifetimeXP || 0}
          level={currentUser?.level || 1}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/qr-scanner">
            <Button 
              className={`w-full bg-secondary text-white ${isProfessional ? 'rounded-2xl p-6' : 'rounded-xl p-4'} ${buttonClass} flex flex-col items-center justify-center space-y-2 ${isProfessional ? 'shadow-none' : 'shadow-sm hover:shadow-md'} transition-all min-h-[100px]`}
              data-testid="button-scan-qr"
            >
              <QrCode className={isProfessional ? "w-12 h-12" : "w-16 h-16"} />
              <span className={isProfessional ? "text-sm font-medium" : "text-xs"}>Scan QR</span>
            </Button>
          </Link>
          
          {(currentUser?.spinsAvailable || 0) > 0 ? (
            <Link href="/wheel">
              <div className="w-full relative">
                <Button 
                  className={`w-full bg-accent text-white ${isProfessional ? 'rounded-2xl p-6' : 'rounded-xl p-4'} ${buttonClass} flex flex-col items-center justify-center space-y-2 ${isProfessional ? 'shadow-none' : 'shadow-sm hover:shadow-md'} transition-all min-h-[100px]`}
                  data-testid="button-wheel-fortune"
                >
                  <Gift className={isProfessional ? "w-8 h-8" : "w-6 h-6"} />
                  <span className={isProfessional ? "text-sm font-semibold" : "font-medium"}>Gelukswiel</span>
                </Button>
                <span className="absolute top-2 right-2 bg-white text-accent text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                  {currentUser?.spinsAvailable}
                </span>
              </div>
            </Link>
          ) : (
            <div className="w-full relative">
              <Button 
                disabled
                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 shadow-sm min-h-[100px] cursor-not-allowed border-2 border-gray-200 dark:border-gray-700 border-dashed"
                data-testid="button-wheel-locked"
              >
                <div className="relative opacity-50">
                  <Gift className="w-6 h-6" />
                </div>
                <span className="font-medium opacity-50">Gelukswiel</span>
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>{5 - (currentUser?.level || 1)} scans to unlock</span>
                </div>
              </Button>
              {/* Overlay lock indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white dark:bg-gray-900 rounded-full p-2 shadow-lg border-2 border-gray-300 dark:border-gray-600">
                  <Lock className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Partner Rewards */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Partner Aanbiedingen</h3>
            <Link href="/rewards">
              <Button variant="ghost" size="sm" data-testid="link-all-rewards">
                Alles bekijken
              </Button>
            </Link>
          </div>
          
          <div className="space-y-3">
            {rewards?.slice(0, 3).map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                userPoints={currentUser?.points || 0}
                compact={true}
                onTitleClick={openActionDetail}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Recente Activiteit</h3>
          <div className="space-y-3">
            {transactions?.slice(0, 3).map((transaction) => (
              <Card key={transaction.id} className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                    {transaction.type === 'qr_scan' && <QrCode className="w-4 h-4 text-accent" />}
                    {transaction.type === 'verification' && <TrendingUp className="w-4 h-4 text-primary" />}
                    {transaction.type === 'wheel_spin' && <Gift className="w-4 h-4 text-secondary" />}
                    {transaction.type === 'reward_claim' && <Star className="w-4 h-4 text-destructive" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm" data-testid={`text-transaction-${transaction.id}`}>
                      {transaction.description}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString('nl-NL') : 'Onbekend'}
                    </p>
                  </div>
                  <span 
                    className={`text-xs font-medium ${
                      transaction.points > 0 ? 'text-accent' : 'text-destructive'
                    }`}
                    data-testid={`text-points-${transaction.id}`}
                  >
                    {transaction.points > 0 ? '+' : ''}{transaction.points} punten
                  </span>
                </div>
              </Card>
            ))}
            
            {!transactions?.length && (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">Nog geen activiteit</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan een QR-code om te beginnen!
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Action Detail Popup */}
      <Dialog open={isActionDetailOpen} onOpenChange={setIsActionDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold mb-2">
              {selectedAction?.title}
            </DialogTitle>
            <p className="text-sm text-gray-600 mb-4">
              Partner: {selectedAction?.partner?.name || 'Partner naam niet beschikbaar'}
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default">
                {selectedAction?.pointsCost} punten
              </Badge>
              {selectedAction?.maxRedemptions && (
                <Badge variant="outline">
                  {selectedAction.currentRedemptions}/{selectedAction.maxRedemptions} geclaimd
                </Badge>
              )}
            </div>

            {/* Partner Logo */}
            {selectedAction?.partner?.logoUrl && (
              <div>
                <img 
                  src={selectedAction.partner.logoUrl.startsWith('/partner-logos/') 
                    ? `${window.location.origin}${selectedAction.partner.logoUrl}` 
                    : selectedAction.partner.logoUrl
                  }
                  alt="Partner logo" 
                  className="w-24 h-24 object-cover rounded-lg"
                  data-testid="img-partner-popup"
                />
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">Beschrijving</h4>
              <div className="text-sm text-gray-700 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selectedAction?.description || 'Geen beschrijving beschikbaar'}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-xs text-gray-500">
                Beschikbaar tot: {selectedAction?.pointsCost ? `${selectedAction.pointsCost} punten vereist` : 'Onbeperkt'}
              </div>
              
              <Button 
                onClick={closeActionDetail}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-claim-action-popup"
              >
                Claim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation currentPage="dashboard" />
    </div>
  );
}
