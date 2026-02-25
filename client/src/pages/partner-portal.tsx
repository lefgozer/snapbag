import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogIn, Building2, Plus, Edit, Eye, BarChart3, Menu, Upload, Gift, Percent, FileText, QrCode, Users, MousePointer, TrendingUp, MapPin, Clock } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from '@uppy/core';

export default function PartnerPortal() {
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [isActionDetailOpen, setIsActionDetailOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [verifiedVoucher, setVerifiedVoucher] = useState<any>(null);
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    pointsReward: 50,
    validUntil: '',
    status: 'draft' as 'draft' | 'published',
    imageUrl: ''
  });

  const [discountCodeForm, setDiscountCodeForm] = useState({
    batchName: '',
    actionId: '',
    shopType: 'shopify',
    redirectUrl: '',
    validUntil: '',
    codes: ''
  });

  // Reset form when switching between new and edit mode
  const resetActionForm = () => {
    setActionForm({
      title: '',
      description: '',
      pointsReward: 50,
      validUntil: '',
      status: 'draft' as 'draft' | 'published',
      imageUrl: ''
    });
    setEditingAction(null);
  };

  // Open action detail popup
  const openActionDetail = (action: any) => {
    setSelectedAction(action);
    setIsActionDetailOpen(true);
  };

  // Close action detail popup
  const closeActionDetail = () => {
    setSelectedAction(null);
    setIsActionDetailOpen(false);
  };

  // Fill form with action data for editing
  const fillActionForm = (action: any) => {
    setActionForm({
      title: action.title || '',
      description: action.description || '',
      imageUrl: action.imageUrl || '',
      pointsReward: parseInt(action.discountValue?.replace(' punten', '')) || 50,
      validUntil: action.validUntil ? action.validUntil.split('T')[0] : '',
      status: action.isPublished ? 'published' : 'draft'
    });
    setEditingAction(action);
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/partner/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      setIsLoggedIn(true);
      setPartnerId(data.partner.id);
      toast({
        title: "Ingelogd",
        description: `Welkom terug, ${data.partner.name}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch partner profile
  const { data: partnerProfile } = useQuery<{
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    logoUrl: string | null;
    description: string | null;
    category: string;
    website: string | null;
    phone: string | null;
    address: string | null;
    isActive: boolean;
    createdAt: string;
  }>({
    queryKey: ['/api/partner/profile'],
    enabled: isLoggedIn,
  });

  // Fetch partner actions
  const { data: partnerActions } = useQuery<Array<{
    id: string;
    title: string;
    description: string;
    discountValue: string;
    validUntil: string | null;
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
  }>>({
    queryKey: ['/api/partner/actions'],
    enabled: isLoggedIn,
  });

  // Fetch discount codes
  const { data: discountCodes } = useQuery<Array<{
    id: string;
    partnerId: string;
    actionId: string | null;
    code: string;
    batchName: string | null;
    status: 'available' | 'claimed' | 'used' | 'expired';
    shopType: string | null;
    redirectUrl: string | null;
    validUntil: string | null;
    createdAt: string;
  }>>({
    queryKey: ['/api/partner/discount-codes'],
    enabled: isLoggedIn,
  });

  // Fetch partner analytics
  const { data: partnerAnalytics } = useQuery<{
    totalScans: number;
    uniqueUsers: number;
    clickThroughRate: number;
    conversionRate: number;
    scansToday: number;
    scansThisWeek: number;
  }>({
    queryKey: ['/api/partner/analytics'],
    enabled: isLoggedIn,
  });

  // Fetch scan locations
  const { data: partnerScanLocations } = useQuery<Array<{
    location: string;
    scans: number;
    ctr: number;
  }>>({
    queryKey: ['/api/partner/scan-locations'],
    enabled: isLoggedIn,
  });

  // Fetch scan times
  const { data: partnerScanTimes } = useQuery<Array<{
    hour: string;
    scans: number;
  }>>({
    queryKey: ['/api/partner/scan-times'],
    enabled: isLoggedIn,
  });

  // Create action mutation
  const createActionMutation = useMutation({
    mutationFn: async (actionData: typeof actionForm) => {
      const response = await apiRequest("POST", "/api/partner/actions", actionData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Actie aangemaakt",
        description: `"${data.action.title}" is succesvol aangemaakt`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/actions'] });
      resetActionForm();
      setActiveTab('actions');
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij aanmaken actie",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update action mutation
  const updateActionMutation = useMutation({
    mutationFn: async ({ id, actionData }: { id: string; actionData: typeof actionForm }) => {
      const response = await apiRequest("PUT", `/api/partner/actions/${id}`, actionData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Actie bijgewerkt",
        description: `"${data.action.title}" is succesvol bijgewerkt`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/actions'] });
      resetActionForm();
      setActiveTab('actions');
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij bijwerken actie",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logo upload mutation
  const logoUploadMutation = useMutation({
    mutationFn: async (logoData: { uploadURL: string }) => {
      const response = await apiRequest("PUT", "/api/partner/logo", { logoURL: logoData.uploadURL });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Logo geüpload",
        description: "Je bedrijfslogo is succesvol geüpload",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij uploaden logo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGetLogoUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/partner/logo/upload", {});
    const data = await response.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const handleLogoUploadComplete = (result: { successful: Array<{ uploadURL: string }> }) => {
    if (result.successful && result.successful[0]) {
      logoUploadMutation.mutate({ uploadURL: result.successful[0].uploadURL });
    }
  };

  // Action Image Upload handlers
  const actionImageUploadMutation = useMutation({
    mutationFn: async (data: { uploadURL: string }) => {
      const response = await apiRequest("PUT", "/api/partner/action-image", {
        imageURL: data.uploadURL
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Afbeelding geüpload",
        description: "De actie afbeelding is succesvol geüpload",
      });
      // Update the form with the image URL
      setActionForm(prev => ({ ...prev, imageUrl: data.imagePath }));
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij uploaden afbeelding",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGetActionImageUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/partner/action-image/upload", {});
    const data = await response.json();
    return { method: "PUT" as const, url: data.uploadURL };
  };

  const handleActionImageUploadComplete = (result: { successful: Array<{ uploadURL: string }> }) => {
    if (result.successful && result.successful[0]) {
      actionImageUploadMutation.mutate({ uploadURL: result.successful[0].uploadURL });
    }
  };

  // Upload discount codes mutation
  const uploadDiscountCodesMutation = useMutation({
    mutationFn: async (discountCodeData: typeof discountCodeForm) => {
      const codes = discountCodeData.codes
        .split('\n')
        .map(code => code.trim())
        .filter(code => code.length > 0);
      
      const response = await apiRequest("POST", "/api/partner/discount-codes/upload", {
        ...discountCodeData,
        codes,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Kortingscodes geüpload",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/discount-codes'] });
      setDiscountCodeForm({
        batchName: '',
        actionId: '',
        shopType: 'shopify',
        redirectUrl: '',
        validUntil: '',
        codes: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij uploaden",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete discount code batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchName: string) => {
      const response = await apiRequest("DELETE", `/api/partner/discount-codes/batch/${batchName}`, {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch verwijderd",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/discount-codes'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify voucher mutation
  const verifyVoucherMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("GET", `/api/partner/verify-voucher/${code}`);
      return response.json();
    },
    onSuccess: (data) => {
      setVerifiedVoucher(data.voucher);
      toast({
        title: data.valid ? "Voucher geldig!" : "Voucher ongeldig",
        description: data.message,
        variant: data.valid ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verificatie fout",
        description: error.message,
        variant: "destructive",
      });
      setVerifiedVoucher(null);
    },
  });

  // Redeem voucher mutation
  const redeemVoucherMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/partner/redeem-voucher", { voucherCode: code });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Voucher ingewisseld!",
        description: data.message,
      });
      setVerifiedVoucher(null);
      setVoucherCode("");
      queryClient.invalidateQueries({ queryKey: ['/api/partner/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Inwisseling fout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch partner voucher stats
  const { data: partnerStats } = useQuery<{
    totalRedeemed: number;
    redeemedToday: number;
    prizeBreakdown: Array<{
      prizeTitle: string;
      count: number;
    }>;
  }>({
    queryKey: ['/api/partner/stats'],
    enabled: isLoggedIn,
  });

  const handleLogin = () => {
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Validatie fout",
        description: "Email en wachtwoord zijn verplicht",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(loginForm);
  };

  const handleCreateAction = () => {
    if (!actionForm.title || !actionForm.description) {
      toast({
        title: "Validatie fout",
        description: "Titel en beschrijving zijn verplicht",
        variant: "destructive",
      });
      return;
    }
    
    if (editingAction) {
      updateActionMutation.mutate({ id: editingAction.id, actionData: actionForm });
    } else {
      createActionMutation.mutate(actionForm);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('nl-NL');
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "scanner", label: "Voucher Scanner", icon: QrCode },
    { id: "actions", label: "Acties", icon: Eye },
    { id: "create", label: "Nieuwe Actie", icon: Plus },
    { id: "discounts", label: "Kortingscodes", icon: Percent },
    { id: "profile", label: "Profiel", icon: Edit },
  ];

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
    setIsMenuOpen(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle>Partner Portal</CardTitle>
            <CardDescription>Log in op je partner account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                placeholder="partner@bedrijf.nl"
                data-testid="input-login-email"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="Je wachtwoord"
                data-testid="input-login-password"
              />
            </div>

            <Button 
              onClick={handleLogin}
              disabled={loginMutation.isPending}
              className="w-full"
              data-testid="button-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {loginMutation.isPending ? 'Inloggen...' : 'Inloggen'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with hamburger menu */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="mr-4" data-testid="menu-toggle">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64">
                  <SheetHeader>
                    <SheetTitle>Partner Menu</SheetTitle>
                    <SheetDescription>
                      Beheer je partner account
                    </SheetDescription>
                  </SheetHeader>
                  <nav className="mt-6">
                    <div className="space-y-2">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Button
                            key={item.id}
                            variant={activeTab === item.id ? "default" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => handleTabChange(item.id)}
                            data-testid={`menu-${item.id}`}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {item.label}
                          </Button>
                        );
                      })}
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
              
              <Building2 className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold">Partner Portal</h1>
                <p className="text-sm text-gray-600">{partnerProfile?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={partnerProfile?.isActive ? "default" : "secondary"}>
                {partnerProfile?.isActive ? "Actief" : "Inactief"}
              </Badge>
              <Button
                variant="outline"
                onClick={() => {
                  setIsLoggedIn(false);
                  setPartnerId(null);
                }}
                data-testid="button-logout"
              >
                Uitloggen
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden">
            {menuItems.map((item) => (
              <TabsTrigger key={item.id} value={item.id} />
            ))}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard Demo - Jouw Metrics</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Dit is hoe jouw dashboard eruit ziet. Alle data wordt automatisch verzameld en geanalyseerd.
              </p>
            </div>

            {/* Analytics Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-emerald-600 text-sm font-medium">+23%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {partnerAnalytics?.totalScans?.toLocaleString() || '0'}
                    </div>
                    <p className="text-sm text-gray-600">Totale QR-scans</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-emerald-600 text-sm font-medium">+18%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {partnerAnalytics?.uniqueUsers?.toLocaleString() || '0'}
                    </div>
                    <p className="text-sm text-gray-600">Unieke bezoekers</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <MousePointer className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-emerald-600 text-sm font-medium">+5%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {partnerAnalytics?.clickThroughRate || 67}%
                    </div>
                    <p className="text-sm text-gray-600">Click-through rate</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-red-600" />
                      </div>
                      <span className="text-red-600 text-sm font-medium">-2%</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {partnerAnalytics?.conversionRate || 12.3}%
                    </div>
                    <p className="text-sm text-gray-600">Conversieratio</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Locations */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Top Locaties</h3>
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  {partnerScanLocations?.map((location, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {location.location.split('\n')[0]}
                        </div>
                        <div className="text-xs text-gray-500">
                          {location.location.split('\n')[1]}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-emerald-600">
                          {location.scans.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          CTR: {location.ctr}%
                        </div>
                      </div>
                    </div>
                  )) || [
                    { location: 'PostNL Albert Cuyp\nAmsterdam', scans: 1247, ctr: 72 },
                    { location: 'DHL Woonmall\nRotterdam', scans: 983, ctr: 68 },
                    { location: 'Pickup Point Utrecht CS\nUtrecht', scans: 856, ctr: 71 },
                    { location: 'Bruna Haarlem\nHaarlem', scans: 742, ctr: 65 },
                    { location: 'Primera Den Haag\nDen Haag', scans: 689, ctr: 63 }
                  ].map((location, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {location.location.split('\n')[0]}
                        </div>
                        <div className="text-xs text-gray-500">
                          {location.location.split('\n')[1]}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-emerald-600">
                          {location.scans.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          CTR: {location.ctr}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Scan Tijdstippen */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Scan Tijdstippen</h3>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  {partnerScanTimes?.map((timeSlot, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-12 text-sm font-medium text-gray-700">
                        {timeSlot.hour}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                        <div 
                          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${(timeSlot.scans / 200) * 100}%` }}
                        />
                      </div>
                      <div className="w-8 text-sm font-semibold text-blue-600">
                        {timeSlot.scans}
                      </div>
                    </div>
                  )) || [
                    { hour: '09:00', scans: 45 },
                    { hour: '12:00', scans: 89 },
                    { hour: '15:00', scans: 123 },
                    { hour: '18:00', scans: 156 },
                    { hour: '21:00', scans: 98 }
                  ].map((timeSlot, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-12 text-sm font-medium text-gray-700">
                        {timeSlot.hour}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                        <div 
                          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${(timeSlot.scans / 200) * 100}%` }}
                        />
                      </div>
                      <div className="w-8 text-sm font-semibold text-blue-600">
                        {timeSlot.scans}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center text-sm text-emerald-700">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <span className="font-medium">Piek uren: 15:00-21:00 zijn de beste tijden voor scans</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-6 w-6" />
                    Voucher Scanner
                  </CardTitle>
                  <CardDescription>
                    Scan of voer de voucher code in om te verifiëren en in te wisselen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Manual Code Input */}
                  <div className="space-y-4">
                    <Label htmlFor="voucher-code">Voucher Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="voucher-code"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                        placeholder="Voer code in (bijv. A1B2C3D4E5F6)"
                        className="font-mono"
                        data-testid="input-voucher-code"
                      />
                      <Button
                        onClick={() => verifyVoucherMutation.mutate(voucherCode)}
                        disabled={!voucherCode || verifyVoucherMutation.isPending}
                        data-testid="button-verify-voucher"
                      >
                        {verifyVoucherMutation.isPending ? "Verifiëren..." : "Verifiëren"}
                      </Button>
                    </div>
                  </div>

                  {/* Verified Voucher Details */}
                  {verifiedVoucher && (
                    <Card className="border-2 border-green-500 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-lg text-green-900">
                          ✓ Voucher Geverifieerd
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Prize</p>
                          <p className="text-base font-semibold">{verifiedVoucher.prizeTitle}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Code</p>
                          <p className="font-mono text-base">{verifiedVoucher.voucherCode}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Status</p>
                          <Badge variant="default">
                            {verifiedVoucher.status === 'claimed' ? 'Geldig' : verifiedVoucher.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Geclaimd op</p>
                          <p className="text-sm">{formatDateTime(verifiedVoucher.claimedAt)}</p>
                        </div>
                        {verifiedVoucher.timeRemaining && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">Tijd resterend</p>
                            <p className="text-sm font-semibold text-orange-600">
                              {verifiedVoucher.timeRemaining}
                            </p>
                          </div>
                        )}
                        <Button
                          onClick={() => redeemVoucherMutation.mutate(verifiedVoucher.voucherCode)}
                          disabled={redeemVoucherMutation.isPending}
                          className="w-full"
                          data-testid="button-redeem-voucher"
                        >
                          {redeemVoucherMutation.isPending ? "Inwisselen..." : "Inwisselen"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Stats Widget */}
                  {partnerStats && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Statistieken</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-600">Totaal Ingewisseld</p>
                            <p className="text-2xl font-bold text-blue-900">
                              {partnerStats.totalRedeemed}
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600">Vandaag</p>
                            <p className="text-2xl font-bold text-green-900">
                              {partnerStats.redeemedToday}
                            </p>
                          </div>
                        </div>

                        {partnerStats.prizeBreakdown && partnerStats.prizeBreakdown.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Per Prize</h4>
                            <div className="space-y-2">
                              {partnerStats.prizeBreakdown.map((prize, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span className="text-sm">{prize.prizeTitle}</span>
                                  <Badge variant="secondary">{prize.count}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mijn Acties</CardTitle>
                <CardDescription>Beheer al je aangemaakte acties</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {partnerActions?.map((action) => (
                    <div
                      key={action.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                      data-testid={`action-detail-${action.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 
                              className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                              onClick={() => openActionDetail(action)}
                              data-testid={`action-title-${action.id}`}
                            >
                              {action.title}
                            </h3>
                            <Badge variant={action.isPublished ? "default" : "secondary"}>
                              {action.isPublished ? 'Gepubliceerd' : 'Concept'}
                            </Badge>
                            <Badge variant="outline">
                              {action.discountValue}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mt-2 max-w-2xl">
                            {action.description}
                          </p>
                          <div className="text-xs text-gray-500 mt-2">
                            Aangemaakt: {formatDateTime(action.createdAt)}
                            {action.validUntil && (
                              <span className="ml-4">
                                Geldig tot: {formatDate(action.validUntil)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              fillActionForm(action);
                              setActiveTab('create');
                            }}
                            data-testid={`button-edit-action-detail-${action.id}`}
                          >
                            Bewerken
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {!partnerActions?.length && (
                    <div className="text-center py-8 text-gray-500">
                      Nog geen acties aangemaakt. Ga naar "Nieuwe Actie" om je eerste actie aan te maken.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Action Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Nieuwe Actie Aanmaken</CardTitle>
                <CardDescription>Maak een nieuwe promotionele actie voor je klanten</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="actionTitle">Titel *</Label>
                  <Input
                    id="actionTitle"
                    value={actionForm.title}
                    onChange={(e) => setActionForm({...actionForm, title: e.target.value})}
                    placeholder="Bijv. 20% korting op alle winter jassen"
                    data-testid="input-action-title"
                  />
                </div>

                <div>
                  <Label htmlFor="actionDescription">Beschrijving *</Label>
                  <Textarea
                    id="actionDescription"
                    value={actionForm.description}
                    onChange={(e) => setActionForm({...actionForm, description: e.target.value})}
                    placeholder="Beschrijf de actie in detail... (max 3000 karakters)"
                    className="min-h-32"
                    maxLength={3000}
                    data-testid="textarea-action-description"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {actionForm.description.length}/3000 karakters
                  </p>
                </div>

                {/* Action Image Upload */}
                <div>
                  <Label className="text-base font-medium">Actie Afbeelding</Label>
                  <p className="text-sm text-gray-600 mb-3">Upload een afbeelding die je actie visueel weergeeft</p>
                  <div className="flex items-start gap-4">
                    {actionForm.imageUrl ? (
                      <img 
                        src={actionForm.imageUrl.startsWith('/') 
                          ? `${window.location.origin}${actionForm.imageUrl}` 
                          : actionForm.imageUrl
                        }
                        alt="Actie afbeelding" 
                        className="w-24 h-24 object-cover border rounded-lg"
                        data-testid="img-action-preview"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <Gift className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880}
                        accept="image/*"
                        onGetUploadParameters={handleGetActionImageUploadParameters}
                        onComplete={handleActionImageUploadComplete}
                        buttonClassName="w-full max-w-xs"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {actionImageUploadMutation.isPending ? 'Uploading...' : 'Afbeelding Uploaden'}
                      </ObjectUploader>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG/JPG, max 5MB. Aanbevolen: 16:9 formaat (bijv. 800x450px)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="actionPoints">Punten Beloning</Label>
                    <Input
                      id="actionPoints"
                      type="number"
                      min="1"
                      max="1000"
                      value={actionForm.pointsReward}
                      onChange={(e) => setActionForm({...actionForm, pointsReward: parseInt(e.target.value) || 0})}
                      data-testid="input-action-points"
                    />
                  </div>

                  <div>
                    <Label htmlFor="actionValidUntil">Geldig tot (optioneel)</Label>
                    <Input
                      id="actionValidUntil"
                      type="date"
                      value={actionForm.validUntil}
                      onChange={(e) => setActionForm({...actionForm, validUntil: e.target.value})}
                      data-testid="input-action-valid-until"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="actionStatus">Status</Label>
                  <select
                    id="actionStatus"
                    value={actionForm.status}
                    onChange={(e) => setActionForm({...actionForm, status: e.target.value as 'draft' | 'published'})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    data-testid="select-action-status"
                  >
                    <option value="draft">Concept (niet zichtbaar)</option>
                    <option value="published">Gepubliceerd (zichtbaar in app)</option>
                  </select>
                </div>

                <Button 
                  onClick={handleCreateAction}
                  disabled={createActionMutation.isPending}
                  className="w-full"
                  data-testid="button-create-action"
                >
                  {createActionMutation.isPending ? 'Aanmaken...' : 'Actie Aanmaken'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Partner Profiel</CardTitle>
                <CardDescription>Je bedrijfsgegevens en contactinformatie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload Section */}
                <div>
                  <Label className="text-base font-medium">Bedrijfslogo</Label>
                  <p className="text-sm text-gray-600 mb-3">Upload je bedrijfslogo dat zichtbaar wordt in de Snapbag app</p>
                  <div className="flex items-start gap-4">
                    {partnerProfile?.logoUrl && partnerProfile?.logoUrl !== '/partner-logos/' ? (
                      <img 
                        src={partnerProfile.logoUrl.startsWith('/') 
                          ? `${window.location.origin}${partnerProfile.logoUrl}` 
                          : partnerProfile.logoUrl
                        }
                        alt="Bedrijfslogo" 
                        className="w-20 h-20 object-cover border rounded-lg"
                        data-testid="img-partner-logo"
                        onError={(e) => {
                          // Hide broken images
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    {(!partnerProfile?.logoUrl || partnerProfile?.logoUrl === '/partner-logos/') && (
                      <div className="w-20 h-20 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880}
                        accept="image/*"
                        onGetUploadParameters={handleGetLogoUploadParameters}
                        onComplete={handleLogoUploadComplete}
                        buttonClassName="w-full max-w-xs"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {logoUploadMutation.isPending ? 'Uploading...' : 'Logo Uploaden'}
                      </ObjectUploader>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG/JPG, max 5MB. Aanbevolen: vierkant formaat (bijv. 200x200px)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Bedrijfsgegevens</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Naam</Label>
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                        {partnerProfile?.name}
                      </p>
                    </div>
                  
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                        {partnerProfile?.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Bedrijfsnaam</Label>
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {partnerProfile?.companyName || 'Niet ingevuld'}
                    </p>
                  </div>
                  
                  <div>
                    <Label>Categorie</Label>
                    <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {partnerProfile?.category}
                    </p>
                  </div>
                </div>

                {partnerProfile?.description && (
                  <div>
                    <Label>Beschrijving</Label>
                    <p className="text-sm p-2 bg-gray-50 rounded">
                      {partnerProfile.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {partnerProfile?.website && (
                    <div>
                      <Label>Website</Label>
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                        {partnerProfile.website}
                      </p>
                    </div>
                  )}
                  
                  {partnerProfile?.phone && (
                    <div>
                      <Label>Telefoon</Label>
                      <p className="text-sm font-medium p-2 bg-gray-50 rounded">
                        {partnerProfile.phone}
                      </p>
                    </div>
                  )}
                </div>

                {partnerProfile?.address && (
                  <div>
                    <Label>Adres</Label>
                    <p className="text-sm p-2 bg-gray-50 rounded">
                      {partnerProfile.address}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    Partner sinds: {partnerProfile?.createdAt ? formatDate(partnerProfile.createdAt) : 'Onbekend'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discount Codes Tab */}
          <TabsContent value="discounts" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Upload Discount Codes */}
              <Card>
                <CardHeader>
                  <CardTitle>Kortingscodes Uploaden</CardTitle>
                  <CardDescription>Upload kortingscodes via CSV of tekst</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="batchName">Batch Naam *</Label>
                    <Input
                      id="batchName"
                      value={discountCodeForm.batchName}
                      onChange={(e) => setDiscountCodeForm({...discountCodeForm, batchName: e.target.value})}
                      placeholder="Bijv. Winter2024_Codes"
                      data-testid="input-batch-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="actionId">Koppel aan Actie (Optioneel)</Label>
                    <select
                      id="actionId"
                      value={discountCodeForm.actionId}
                      onChange={(e) => setDiscountCodeForm({...discountCodeForm, actionId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="select-action-id"
                    >
                      <option value="">Geen specifieke actie</option>
                      {partnerActions?.filter(action => action.isPublished).map((action) => (
                        <option key={action.id} value={action.id}>{action.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shopType">Shop Type</Label>
                      <select
                        id="shopType"
                        value={discountCodeForm.shopType}
                        onChange={(e) => setDiscountCodeForm({...discountCodeForm, shopType: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        data-testid="select-shop-type"
                      >
                        <option value="shopify">Shopify</option>
                        <option value="woocommerce">WooCommerce</option>
                        <option value="magento">Magento</option>
                        <option value="other">Anders</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="validUntil">Geldig Tot</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={discountCodeForm.validUntil}
                        onChange={(e) => setDiscountCodeForm({...discountCodeForm, validUntil: e.target.value})}
                        data-testid="input-valid-until"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="redirectUrl">Shop URL</Label>
                    <Input
                      id="redirectUrl"
                      type="url"
                      value={discountCodeForm.redirectUrl}
                      onChange={(e) => setDiscountCodeForm({...discountCodeForm, redirectUrl: e.target.value})}
                      placeholder="https://jouwshop.nl"
                      data-testid="input-redirect-url"
                    />
                  </div>

                  <div>
                    <Label htmlFor="codes">Kortingscodes *</Label>
                    <Textarea
                      id="codes"
                      value={discountCodeForm.codes}
                      onChange={(e) => setDiscountCodeForm({...discountCodeForm, codes: e.target.value})}
                      placeholder="WINTER20&#10;SALE15&#10;DISCOUNT25&#10;&#10;(Eén code per regel)"
                      className="min-h-32"
                      data-testid="textarea-codes"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {discountCodeForm.codes.split('\n').filter(code => code.trim()).length} codes
                    </p>
                  </div>

                  <Button 
                    onClick={() => uploadDiscountCodesMutation.mutate(discountCodeForm)}
                    disabled={uploadDiscountCodesMutation.isPending || !discountCodeForm.batchName || !discountCodeForm.codes}
                    className="w-full"
                    data-testid="button-upload-codes"
                  >
                    {uploadDiscountCodesMutation.isPending ? 'Uploaden...' : 'Kortingscodes Uploaden'}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Discount Codes */}
              <Card>
                <CardHeader>
                  <CardTitle>Mijn Kortingscodes</CardTitle>
                  <CardDescription>Overzicht van alle geüploade kortingscodes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {discountCodes && discountCodes.length > 0 ? (
                      // Group codes by batch
                      Object.entries(
                        discountCodes.reduce((groups, code) => {
                          const batch = code.batchName || 'Onbekend';
                          if (!groups[batch]) groups[batch] = [];
                          groups[batch].push(code);
                          return groups;
                        }, {} as Record<string, typeof discountCodes>)
                      ).map(([batchName, codes]) => (
                        <div key={batchName} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{batchName}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{codes.length} codes</Badge>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteBatchMutation.mutate(batchName)}
                                disabled={deleteBatchMutation.isPending}
                                data-testid={`button-delete-batch-${batchName}`}
                              >
                                Verwijder Batch
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Shop: {codes[0].shopType || 'Niet gespecificeerd'}</div>
                            <div>Status verdeling:</div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="secondary">
                                Beschikbaar: {codes.filter(c => c.status === 'available').length}
                              </Badge>
                              <Badge variant="default">
                                Geclaimd: {codes.filter(c => c.status === 'claimed').length}
                              </Badge>
                              <Badge variant="destructive">
                                Gebruikt: {codes.filter(c => c.status === 'used').length}
                              </Badge>
                            </div>
                            {codes[0].validUntil && (
                              <div>Geldig tot: {new Date(codes[0].validUntil).toLocaleDateString('nl-NL')}</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Nog geen kortingscodes geüpload.</p>
                        <p className="text-sm">Upload je eerste batch kortingscodes om te beginnen.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Detail Popup */}
      <Dialog open={isActionDetailOpen} onOpenChange={setIsActionDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold mb-2">
              {selectedAction?.title}
            </DialogTitle>
            <p className="text-sm text-gray-600 mb-4">
              Partner: {partnerProfile?.name || 'Partner naam niet beschikbaar'}
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={selectedAction?.isPublished ? "default" : "secondary"}>
                {selectedAction?.isPublished ? 'Gepubliceerd' : 'Concept'}
              </Badge>
              <Badge variant="outline">
                {selectedAction?.discountValue}
              </Badge>
              {selectedAction?.validUntil && (
                <Badge variant="outline" className="text-orange-600">
                  Geldig tot: {formatDate(selectedAction.validUntil)}
                </Badge>
              )}
            </div>

            <div>
              <h4 className="font-semibold mb-2">Beschrijving</h4>
              <div className="text-sm text-gray-700 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">
                {selectedAction?.description || 'Geen beschrijving beschikbaar'}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-xs text-gray-500">
                Aangemaakt: {selectedAction?.createdAt ? formatDateTime(selectedAction.createdAt) : 'Onbekend'}
              </div>
              
              <Button 
                onClick={closeActionDetail}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-claim-action"
              >
                Claim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}