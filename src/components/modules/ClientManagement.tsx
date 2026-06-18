import { useState } from "react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Phone,
  MapPin,
  User,
  Printer,
  MoreHorizontal,
  FileText,
  Pill,
  Bath,
  Utensils,
  HeartPulse,
  Sparkles,
  Car,
  ClipboardList,
  Contact,
  Power,
} from "lucide-react";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { printPage } from "@/lib/print-utils";
import { toast } from "sonner";

export function ClientManagement() {
  const { clients, addClient, updateClient } = useHomeCareContext();
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    address: "",
    phone: "",
    emergencyContact: "",
    careLevel: "Medium" as const,
    hourlyRate: 25,
    status: "Active" as const,
    carePlan: ""
  });
  const [editForm, setEditForm] = useState<{
    name: string;
    address: string;
    phone: string;
    emergencyContact: string;
    careLevel: "Low" | "Medium" | "High";
    hourlyRate: number;
    status: "Active" | "Inactive";
    carePlan: string;
  }>({
    name: "",
    address: "",
    phone: "",
    emergencyContact: "",
    careLevel: "Medium" as const,
    hourlyRate: 25,
    status: "Active" as const,
    carePlan: ""
  });

  const handleAddClient = () => {
    addClient({
      ...newClient,
      carePlan: newClient.carePlan.split(',').map(s => s.trim()).filter(s => s)
    });
    setIsAddingClient(false);
    setNewClient({
      name: "",
      address: "",
      phone: "",
      emergencyContact: "",
      careLevel: "Medium",
      hourlyRate: 25,
      status: "Active",
      carePlan: ""
    });
  };

  const openEditDialog = (client: typeof clients[0]) => {
    setEditingClientId(client.id);
    setEditForm({
      name: client.name,
      address: client.address,
      phone: client.phone,
      emergencyContact: client.emergencyContact,
      careLevel: client.careLevel,
      hourlyRate: client.hourlyRate,
      status: client.status,
      carePlan: client.carePlan.join(", ")
    });
    setIsEditingClient(true);
  };

  const handleEditClient = () => {
    if (!editingClientId) return;
    updateClient(editingClientId, {
      ...editForm,
      carePlan: editForm.carePlan.split(',').map(s => s.trim()).filter(s => s)
    });
    setIsEditingClient(false);
    setEditingClientId(null);
  };

  const getCareLevel = (level: string) => {
    const colors = {
      Low: "bg-success/10 text-success border-success/20",
      Medium: "bg-warning/10 text-warning border-warning/20", 
      High: "bg-destructive/10 text-destructive border-destructive/20"
    };
    return colors[level as keyof typeof colors] || colors.Medium;
  };

  const getTaskIcon = (task: string) => {
    const t = task.toLowerCase();
    if (t.includes("medic") || t.includes("pill") || t.includes("drug")) return Pill;
    if (t.includes("bath") || t.includes("hygiene") || t.includes("shower")) return Bath;
    if (t.includes("meal") || t.includes("food") || t.includes("cook") || t.includes("feed")) return Utensils;
    if (t.includes("vital") || t.includes("health") || t.includes("blood") || t.includes("therapy")) return HeartPulse;
    if (t.includes("clean") || t.includes("housekeep") || t.includes("laundry")) return Sparkles;
    if (t.includes("transport") || t.includes("drive") || t.includes("errand")) return Car;
    return ClipboardList;
  };

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
            <p className="text-muted-foreground">Comprehensive client profiles and care plans</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printPage} className="no-print">
            <Printer className="h-4 w-4 mr-2" />
            Print List
          </Button>
          <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2" data-tour="clients-add-btn">
                <Plus className="h-4 w-4" />
                <span>Add Client</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  data-tour="clients-name-input"
                  value={newClient.name}
                  onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter client's full name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  data-tour="clients-address-input"
                  value={newClient.address}
                  onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
              <div>
                <Label htmlFor="emergency">Emergency Contact</Label>
                <Input
                  id="emergency"
                  value={newClient.emergencyContact}
                  onChange={(e) => setNewClient(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="Name - Phone number"
                />
              </div>
              <div>
                <Label htmlFor="careLevel">Care Level</Label>
                <Select value={newClient.careLevel} onValueChange={(value: any) => setNewClient(prev => ({ ...prev, careLevel: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rate">Hourly Rate ($)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={newClient.hourlyRate}
                  onChange={(e) => setNewClient(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="carePlan">Care Plan (comma-separated)</Label>
                <Textarea
                  id="carePlan"
                  value={newClient.carePlan}
                  onChange={(e) => setNewClient(prev => ({ ...prev, carePlan: e.target.value }))}
                  placeholder="Personal Care, Medication Reminders, Light Housekeeping"
                />
              </div>
              <Button onClick={handleAddClient} className="w-full" data-tour="clients-save-btn">
                Add Client
              </Button>
            </div>
          </DialogContent>
        </Dialog>

          {/* Edit Client Dialog */}
          <Dialog open={isEditingClient} onOpenChange={setIsEditingClient}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-emergency">Emergency Contact</Label>
                  <Input
                    id="edit-emergency"
                    value={editForm.emergencyContact}
                    onChange={(e) => setEditForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-careLevel">Care Level</Label>
                  <Select value={editForm.careLevel} onValueChange={(value: any) => setEditForm(prev => ({ ...prev, careLevel: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-rate">Hourly Rate ($)</Label>
                  <Input
                    id="edit-rate"
                    type="number"
                    value={editForm.hourlyRate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, hourlyRate: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editForm.status} onValueChange={(value: any) => setEditForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-carePlan">Care Plan (comma-separated)</Label>
                  <Textarea
                    id="edit-carePlan"
                    value={editForm.carePlan}
                    onChange={(e) => setEditForm(prev => ({ ...prev, carePlan: e.target.value }))}
                  />
                </div>
                <Button onClick={handleEditClient} className="w-full">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {clients.map((client) => (
          <Card key={client.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-6 pb-5">
              <div className="min-w-0">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground truncate">
                  {client.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground font-mono truncate">
                  ID: {client.id}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className={`rounded-full px-3 py-0.5 text-xs font-medium ${getCareLevel(client.careLevel)}`}
                >
                  {client.careLevel}
                </Badge>
                <Badge
                  variant={client.status === "Active" ? "default" : "secondary"}
                  className="rounded-full px-3 py-1 text-xs font-medium gap-1.5"
                >
                  {client.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 no-print">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        const next = client.status === "Active" ? "Inactive" : "Active";
                        updateClient(client.id, { status: next });
                        toast.success(`Client marked ${next}`);
                      }}
                    >
                      <Power className="h-4 w-4 mr-2" />
                      Mark {client.status === "Active" ? "Inactive" : "Active"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="border-t border-border/60" />

            {/* Body: 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
              {/* Left: contact */}
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="font-medium">{client.phone}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted-foreground/80 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-background" />
                    </div>
                    <span className="text-muted-foreground leading-snug">{client.address}</span>
                  </div>
                  {client.emergencyContact && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-destructive/80 flex items-center justify-center shrink-0">
                        <Contact className="h-4 w-4 text-destructive-foreground" />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Emergency</span>
                        <p className="text-muted-foreground leading-snug">{client.emergencyContact}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle: care plan */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold tracking-wider text-primary uppercase">
                    Care Plan
                  </span>
                </div>
                <div className="space-y-2">
                  {client.carePlan.map((task, idx) => {
                    const Icon = getTaskIcon(task);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-sm"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{task}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: rate + actions */}
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                  Rates & Settings
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-semibold text-foreground">RATE:</span>
                  <span className="text-3xl font-bold text-foreground">${client.hourlyRate}</span>
                  <span className="text-sm text-muted-foreground">/hr</span>
                </div>
                <div className="pt-1">
                  <Button variant="outline" className="w-full" onClick={() => openEditDialog(client)}>
                    Edit Plan
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}