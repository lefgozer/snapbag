import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Zap } from "lucide-react";
import QRScannerComponent from "@/components/qr-scanner-component";

export default function QRScanner() {
  const [flashEnabled, setFlashEnabled] = useState(false);

  return (
    <div className="relative h-screen bg-black">
      {/* Camera View Simulation */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-700 flex items-center justify-center">
        
        {/* QR Scanner Component */}
        <QRScannerComponent />
        
        {/* Instructions */}
        <div className="absolute bottom-32 left-0 right-0 px-8 text-center">
          <h2 className="text-white text-xl font-semibold mb-2">
            Scan je Snapbag QR-code
          </h2>
          <p className="text-white/80 text-sm">
            Plaats de QR-code binnen het kader om punten te verdienen
          </p>
        </div>
        
        {/* Controls */}
        <div className="absolute top-8 left-0 right-0 flex justify-between px-4">
          <Link href="/">
            <Button 
              variant="ghost"
              size="sm"
              className="w-10 h-10 bg-white/20 rounded-full p-0"
              data-testid="button-close-scanner"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            className={`w-10 h-10 rounded-full p-0 ${
              flashEnabled ? 'bg-secondary' : 'bg-white/20'
            }`}
            onClick={() => setFlashEnabled(!flashEnabled)}
            data-testid="button-toggle-flash"
          >
            <Zap className={`w-5 h-5 ${flashEnabled ? 'text-white' : 'text-white'}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
