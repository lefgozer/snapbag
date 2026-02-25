import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, Users, QrCode, TrendingUp, Eye, Download, Menu, Building2, ExternalLink, UserMinus, UserCheck, Trash2, UserX, Plus, X, Calendar as CalendarIcon, MapPin, Clock, MousePointer, Gift } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import QRCodeDisplay from "@/components/qr-code-display";

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [batchForm, setBatchForm] = useState({
    batchName: '',
    description: '',
    quantity: 100
  });

  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("analytics");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    description: '',
    category: 'retail',
    website: '',
    phone: '',
    address: ''
  });

  const [selectedPartnerToDelete, setSelectedPartnerToDelete] = useState<string | null>(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);

  // Wheel prizes state
  const [editingPrize, setEditingPrize] = useState<any | null>(null);
  const [prizeForm, setPrizeForm] = useState({
    partnerId: '',
    prizeTitle: '',
    description: '',
    validityDays: 30,
    conditions: '',
    color: '',
    isNational: true,
    provinces: [] as string[],
    isActive: true,
  });

  // Analytics filters
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // Fetch admin analytics with filters
  const { data: adminAnalytics } = useQuery<{
    totalScans: number;
    uniqueUsers: number;
    clickThroughRate: number;
    conversionRate: number;
    scansToday: number;
    scansThisWeek: number;
  }>({
    queryKey: ['/api/admin/partner-analytics', selectedPartnerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPartnerId && selectedPartnerId !== 'all') {
        params.append('partnerId', selectedPartnerId);
      }
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }
      const response = await fetch(`/api/admin/partner-analytics?${params}`);
      return response.json();
    },
  });

  // Fetch admin scan locations with filters
  const { data: adminScanLocations } = useQuery<Array<{
    location: string;
    scans: number;
    ctr: number;
  }>>({
    queryKey: ['/api/admin/partner-scan-locations', selectedPartnerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPartnerId && selectedPartnerId !== 'all') {
        params.append('partnerId', selectedPartnerId);
      }
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }
      const response = await fetch(`/api/admin/partner-scan-locations?${params}`);
      const data = await response.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch admin scan times with filters
  const { data: adminScanTimes } = useQuery<Array<{
    hour: string;
    scans: number;
  }>>({
    queryKey: ['/api/admin/partner-scan-times', selectedPartnerId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPartnerId && selectedPartnerId !== 'all') {
        params.append('partnerId', selectedPartnerId);
      }
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }
      const response = await fetch(`/api/admin/partner-scan-times?${params}`);
      const data = await response.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch batches
  const { data: batches } = useQuery<Array<{
    id: string;
    batchName: string;
    description: string | null;
    totalCodes: number;
    isActive: boolean;
    createdAt: string;
  }>>({
    queryKey: ['/api/admin/batches'],
  });

  // Fetch partners
  const { data: allPartners } = useQuery<Array<{
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    description: string | null;
    category: string;
    website: string | null;
    phone: string | null;
    address: string | null;
    isActive: boolean;
    createdAt: string;
    lastLogin: string | null;
  }>>({
    queryKey: ['/api/admin/partners'],
  });

  // Fetch users with scans
  const { data: usersWithScans } = useQuery<Array<{
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      points: number;
      lifetimeXP: number;
      level: number;
      createdAt: string;
    };
    totalScans: number;
    firstScanDate: string | null;
    lastScanDate: string | null;
  }>>({
    queryKey: ['/api/admin/users-with-scans'],
  });

  // Fetch wheel prizes
  const { data: wheelPrizesData } = useQuery<{ success: boolean; prizes: any[] }>({
    queryKey: ['/api/admin/wheel-prizes'],
    queryFn: async () => {
      const response = await fetch('/api/admin/wheel-prizes');
      return response.json();
    },
  });

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: { batchName: string; description: string; quantity: number }) => {
      const response = await apiRequest("POST", "/api/admin/batches", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch aangemaakt",
        description: `Batch "${data.batch.batchName}" met ${data.batch.totalCodes} QR-codes is succesvol aangemaakt`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/batches'] });
      setBatchForm({ batchName: '', description: '', quantity: 100 });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij aanmaken batch",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create partner mutation
  const createPartnerMutation = useMutation({
    mutationFn: async (data: typeof partnerForm) => {
      const response = await apiRequest("POST", "/api/admin/partners", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Partner aangemaakt",
        description: `Partner "${data.partner.name}" is succesvol aangemaakt`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
      setPartnerForm({
        name: '',
        email: '',
        password: '',
        companyName: '',
        description: '',
        category: 'retail',
        website: '',
        phone: '',
        address: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij aanmaken partner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deactivate partner mutation
  const deactivatePartnerMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const response = await apiRequest("PUT", `/api/admin/partners/${partnerId}/deactivate`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Partner gedeactiveerd",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij deactiveren partner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize Snapbag partner mutation
  const initSnapbagMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/dev/init-snapbag-partner");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Snapbag Partner",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij initialiseren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Activate partner mutation
  const activatePartnerMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const response = await apiRequest("PUT", `/api/admin/partners/${partnerId}/activate`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Partner geactiveerd",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij activeren partner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete partner mutation
  const deletePartnerMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/partners/${partnerId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Partner verwijderd",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
      setSelectedPartnerToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen partner",
        description: error.message,
        variant: "destructive",
      });
      setSelectedPartnerToDelete(null);
    },
  });

  // Update wheel prize mutation
  const updateWheelPrizeMutation = useMutation({
    mutationFn: async ({ position, data }: { position: number; data: typeof prizeForm }) => {
      const response = await apiRequest("PUT", `/api/admin/wheel-prizes/${position}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Prijs bijgewerkt",
        description: `Positie ${data.prize.position} is succesvol bijgewerkt`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/wheel-prizes'] });
      setEditingPrize(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij bijwerken prijs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateBatch = () => {
    if (!batchForm.batchName.trim()) {
      toast({
        title: "Validatie fout",
        description: "Batch naam is verplicht",
        variant: "destructive",
      });
      return;
    }

    if (batchForm.quantity <= 0 || batchForm.quantity > 10000) {
      toast({
        title: "Validatie fout",
        description: "Aantal moet tussen 1 en 10,000 zijn",
        variant: "destructive",
      });
      return;
    }

    createBatchMutation.mutate(batchForm);
  };

  const handleCreatePartner = () => {
    if (!partnerForm.name.trim() || !partnerForm.email.trim() || !partnerForm.password.trim()) {
      toast({
        title: "Validatie fout",
        description: "Naam, email en wachtwoord zijn verplicht",
        variant: "destructive",
      });
      return;
    }

    if (partnerForm.password.length < 6) {
      toast({
        title: "Validatie fout",
        description: "Wachtwoord moet minimaal 6 karakters lang zijn",
        variant: "destructive",
      });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(partnerForm.email)) {
      toast({
        title: "Validatie fout",
        description: "Voer een geldig email adres in",
        variant: "destructive",
      });
      return;
    }

    createPartnerMutation.mutate(partnerForm);
  };

  const handleDeactivatePartner = (partnerId: string) => {
    deactivatePartnerMutation.mutate(partnerId);
  };

  const handleActivatePartner = (partnerId: string) => {
    activatePartnerMutation.mutate(partnerId);
  };

  const handleDeletePartner = (partnerId: string) => {
    deletePartnerMutation.mutate(partnerId);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Mobile menu component
  const MobileMenu = () => (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Admin Menu</SheetTitle>
          <SheetDescription>
            Navigeer tussen verschillende admin secties
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          <Button
            variant={activeTab === "analytics" ? "default" : "ghost"}
            onClick={() => { setActiveTab("analytics"); setIsMenuOpen(false); }}
            className="w-full justify-start"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Button
            variant={activeTab === "batches" ? "default" : "ghost"}
            onClick={() => { setActiveTab("batches"); setIsMenuOpen(false); }}
            className="w-full justify-start"
          >
            <QrCode className="mr-2 h-4 w-4" />
            QR Batches
          </Button>
          <Button
            variant={activeTab === "partners" ? "default" : "ghost"}
            onClick={() => { setActiveTab("partners"); setIsMenuOpen(false); }}
            className="w-full justify-start"
          >
            <Building2 className="mr-2 h-4 w-4" />
            Partners
          </Button>
          <Button
            variant={activeTab === "wheel-prizes" ? "default" : "ghost"}
            onClick={() => { setActiveTab("wheel-prizes"); setIsMenuOpen(false); }}
            className="w-full justify-start"
          >
            <Gift className="mr-2 h-4 w-4" />
            Gelukswiel
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "ghost"}
            onClick={() => { setActiveTab("users"); setIsMenuOpen(false); }}
            className="w-full justify-start"
          >
            <Users className="mr-2 h-4 w-4" />
            Gebruikers
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Beheer het Snapbag systeem</p>
          </div>
          <MobileMenu />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="batches" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Batches
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="wheel-prizes" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Gelukswiel
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gebruikers
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Filters */}
            <Card className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-4">Analytics Filters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Partner Selector */}
                    <div className="space-y-2">
                      <Label>Partner</Label>
                      <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                        <SelectTrigger data-testid="select-partner">
                          <SelectValue placeholder="Selecteer partner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Partners</SelectItem>
                          {allPartners?.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.name} ({partner.companyName || 'Geen bedrijf'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Start Date */}
                    <div className="space-y-2">
                      <Label>Startdatum</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start" data-testid="button-start-date">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "dd-MM-yyyy") : "Selecteer datum"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* End Date */}
                    <div className="space-y-2">
                      <Label>Einddatum</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start" data-testid="button-end-date">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "dd-MM-yyyy") : "Selecteer datum"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedPartnerId("all");
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                  data-testid="button-clear-filters"
                >
                  Filters Wissen
                </Button>
              </div>
            </Card>

            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Admin Analytics Dashboard</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Overzicht van alle QR-scan activiteit {selectedPartnerId !== 'all' ? 'voor geselecteerde partner' : 'voor alle partners'}.
                {startDate || endDate ? ` Gefilterd op ${startDate ? format(startDate, "dd-MM-yyyy") : '...'} - ${endDate ? format(endDate, "dd-MM-yyyy") : 'nu'}.` : ''}
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
                      {adminAnalytics?.totalScans?.toLocaleString() || '0'}
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
                      {adminAnalytics?.uniqueUsers?.toLocaleString() || '0'}
                    </div>
                    <p className="text-sm text-gray-600">Unieke gebruikers</p>
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
                      {adminAnalytics?.clickThroughRate || 0}%
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
                      {adminAnalytics?.conversionRate || 0}%
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
                  <h3 className="text-lg font-semibold text-gray-900">Top Scan Locaties</h3>
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  {Array.isArray(adminScanLocations) && adminScanLocations.map((location, index) => (
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
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      Geen locatie data beschikbaar voor de geselecteerde filters.
                    </div>
                  )}
                </div>
              </Card>

              {/* Scan Tijdstippen */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Scan Tijdstippen</h3>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-4">
                  {Array.isArray(adminScanTimes) && adminScanTimes.map((timeSlot, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-12 text-sm font-medium text-gray-700">
                        {timeSlot.hour}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-3 relative">
                        <div 
                          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((timeSlot.scans / Math.max(...(Array.isArray(adminScanTimes) ? adminScanTimes : []).map(t => t.scans), 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="w-8 text-sm font-semibold text-blue-600">
                        {timeSlot.scans}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      Geen tijddata beschikbaar voor de geselecteerde filters.
                    </div>
                  )}
                </div>
                {Array.isArray(adminScanTimes) && adminScanTimes.length > 0 && (
                  <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                    <div className="flex items-center text-sm text-emerald-700">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span className="font-medium">
                        Piekuren: {Array.isArray(adminScanTimes) && adminScanTimes.length > 0 ? adminScanTimes.reduce((peak, current) => current.scans > peak.scans ? current : peak).hour : 'N/A'} 
                        ({Array.isArray(adminScanTimes) && adminScanTimes.length > 0 ? adminScanTimes.reduce((peak, current) => current.scans > peak.scans ? current : peak).scans : 0} scans)
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* QR Batches Tab */}
          <TabsContent value="batches" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Batch Creation Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Nieuwe QR Batch Aanmaken</CardTitle>
                  <CardDescription>Genereer een nieuwe batch QR-codes voor tassen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="batchName">Batch Naam *</Label>
                    <Input
                      id="batchName"
                      value={batchForm.batchName}
                      onChange={(e) => setBatchForm({...batchForm, batchName: e.target.value})}
                      placeholder="Bijv. Winter 2024"
                      data-testid="input-batch-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Beschrijving</Label>
                    <Textarea
                      id="description"
                      value={batchForm.description}
                      onChange={(e) => setBatchForm({...batchForm, description: e.target.value})}
                      placeholder="Optionele beschrijving van deze batch"
                      data-testid="textarea-batch-description"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity">Aantal QR-codes *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={batchForm.quantity}
                      onChange={(e) => setBatchForm({...batchForm, quantity: parseInt(e.target.value) || 0})}
                      placeholder="100"
                      min="1"
                      max="10000"
                      data-testid="input-batch-quantity"
                    />
                  </div>

                  <Button 
                    onClick={handleCreateBatch}
                    disabled={createBatchMutation.isPending}
                    className="w-full"
                    data-testid="button-create-batch"
                  >
                    {createBatchMutation.isPending ? 'Aanmaken...' : 'Batch Aanmaken'}
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Batches */}
              <Card>
                <CardHeader>
                  <CardTitle>Bestaande Batches</CardTitle>
                  <CardDescription>Overzicht van alle QR-code batches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {batches?.map((batch) => (
                      <BatchDetail key={batch.id} batch={batch} formatDateTime={formatDateTime} />
                    ))}
                    
                    {!batches?.length && (
                      <div className="text-center py-8 text-gray-500">
                        Nog geen batches aangemaakt.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners" className="space-y-6">
            {/* Snapbag Initialization Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h3 className="font-semibold text-blue-900">Snapbag Partner</h3>
                  <p className="text-sm text-blue-700">Systeem partner voor punten-gebaseerde prijzen</p>
                </div>
                <Button
                  onClick={() => initSnapbagMutation.mutate()}
                  disabled={initSnapbagMutation.isPending}
                  variant="default"
                  data-testid="button-init-snapbag"
                >
                  {initSnapbagMutation.isPending ? "Initialiseren..." : "Initialiseer Snapbag"}
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Partner Creation Form */}
              {!showPartnerForm ? (
                <Card className="flex items-center justify-center p-6">
                  <Button 
                    onClick={() => setShowPartnerForm(true)}
                    variant="outline"
                    size="lg"
                    className="flex items-center gap-2"
                    data-testid="show-partner-form-button"
                  >
                    <Plus className="h-5 w-5" />
                    Nieuwe Partner Toevoegen
                  </Button>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Nieuwe Partner Aanmaken</CardTitle>
                      <CardDescription>Voeg een nieuwe partner toe aan het systeem</CardDescription>
                    </div>
                    <Button 
                      onClick={() => setShowPartnerForm(false)}
                      variant="ghost"
                      size="sm"
                      data-testid="hide-partner-form-button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="partnerName">Naam *</Label>
                      <Input
                        id="partnerName"
                        value={partnerForm.name}
                        onChange={(e) => setPartnerForm({...partnerForm, name: e.target.value})}
                        placeholder="Bijv. De Bijenkorf"
                        data-testid="input-partner-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="partnerEmail">Email *</Label>
                      <Input
                        id="partnerEmail"
                        type="email"
                        value={partnerForm.email}
                        onChange={(e) => setPartnerForm({...partnerForm, email: e.target.value})}
                        placeholder="contact@partner.nl"
                        data-testid="input-partner-email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="partnerPassword">Wachtwoord *</Label>
                      <Input
                        id="partnerPassword"
                        type="password"
                        value={partnerForm.password}
                        onChange={(e) => setPartnerForm({...partnerForm, password: e.target.value})}
                        placeholder="Minimaal 6 karakters"
                        data-testid="input-partner-password"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="partnerCompany">Bedrijfsnaam</Label>
                      <Input
                        id="partnerCompany"
                        value={partnerForm.companyName}
                        onChange={(e) => setPartnerForm({...partnerForm, companyName: e.target.value})}
                        placeholder="Optioneel"
                        data-testid="input-partner-company"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="partnerDescription">Beschrijving</Label>
                    <Textarea
                      id="partnerDescription"
                      value={partnerForm.description}
                      onChange={(e) => setPartnerForm({...partnerForm, description: e.target.value})}
                      placeholder="Beschrijving van de partner"
                      data-testid="textarea-partner-description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="partnerCategory">Categorie</Label>
                      <select
                        id="partnerCategory"
                        value={partnerForm.category}
                        onChange={(e) => setPartnerForm({...partnerForm, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        data-testid="select-partner-category"
                      >
                        <option value="restaurant">Restaurant</option>
                        <option value="retail">Retail</option>
                        <option value="service">Service</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="health">Health</option>
                        <option value="travel">Travel</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="partnerWebsite">Website</Label>
                      <Input
                        id="partnerWebsite"
                        type="url"
                        value={partnerForm.website}
                        onChange={(e) => setPartnerForm({...partnerForm, website: e.target.value})}
                        placeholder="https://partner.nl"
                        data-testid="input-partner-website"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="partnerPhone">Telefoon</Label>
                      <Input
                        id="partnerPhone"
                        value={partnerForm.phone}
                        onChange={(e) => setPartnerForm({...partnerForm, phone: e.target.value})}
                        placeholder="+31 20 123 4567"
                        data-testid="input-partner-phone"
                      />
                    </div>
                    
                    <div>
                      {/* Empty column for spacing */}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="partnerAddress">Adres</Label>
                    <Textarea
                      id="partnerAddress"
                      value={partnerForm.address}
                      onChange={(e) => setPartnerForm({...partnerForm, address: e.target.value})}
                      placeholder="Straat 123, 1234 AB Stad"
                      data-testid="textarea-partner-address"
                    />
                  </div>

                  <Button 
                    onClick={handleCreatePartner}
                    disabled={createPartnerMutation.isPending}
                    className="w-full"
                    data-testid="button-create-partner"
                  >
                    {createPartnerMutation.isPending ? 'Aanmaken...' : 'Partner Aanmaken'}
                  </Button>
                </CardContent>
              </Card>
              )}

              {/* Partners List */}
              <Card>
                <CardHeader>
                  <CardTitle>Bestaande Partners</CardTitle>
                  <CardDescription>Overzicht van alle geregistreerde partners</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allPartners?.map((partner) => (
                      <div
                        key={partner.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        data-testid={`partner-${partner.id}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 truncate">{partner.name}</h3>
                              <Badge variant={partner.isActive ? "default" : "secondary"}>
                                {partner.isActive ? "Actief" : "Inactief"}
                              </Badge>
                              <Badge variant="outline" className="shrink-0">
                                {partner.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{partner.email}</p>
                            {partner.companyName && (
                              <p className="text-xs text-gray-500 truncate">{partner.companyName}</p>
                            )}
                            {partner.description && (
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">{partner.description}</p>
                            )}
                            <div className="text-xs text-gray-500 mt-2 space-y-1">
                              <div>Aangemaakt: {formatDateTime(partner.createdAt)}</div>
                              {partner.lastLogin && (
                                <div>Laatste login: {formatDateTime(partner.lastLogin)}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 shrink-0 sm:ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open('/partner', '_blank');
                              }}
                              data-testid={`login-as-partner-${partner.id}`}
                              className="w-full sm:w-auto min-w-[100px]"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Portal
                            </Button>
                            
                            {partner.isActive ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeactivatePartner(partner.id)}
                                disabled={deactivatePartnerMutation.isPending}
                                className="w-full sm:w-auto"
                                data-testid={`deactivate-partner-${partner.id}`}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Deactiveren
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivatePartner(partner.id)}
                                disabled={activatePartnerMutation.isPending}
                                className="w-full sm:w-auto"
                                data-testid={`activate-partner-${partner.id}`}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activeren
                              </Button>
                            )}

                            <AlertDialog 
                              open={selectedPartnerToDelete === partner.id} 
                              onOpenChange={(open) => !open && setSelectedPartnerToDelete(null)}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setSelectedPartnerToDelete(partner.id)}
                                  className="w-full sm:w-auto"
                                  data-testid={`delete-partner-${partner.id}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Verwijderen
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Partner Verwijderen</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Weet je zeker dat je partner "{partner.name}" permanent wilt verwijderen? 
                                    Alle data van deze partner en hun acties zullen worden gewist. 
                                    Deze actie kan niet ongedaan worden gemaakt.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeletePartner(partner.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                    data-testid={`confirm-delete-partner-${partner.id}`}
                                  >
                                    Ja, verwijderen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {!allPartners?.length && (
                      <div className="text-center py-8 text-gray-500">
                        Nog geen partners aangemaakt.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Wheel Prizes Tab */}
          <TabsContent value="wheel-prizes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gelukswiel Prijzen Beheer</CardTitle>
                <CardDescription>Configureer de 12 segmenten van het gelukswiel met fysieke prijzen of kortingen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wheelPrizesData?.prizes?.map((prize) => (
                    <Card key={prize.id} className="border-2" style={{ borderColor: prize.color }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-mono">Positie {prize.position}</Badge>
                          <div
                            className="w-6 h-6 rounded-full border-2 border-gray-200"
                            style={{ backgroundColor: prize.color }}
                          />
                        </div>
                        <CardTitle className="text-lg mt-2">{prize.prizeTitle}</CardTitle>
                        <CardDescription className="text-sm line-clamp-2">
                          {prize.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Partner:</span>
                          <span className="font-medium">
                            {allPartners?.find(p => p.id === prize.partnerId)?.name || 'Onbekend'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Geldig:</span>
                          <span className="font-medium">{prize.validityDays} dagen</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Bereik:</span>
                          {prize.isNational ? (
                            <Badge variant="secondary">🇳🇱 Landelijk</Badge>
                          ) : (
                            <Badge variant="outline">{prize.provinces.length} provincies</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Status:</span>
                          {prize.isActive ? (
                            <Badge className="bg-green-500">Actief</Badge>
                          ) : (
                            <Badge variant="secondary">Inactief</Badge>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            setEditingPrize(prize);
                            setPrizeForm({
                              partnerId: prize.partnerId,
                              prizeTitle: prize.prizeTitle,
                              description: prize.description,
                              validityDays: prize.validityDays,
                              conditions: prize.conditions,
                              color: prize.color,
                              isNational: prize.isNational,
                              provinces: prize.provinces || [],
                              isActive: prize.isActive,
                            });
                          }}
                          className="w-full mt-3"
                          variant="outline"
                          size="sm"
                          data-testid={`button-edit-prize-${prize.position}`}
                        >
                          Bewerken
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Edit Dialog */}
                <Dialog open={!!editingPrize} onOpenChange={(open) => !open && setEditingPrize(null)}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Prijs Bewerken - Positie {editingPrize?.position}
                      </DialogTitle>
                      <DialogDescription>
                        Configureer de prijs voor segment {editingPrize?.position} ({editingPrize?.startAngle}° - {editingPrize?.endAngle}°)
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* Partner Selection */}
                      <div className="space-y-2">
                        <Label>Partner *</Label>
                        <Select value={prizeForm.partnerId} onValueChange={(value) => setPrizeForm({...prizeForm, partnerId: value})}>
                          <SelectTrigger data-testid="select-prize-partner">
                            <SelectValue placeholder="Selecteer partner" />
                          </SelectTrigger>
                          <SelectContent>
                            {allPartners?.map((partner) => (
                              <SelectItem key={partner.id} value={partner.id}>
                                {partner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Prize Title */}
                      <div className="space-y-2">
                        <Label>Prijs Titel *</Label>
                        <Input
                          value={prizeForm.prizeTitle}
                          onChange={(e) => setPrizeForm({...prizeForm, prizeTitle: e.target.value})}
                          placeholder="Bijv. Gratis Appeltaart"
                          data-testid="input-prize-title"
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label>Beschrijving *</Label>
                        <Textarea
                          value={prizeForm.description}
                          onChange={(e) => setPrizeForm({...prizeForm, description: e.target.value})}
                          placeholder="Beschrijf de prijs..."
                          data-testid="textarea-prize-description"
                        />
                      </div>

                      {/* Validity Days & Color */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Geldigheid (dagen) *</Label>
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={prizeForm.validityDays}
                            onChange={(e) => setPrizeForm({...prizeForm, validityDays: parseInt(e.target.value) || 30})}
                            data-testid="input-prize-validity"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Kleur *</Label>
                          <Input
                            type="color"
                            value={prizeForm.color}
                            onChange={(e) => setPrizeForm({...prizeForm, color: e.target.value})}
                            data-testid="input-prize-color"
                          />
                        </div>
                      </div>

                      {/* Conditions */}
                      <div className="space-y-2">
                        <Label>Voorwaarden</Label>
                        <Textarea
                          value={prizeForm.conditions}
                          onChange={(e) => setPrizeForm({...prizeForm, conditions: e.target.value})}
                          placeholder="Voorwaarden voor inwisseling..."
                          data-testid="textarea-prize-conditions"
                        />
                      </div>

                      {/* Geographic Scope */}
                      <div className="space-y-2">
                        <Label>Geografisch Bereik</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={prizeForm.isNational}
                            onChange={(e) => setPrizeForm({...prizeForm, isNational: e.target.checked, provinces: []})}
                            className="w-4 h-4"
                            data-testid="checkbox-prize-national"
                          />
                          <Label className="font-normal cursor-pointer">Landelijk (hele Nederland)</Label>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={prizeForm.isActive}
                            onChange={(e) => setPrizeForm({...prizeForm, isActive: e.target.checked})}
                            className="w-4 h-4"
                            data-testid="checkbox-prize-active"
                          />
                          <Label className="font-normal cursor-pointer">Prijs is actief</Label>
                        </div>
                      </div>

                      {/* Save Button */}
                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setEditingPrize(null)}
                          data-testid="button-cancel-prize"
                        >
                          Annuleren
                        </Button>
                        <Button
                          onClick={() => {
                            if (!prizeForm.partnerId || !prizeForm.prizeTitle.trim()) {
                              toast({
                                title: "Validatie fout",
                                description: "Partner en titel zijn verplicht",
                                variant: "destructive",
                              });
                              return;
                            }
                            updateWheelPrizeMutation.mutate({
                              position: editingPrize.position,
                              data: prizeForm,
                            });
                          }}
                          disabled={updateWheelPrizeMutation.isPending}
                          data-testid="button-save-prize"
                        >
                          {updateWheelPrizeMutation.isPending ? 'Opslaan...' : 'Opslaan'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gebruiker Statistics</CardTitle>
                <CardDescription>Bekijk welke gebruikers de meeste QR-codes scannen</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gebruiker</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Totaal Scans</TableHead>
                      <TableHead>Eerste Scan</TableHead>
                      <TableHead>Laatste Scan</TableHead>
                      <TableHead>Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersWithScans?.map((userScan) => (
                      <TableRow key={userScan.user.id}>
                        <TableCell className="font-medium">
                          {userScan.user.firstName || userScan.user.lastName 
                            ? `${userScan.user.firstName || ''} ${userScan.user.lastName || ''}`.trim()
                            : 'Anonieme gebruiker'}
                        </TableCell>
                        <TableCell>{userScan.user.email || 'Geen email'}</TableCell>
                        <TableCell>{userScan.totalScans}</TableCell>
                        <TableCell>
                          {userScan.firstScanDate ? formatDateTime(userScan.firstScanDate) : '-'}
                        </TableCell>
                        <TableCell>
                          {userScan.lastScanDate ? formatDateTime(userScan.lastScanDate) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Level {userScan.user.level}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {!usersWithScans?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          Geen gebruikers gevonden.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// BatchDetail Component
const BatchDetail = ({ 
  batch, 
  formatDateTime 
}: { 
  batch: any;
  formatDateTime: (date: string) => string;
}) => {
  const [showQRCodes, setShowQRCodes] = useState(false);
  const [qrCodes, setQRCodes] = useState<any[]>([]);
  const [batchAnalytics, setBatchAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchBatchData = async () => {
    if (showQRCodes) {
      setShowQRCodes(false);
      return;
    }

    setLoading(true);
    try {
      const [qrResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/admin/batch/${batch.id}/qr-codes`),
        fetch(`/api/admin/batch/${batch.id}/analytics`)
      ]);

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        setQRCodes(qrData);
      }

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setBatchAnalytics(analyticsData);
      }

      setShowQRCodes(true);
    } catch (error) {
      console.error('Error fetching batch data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{batch.batchName}</h3>
            <Badge variant={batch.isActive ? "default" : "secondary"}>
              {batch.isActive ? "Actief" : "Inactief"}
            </Badge>
            <Badge variant="outline" className="shrink-0">
              {batch.totalCodes} codes
            </Badge>
          </div>
          {batch.description && (
            <p className="text-sm text-gray-700 mb-2">{batch.description}</p>
          )}
          <p className="text-xs text-gray-500">Aangemaakt: {formatDateTime(batch.createdAt)}</p>
        </div>
        <div className="flex gap-2 shrink-0 sm:ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBatchData}
            disabled={loading}
            data-testid={`toggle-batch-details-${batch.id}`}
            className="min-w-[100px]"
          >
            <Eye className="mr-2 h-4 w-4" />
            {loading ? 'Laden...' : showQRCodes ? 'Verbergen' : 'Bekijk QR'}
          </Button>
        </div>
      </div>

      {showQRCodes && batchAnalytics && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Totaal Scans</p>
              <p className="text-lg font-semibold">{batchAnalytics.totalScans}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Unieke Gebruikers</p>
              <p className="text-lg font-semibold">{batchAnalytics.uniqueUsers}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Gescande Codes</p>
              <p className="text-lg font-semibold">{batchAnalytics.scannedCodes}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Scan Percentage</p>
              <p className="text-lg font-semibold">{batchAnalytics.scanPercentage}%</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {qrCodes.map((qr) => (
              <div key={qr.id} className="border rounded-lg p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono truncate">{qr.bagId}</span>
                  <Badge variant={qr.scanCount > 0 ? "default" : "outline"} className="shrink-0">
                    {qr.scanCount} scans
                  </Badge>
                </div>
                <QRCodeDisplay data={qr.bagId} size={120} />
                {qr.lastScanned && (
                  <p className="text-xs text-gray-500 mt-2">
                    Laatste scan: {formatDateTime(qr.lastScanned)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};