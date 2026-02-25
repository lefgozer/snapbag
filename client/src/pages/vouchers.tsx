import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Gift, Calendar, Store, CheckCircle2, Clock, XCircle } from "lucide-react";
import QRCode from "qrcode";

export default function VouchersPage() {
  const [activeTab, setActiveTab] = useState("all");

  // Fetch user vouchers (uses default queryFn with credentials)
  const { data: vouchersData, isLoading } = useQuery<{ 
    success: boolean; 
    vouchers: any[];
    newCount: number;
  }>({
    queryKey: ['/api', 'vouchers'],
  });

  const vouchers = vouchersData?.vouchers || [];

  // Filter vouchers based on active tab
  const filteredVouchers = vouchers.filter((v: any) => {
    if (activeTab === "all") return true;
    if (activeTab === "new") return v.status === "new";
    if (activeTab === "active") return v.status === "viewed";
    if (activeTab === "used") return v.status === "used";
    if (activeTab === "expired") return v.status === "expired";
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-white">
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto" />
            <p className="mt-4">Vouchers laden...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-2">Mijn Vouchers</h1>
          <p className="text-white/80">Jouw gewonnen prijzen en kortingen</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{vouchers.length}</div>
              <div className="text-xs text-muted-foreground">Totaal</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {vouchers.filter((v: any) => v.status === "new").length}
              </div>
              <div className="text-xs text-muted-foreground">Nieuw</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {vouchers.filter((v: any) => v.status === "viewed").length}
              </div>
              <div className="text-xs text-muted-foreground">Actief</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-400">
                {vouchers.filter((v: any) => v.status === "used").length}
              </div>
              <div className="text-xs text-muted-foreground">Gebruikt</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" data-testid="tab-all">Alle</TabsTrigger>
            <TabsTrigger value="new" data-testid="tab-new">
              Nieuw {vouchersData?.newCount ? `(${vouchersData.newCount})` : ''}
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active">Actief</TabsTrigger>
            <TabsTrigger value="used" data-testid="tab-used">Gebruikt</TabsTrigger>
            <TabsTrigger value="expired" data-testid="tab-expired">Verlopen</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-6">
            {filteredVouchers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Geen vouchers in deze categorie</p>
                </CardContent>
              </Card>
            ) : (
              filteredVouchers.map((voucher) => (
                <VoucherCard key={voucher.id} voucher={voucher} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function VoucherCard({ voucher }: { voucher: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && voucher.voucherCode) {
      QRCode.toCanvas(
        canvasRef.current,
        voucher.voucherCode,
        {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) console.error('QR code error:', error);
        }
      );
    }
  }, [voucher.voucherCode]);

  const isExpired = new Date(voucher.expiresAt) < new Date();
  const isUsed = voucher.status === "used";

  const getStatusBadge = () => {
    if (isExpired) return <Badge variant="secondary" className="bg-gray-400"><XCircle className="w-3 h-3 mr-1" />Verlopen</Badge>;
    if (isUsed) return <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" />Gebruikt</Badge>;
    if (voucher.status === "new") return <Badge className="bg-green-500"><Gift className="w-3 h-3 mr-1" />Nieuw!</Badge>;
    return <Badge variant="outline" className="border-blue-500 text-blue-500"><Clock className="w-3 h-3 mr-1" />Actief</Badge>;
  };

  return (
    <Card className={`${isExpired || isUsed ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
            </div>
            <CardTitle className="text-xl">{voucher.prizeTitle}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Store className="w-4 h-4" />
              {voucher.partnerName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground">{voucher.description}</p>

        {/* QR Code */}
        {!isExpired && !isUsed && (
          <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 text-center">
            <canvas ref={canvasRef} className="mx-auto" />
            <p className="text-xs text-gray-500 mt-2 font-mono">{voucher.voucherCode}</p>
            <p className="text-xs text-gray-600 mt-1">Toon deze QR-code bij de partner</p>
          </div>
        )}

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Geldig tot:
            </span>
            <span className="font-medium">
              {new Date(voucher.expiresAt).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>

          {voucher.redeemedAt && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Gebruikt op:</span>
              <span className="font-medium">
                {new Date(voucher.redeemedAt).toLocaleDateString('nl-NL')}
              </span>
            </div>
          )}
        </div>

        {/* Conditions */}
        {voucher.conditions && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 font-medium mb-1">Voorwaarden:</p>
            <p className="text-xs text-gray-500">{voucher.conditions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
