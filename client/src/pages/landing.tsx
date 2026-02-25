import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Star, Gift } from "lucide-react";
import snapbagLogo from "@assets/logotest_1756907968662.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 flex items-center justify-center">
            <img 
              src={snapbagLogo} 
              alt="Snapbag Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Welkom bij Snapbag</CardTitle>
            <CardDescription className="text-lg">
              Verdien punten met elke scan
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-medium">Scan QR-codes</h3>
                <p className="text-sm text-muted-foreground">Verdien punten bij elke scan</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <h3 className="font-medium">Verzamel XP</h3>
                <p className="text-sm text-muted-foreground">Bouw je status op</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Claim rewards</h3>
                <p className="text-sm text-muted-foreground">Wissel punten in voor kortingen</p>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full snapbag-button-primary" 
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Inloggen & Beginnen
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Door in te loggen ga je akkoord met onze voorwaarden
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
