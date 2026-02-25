import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import WheelComponent from "@/components/wheel-component";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export default function WheelFortune() {
  const { user } = useAuth();
  
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-accent p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/">
          <Button 
            variant="ghost"
            size="sm"
            className="w-10 h-10 bg-white/20 rounded-full p-0"
            data-testid="button-close-wheel"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
        </Link>
        <h2 className="text-white text-xl font-bold">Gelukswiel</h2>
        <div className="w-10"></div>
      </div>
      
      <div className="flex flex-col items-center">
        {/* Wheel Component */}
        <WheelComponent spinsAvailable={currentUser?.spinsAvailable || 0} />
      </div>
    </div>
  );
}
