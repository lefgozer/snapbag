import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import QRScanner from "@/pages/qr-scanner";
import WheelFortune from "@/pages/wheel-fortune";
import Verification from "@/pages/verification";
import Rewards from "@/pages/rewards";
import History from "@/pages/history";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin.tsx";
import PartnerPortal from "@/pages/partner-portal";
import Vouchers from "@/pages/vouchers";
import VoucherDetail from "@/pages/voucher-detail";

// Customer App Portal (default - current app functionality)
function CustomerApp() {
  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen relative overflow-hidden">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/qr-scanner" component={QRScanner} />
        <Route path="/wheel" component={WheelFortune} />
        <Route path="/verification" component={Verification} />
        <Route path="/rewards" component={Rewards} />
        <Route path="/vouchers" component={Vouchers} />
        <Route path="/voucher/:id" component={VoucherDetail} />
        <Route path="/history" component={History} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

// Admin Portal (full-width web layout)
function AdminPortal() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/admin" component={Admin} />
        <Route path="/admin/:rest*" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

// Partner Portal (full-width web layout) 
function PartnerPortalApp() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/partner" component={PartnerPortal} />
        <Route path="/partner/:rest*" component={PartnerPortal} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Portal detection based on route
  if (location.startsWith('/admin')) {
    return <AdminPortal />;
  }
  
  if (location.startsWith('/partner')) {
    return <PartnerPortalApp />;
  }
  
  // Default: Customer app (mobile-focused)
  return <CustomerApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
