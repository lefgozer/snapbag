import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Gift, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QRCode from "qrcode";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Voucher {
  id: string;
  voucherCode: string;
  status: string;
  expiresAt: string;
  claimedAt: string | null;
  redeemedAt: string | null;
  createdAt: string;
  prizeTitle: string;
  prizeDescription: string;
  prizeConditions: string;
  partnerName: string;
  partnerLogoUrl: string | null;
}

export default function VoucherDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Fetch all vouchers and find the specific one
  const { data: vouchersData, isLoading } = useQuery<{ vouchers: Voucher[] }>({
    queryKey: ["/api/vouchers"],
    retry: false,
  });

  const voucher = vouchersData?.vouchers.find(v => v.id === id);

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/vouchers/${id}/claim`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      toast({
        title: "Voucher geclaimd!",
        description: "Je hebt nu 10 minuten om de QR code te laten scannen.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij claimen",
        description: error.message || "Er ging iets mis bij het claimen van de voucher",
        variant: "destructive",
      });
    },
  });

  // Generate QR code when voucher is claimed
  useEffect(() => {
    if (voucher && voucher.status === 'claimed' && voucher.voucherCode) {
      QRCode.toDataURL(voucher.voucherCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('QR code generation error:', err));
    }
  }, [voucher]);

  // Timer countdown for claimed vouchers
  useEffect(() => {
    if (voucher && voucher.status === 'claimed' && voucher.claimedAt) {
      const updateTimer = () => {
        const claimedTime = new Date(voucher.claimedAt!).getTime();
        const now = new Date().getTime();
        const tenMinutes = 10 * 60 * 1000; // 10 minutes in ms
        const elapsed = now - claimedTime;
        const remaining = Math.max(0, Math.floor((tenMinutes - elapsed) / 1000));
        
        setTimeRemaining(remaining);

        // Auto-refresh when timer expires
        if (remaining === 0) {
          queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [voucher]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Voucher laden...</p>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Voucher niet gevonden</h2>
          <p className="text-muted-foreground mb-4">
            Deze voucher bestaat niet of is verwijderd.
          </p>
          <Link href="/rewards">
            <Button className="w-full">Terug naar Prijzen</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
        <Link href="/rewards">
          <Button 
            variant="ghost"
            size="sm"
            className="w-10 h-10 bg-white/20 rounded-full p-0"
            data-testid="button-back-rewards"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
        </Link>
        <h2 className="text-xl font-bold">Voucher Details</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Prize Header */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {voucher.prizeTitle}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {voucher.partnerName}
                </p>
              </div>
              <Badge 
                variant={
                  voucher.status === 'pending_claim' ? 'default' :
                  voucher.status === 'claimed' ? 'secondary' :
                  voucher.status === 'used' ? 'outline' : 'destructive'
                }
                className={
                  voucher.status === 'pending_claim' ? 'bg-amber-500 hover:bg-amber-600' :
                  voucher.status === 'claimed' ? 'bg-green-500 hover:bg-green-600' : ''
                }
              >
                {voucher.status === 'pending_claim' ? 'Te claimen' :
                 voucher.status === 'claimed' ? 'Geclaimd' :
                 voucher.status === 'used' ? 'Gebruikt' : 'Verlopen'}
              </Badge>
            </div>

            {voucher.prizeDescription && (
              <p className="text-muted-foreground mb-4">
                {voucher.prizeDescription}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gift className="w-4 h-4" />
              <span>
                Geldig tot {new Date(voucher.expiresAt).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </Card>

        {/* Pending Claim: Show conditions and claim button */}
        {voucher.status === 'pending_claim' && (
          <>
            {/* Conditions */}
            {voucher.prizeConditions && (
              <Card className="p-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Voorwaarden
                </h3>
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {voucher.prizeConditions}
                </div>
              </Card>
            )}

            {/* Important Notice */}
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Let op: 10 minuten timer
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Na het claimen krijg je 10 minuten om de QR code te laten scannen bij de partner. 
                    Zorg dat je bij de partner bent voordat je op 'Claim nu' klikt!
                  </p>
                </div>
              </div>
            </Card>

            {/* Claim Button */}
            <Button 
              className="w-full h-12 text-lg"
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              data-testid="button-claim-voucher"
            >
              {claimMutation.isPending ? "Claimen..." : "Claim nu"}
            </Button>
          </>
        )}

        {/* Claimed: Show QR code with timer */}
        {voucher.status === 'claimed' && (
          <>
            {/* Timer Warning */}
            <Card className={`p-4 ${timeRemaining < 120 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className={`w-6 h-6 ${timeRemaining < 120 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                  <div>
                    <p className={`font-semibold ${timeRemaining < 120 ? 'text-red-900 dark:text-red-100' : 'text-blue-900 dark:text-blue-100'}`}>
                      {timeRemaining < 120 ? 'Haast je!' : 'Tijd resterend'}
                    </p>
                    <p className={`text-sm ${timeRemaining < 120 ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
                      QR code verloopt over {formatTime(timeRemaining)}
                    </p>
                  </div>
                </div>
                <div className={`text-3xl font-bold ${timeRemaining < 120 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </Card>

            {/* QR Code */}
            {timeRemaining > 0 ? (
              <Card className="p-8">
                <div className="text-center">
                  <h3 className="font-bold text-xl mb-4">Toon deze QR code aan de partner</h3>
                  {qrCodeDataUrl && (
                    <div className="bg-white p-6 rounded-lg inline-block">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Voucher QR Code" 
                        className="w-full max-w-[300px] mx-auto"
                        data-testid="img-qr-code"
                      />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-4">
                    Code: {voucher.voucherCode}
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="p-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="font-bold text-xl text-red-900 dark:text-red-100 mb-2">
                    QR Code Verlopen
                  </h3>
                  <p className="text-red-700 dark:text-red-300">
                    De 10 minuten timer is verlopen. Deze voucher kan niet meer worden gebruikt.
                  </p>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Used: Show success */}
        {voucher.status === 'used' && (
          <Card className="p-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 dark:text-green-400 mb-4" />
              <h3 className="font-bold text-xl text-green-900 dark:text-green-100 mb-2">
                Voucher Ingewisseld
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Deze voucher is succesvol gebruikt op {voucher.redeemedAt ? new Date(voucher.redeemedAt).toLocaleDateString('nl-NL') : 'onbekende datum'}
              </p>
            </div>
          </Card>
        )}

        {/* Expired */}
        {voucher.status === 'expired' && (
          <Card className="p-8 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-gray-600 dark:text-gray-400 mb-4" />
              <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-2">
                Voucher Verlopen
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Deze voucher kan niet meer worden gebruikt.
              </p>
            </div>
          </Card>
        )}

        {/* Back Button */}
        <Link href="/rewards">
          <Button 
            variant="outline" 
            className="w-full"
            data-testid="button-back-to-rewards"
          >
            Terug naar Prijzen
          </Button>
        </Link>
      </div>
    </div>
  );
}
