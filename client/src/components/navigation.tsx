import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Gift, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface BottomNavigationProps {
  currentPage: string;
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [location] = useLocation();

  // Fetch unclaimed vouchers count for badge (uses default queryFn with credentials)
  const { data: vouchersData } = useQuery<{ success: boolean; unclaimedCount: number; vouchers: any[] }>({
    queryKey: ['/api/vouchers'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unclaimedCount = vouchersData?.unclaimedCount || 0;

  const navItems = [
    { id: "dashboard", path: "/", icon: Home, label: "Home" },
    { id: "rewards", path: "/rewards", icon: Gift, label: "Rewards", badge: unclaimedCount },
    { id: "history", path: "/history", icon: History, label: "Historie" },
    { id: "profile", path: "/profile", icon: User, label: "Profiel" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm bg-white border-t border-border">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const isActive = currentPage === item.id || location === item.path;
          return (
            <Link key={item.id} href={item.path}>
              <Button
                variant="ghost"
                className={cn(
                  "h-full w-full flex flex-col items-center justify-center space-y-1 rounded-none relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                data-testid={`nav-${item.id}`}
              >
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-2 right-1/4 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="badge-unclaimed-vouchers">
                    {item.badge}
                  </span>
                )}
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
