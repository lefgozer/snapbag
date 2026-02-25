import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, QrCode, TrendingUp, Gift, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import BottomNavigation from "@/components/navigation";
import type { Transaction, Verification } from "@shared/schema";

export default function History() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    retry: false,
  });

  const { data: verifications } = useQuery<Verification[]>({
    queryKey: ["/api/verifications"],
    retry: false,
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'qr_scan':
        return <QrCode className="w-4 h-4 text-accent" />;
      case 'verification':
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case 'wheel_spin':
        return <Gift className="w-4 h-4 text-secondary" />;
      case 'reward_claim':
        return <Star className="w-4 h-4 text-destructive" />;
      default:
        return <QrCode className="w-4 h-4 text-muted-foreground" />;
    }
  };

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
        <h2 className="text-xl font-bold">Historie</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-4">
        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-6">
          <Button variant="default" size="sm">
            Alle transacties
          </Button>
          <Button variant="outline" size="sm">
            Scans
          </Button>
          <Button variant="outline" size="sm">
            Rewards
          </Button>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Historie laden...</p>
            </div>
          )}

          {transactions?.map((transaction) => (
            <Card key={transaction.id} className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  {getTransactionIcon(transaction.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-transaction-${transaction.id}`}>
                    {transaction.description}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString('nl-NL', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : 'Onbekend'}
                  </p>
                  {transaction.metadata && 
                   typeof transaction.metadata === 'object' && 
                   'rewardCode' in transaction.metadata && 
                   (transaction.metadata as any).rewardCode && (
                    <p className="text-xs text-primary font-mono">
                      Code: {String((transaction.metadata as any).rewardCode)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span 
                    className={`font-semibold ${
                      transaction.points > 0 ? 'text-accent' : 'text-destructive'
                    }`}
                    data-testid={`text-points-${transaction.id}`}
                  >
                    {transaction.points > 0 ? '+' : ''}{transaction.points} punten
                  </span>
                  {transaction.lifetimeXP > 0 && (
                    <p className="text-xs text-muted-foreground">
                      +{transaction.lifetimeXP} LXP
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {!isLoading && !transactions?.length && (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nog geen activiteit</p>
              <p className="text-sm text-muted-foreground mt-1">
                Scan een QR-code om te beginnen!
              </p>
              <Link href="/qr-scanner">
                <Button className="mt-4" data-testid="button-start-scanning">
                  Eerste scan maken
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation currentPage="history" />
    </div>
  );
}
