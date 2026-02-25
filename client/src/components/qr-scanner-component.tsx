import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QrScanner from "qr-scanner";

export default function QRScannerComponent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  const scanMutation = useMutation({
    mutationFn: async (data: { bagId: string; hmacSignature: string; deviceId: string }) => {
      const response = await apiRequest("POST", "/api/qr/scan", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Stop scanner when successful
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
      }
      
      toast({
        title: "QR-code gescand!",
        description: data.message,
      });
      
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      // Navigate to verification page
      setLocation(`/verification?qrScanId=${data.qrScanId}`);
    },
    onError: (error) => {
      toast({
        title: "Scan mislukt",
        description: error.message,
        variant: "destructive",
      });
      setIsScanning(false);
    },
  });

  // Start camera and QR scanning when component mounts
  useEffect(() => {
    const startScanner = async () => {
      if (!videoRef.current) return;

      try {
        setIsScanning(true);
        setCameraError(null);

        // Initialize QR scanner
        const qrScanner = new QrScanner(
          videoRef.current,
          (result) => {
            // Parse QR code result
            try {
              const qrData = JSON.parse(result.data);
              const { bagId, hmacSignature } = qrData;
              
              if (!bagId || !hmacSignature) {
                throw new Error("Ongeldige QR-code format");
              }
              
              const deviceId = localStorage.getItem('deviceId') || `device_${Date.now()}`;
              if (!localStorage.getItem('deviceId')) {
                localStorage.setItem('deviceId', deviceId);
              }
              
              scanMutation.mutate({
                bagId,
                hmacSignature,
                deviceId,
              });
            } catch (error) {
              toast({
                title: "Ongeldige QR-code",
                description: "Deze QR-code is niet geldig voor Snapbag",
                variant: "destructive",
              });
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        qrScannerRef.current = qrScanner;
        await qrScanner.start();
        setIsScanning(true);
        
      } catch (error) {
        console.error("Camera error:", error);
        setCameraError("Kan camera niet openen. Controleer je browser-instellingen.");
        setIsScanning(false);
      }
    };

    startScanner();

    // Cleanup function
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, [scanMutation, toast]);


  if (cameraError) {
    return (
      <div className="relative">
        <div className="w-64 h-64 border-4 border-red-500 rounded-xl relative overflow-hidden bg-black/50 flex items-center justify-center">
          <div className="text-white text-center p-4">
            <p className="text-sm mb-2">Camera niet beschikbaar</p>
            <p className="text-xs text-white/70">{cameraError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="w-64 h-64 border-4 border-white rounded-xl relative overflow-hidden">
        {/* Camera Video Stream */}
        <video 
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          data-testid="camera-video-stream"
        />
        
        {/* Corner indicators */}
        <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-secondary"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-secondary"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-secondary"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-secondary"></div>
        
        {/* Scanning line animation */}
        <div className="qr-scanner-overlay absolute inset-0"></div>
        
        {/* Scanning indicator */}
        {scanMutation.isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm">Verwerken...</p>
            </div>
          </div>
        )}
        
        {/* Camera loading state */}
        {!isScanning && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-white text-center">
              <div className="animate-pulse w-8 h-8 bg-white rounded-full mx-auto mb-2"></div>
              <p className="text-sm">Camera opstarten...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
