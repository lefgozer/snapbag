import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Star, Trophy, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import BottomNavigation from "@/components/navigation";
import type { User } from "@shared/schema";
import profilePhoto from "@assets/assets_task_01k2t2q8hdey2rrjb23xa0429n_1755369511_img_0_1756914777969.webp";

export default function Profile() {
  const { user } = useAuth();
  
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getStatusName = (level: number) => {
    if (level >= 10) return "Snapbag Master";
    if (level >= 7) return "Expert Collector";
    if (level >= 5) return "Advanced Saver";
    if (level >= 3) return "Points Hunter";
    return "Beginner";
  };

  const getNextLevelXP = (currentXP: number) => {
    const currentLevel = Math.floor(currentXP / 500) + 1;
    return currentLevel * 500;
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
        <h2 className="text-xl font-bold">Profiel</h2>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* User Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                <img 
                  src={profilePhoto} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                  data-testid="img-user-avatar"
                />
              </div>
              <div>
                <h3 className="text-lg font-bold" data-testid="text-user-name">
                  {currentUser?.firstName && currentUser?.lastName 
                    ? `${currentUser.firstName} ${currentUser.lastName}`
                    : currentUser?.email || 'Gebruiker'
                  }
                </h3>
                <p className="text-muted-foreground" data-testid="text-user-email">
                  {currentUser?.email}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Trophy className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-medium">
                    Level {currentUser?.level || 1} - {getStatusName(currentUser?.level || 1)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Punten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-secondary" />
                <span className="text-2xl font-bold" data-testid="text-season-points">
                  {currentUser?.points || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">punten beschikbaar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Lifetime XP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold" data-testid="text-lifetime-xp">
                  {currentUser?.lifetimeXP || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {getNextLevelXP(currentUser?.lifetimeXP || 0) - (currentUser?.lifetimeXP || 0)} tot level {(currentUser?.level || 1) + 1}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress to Next Level */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Level Voortgang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Level {currentUser?.level || 1}</span>
                <span>Level {(currentUser?.level || 1) + 1}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, ((currentUser?.lifetimeXP || 0) % 500) / 500 * 100)}%`
                  }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {((currentUser?.lifetimeXP || 0) % 500)} / 500 XP
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Created */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Lid sinds</p>
                <p className="text-sm text-muted-foreground">
                  {currentUser?.createdAt 
                    ? new Date(currentUser.createdAt).toLocaleDateString('nl-NL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Onbekend'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={handleLogout}
              variant="destructive"
              className="w-full"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Uitloggen
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation currentPage="profile" />
    </div>
  );
}