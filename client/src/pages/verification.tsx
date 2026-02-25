import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Camera, Truck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Verification() {
  const [, setLocation] = useLocation();
  const [trackingNumber, setTrackingNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get QR scan ID from URL params (in real app, would be passed via route state)
  const urlParams = new URLSearchParams(window.location.search);
  const qrScanId = urlParams.get('qrScanId');

  const verificationMutation = useMutation({
    mutationFn: async (data: { trackingNumber?: string; receiptImageUrl?: string; qrScanId?: string }) => {
      const response = await apiRequest("POST", "/api/verification/create", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verificatie geslaagd!",
        description: data.message,
      });
      
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      if (data.verified) {
        setTimeout(() => setLocation("/"), 2000);
      }
    },
    onError: (error) => {
      toast({
        title: "Verificatie mislukt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTrackingSubmit = () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Tracking nummer vereist",
        description: "Voer een geldig tracking nummer in",
        variant: "destructive",
      });
      return;
    }

    verificationMutation.mutate({
      trackingNumber: trackingNumber.trim(),
      qrScanId: qrScanId || undefined,
    });
  };

  const handlePhotoUpload = () => {
    // For demo purposes, simulate photo upload
    toast({
      title: "Foto uploaden",
      description: "Foto upload functionaliteit wordt geïmplementeerd",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/">
          <Button 
            variant="ghost"
            size="sm"
            className="w-10 h-10 bg-muted rounded-full p-0"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
        </Link>
        <h2 className="text-xl font-bold">Verificatie</h2>
        <div className="w-10"></div>
      </div>
      
      {/* Success Message */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">QR-code succesvol gescand!</h3>
              <p className="text-muted-foreground">+5 SP en +5 LXP toegevoegd</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Verification Options */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Verdien extra punten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Upload een foto van je verzendlabel of voer trackinggegevens in om +50 SP en +60 LXP te verdienen.
            </p>
            
            {/* Tracking Number Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tracking Nummer</label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Voer tracking nummer in"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  data-testid="input-tracking-number"
                />
                <Button 
                  onClick={handleTrackingSubmit}
                  disabled={verificationMutation.isPending}
                  data-testid="button-submit-tracking"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  {verificationMutation.isPending ? "Verwerken..." : "Bevestigen"}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="flex-1 border-t border-border"></div>
              <div className="px-3 text-sm text-muted-foreground">of</div>
              <div className="flex-1 border-t border-border"></div>
            </div>
            
            {/* Photo Upload */}
            <Button 
              className="w-full"
              variant="outline"
              onClick={handlePhotoUpload}
              data-testid="button-upload-photo"
            >
              <Camera className="w-4 h-4 mr-2" />
              Foto van kassabon/label uploaden
            </Button>
          </CardContent>
        </Card>
        
        {/* Later option */}
        <Link href="/">
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground p-4 rounded-lg border border-dashed"
            data-testid="button-skip-verification"
          >
            Later doen
          </Button>
        </Link>
      </div>
    </div>
  );
}
