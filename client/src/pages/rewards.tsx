import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Gift, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import BottomNavigation from "@/components/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface VoucherResponse {
  success: boolean;
  vouchers: Array<{
    id: string;
    userId: string;
    wheelPrizeId: string;
    partnerId: string;
    voucherCode: string;
    status: string;
    expiresAt: string;
    claimedAt: string | null;
    redeemedAt: string | null;
    redeemedBy: string | null;
    createdAt: string;
    prizeTitle: string;
    prizeDescription: string;
    prizeConditions: string;
    partnerName: string;
    partnerLogoUrl: string | null;
  }>;
  unclaimedCount: number;
}

export default function Rewards() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const { data: vouchersData, isLoading } = useQuery<VoucherResponse>({
    queryKey: ["/api/vouchers"],
    retry: false,
  });

  // Only show pending_claim vouchers (unclaimed rewards)
  const unclaimedVouchers = vouchersData?.vouchers.filter(v => v.status === 'pending_claim') || [];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
        <Link href="/">
          <Button 
            variant="ghost"
            size="sm"
            className="w-10 h-10 bg-white/20 rounded-full p-0"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
        </Link>
        <h2 className="text-xl font-bold">Te Claimen Prijzen</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-4">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Gift className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Claim je gewonnen prijzen!
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Hier zie je alle prijzen die je hebt gewonnen met het rad van fortuin. 
                Klik op een prijs om deze te claimen en de QR code te activeren.
              </p>
            </div>
          </div>
        </div>

        {/* Link to Vouchers History */}
        <Link href="/vouchers">
          <Button 
            variant="outline" 
            className="w-full mb-6"
            data-testid="link-vouchers-history"
          >
            Bekijk alle vouchers (geclaimd & gebruikt)
          </Button>
        </Link>

        {/* Unclaimed Rewards List */}
        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Prijzen laden...</p>
            </div>
          )}

          {unclaimedVouchers.map((voucher) => (
            <Card 
              key={voucher.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/voucher/${voucher.id}`)}
              data-testid={`card-unclaimed-voucher-${voucher.id}`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground mb-1">
                      {voucher.prizeTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {voucher.partnerName}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                    Te claimen
                  </Badge>
                </div>
                
                {voucher.prizeDescription && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {voucher.prizeDescription}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    Geldig tot {new Date(voucher.expiresAt).toLocaleDateString('nl-NL')}
                  </span>
                  <span className="mx-1">•</span>
                  <span>
                    Gewonnen {formatDistanceToNow(new Date(voucher.createdAt), { addSuffix: true, locale: nl })}
                  </span>
                </div>

                <Button 
                  className="w-full mt-4"
                  data-testid={`button-claim-${voucher.id}`}
                >
                  Claim nu
                </Button>
              </div>
            </Card>
          ))}

          {!isLoading && unclaimedVouchers.length === 0 && (
            <div className="text-center py-8">
              <Gift className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <p className="font-semibold text-foreground mb-1">
                Geen prijzen te claimen
              </p>
              <p className="text-sm text-muted-foreground">
                Draai aan het rad van fortuin om prijzen te winnen!
              </p>
              <Link href="/wheel">
                <Button className="mt-4" data-testid="button-go-to-wheel">
                  Ga naar Rad van Fortuin
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="rewards" />
    </div>
  );
}
