import { useState } from "react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { LiveRoster } from "@/components/LiveRoster";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Clock, MapPin, User, UserCheck, Printer, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { printPage } from "@/lib/print-utils";
import { toast } from "sonner";

export function SchedulingVisits() {
  const { visits, clients, caregivers, scheduleVisit, clockIn, clockOut, deleteVisit } = useHomeCareContext();
  const [isScheduling, setIsScheduling] = useState(false);
  const [newVisit, setNewVisit] = useState({
    clientId: "",
    caregiverId: "",
    date: "",
    startTime: "",
    endTime: "",
    status: "Scheduled" as const,
    tasksCompleted: [] as string[]
  });

  const handleScheduleVisit = () => {
    scheduleVisit(newVisit);
    setIsScheduling(false);
    setNewVisit({
      clientId: "",
      caregiverId: "",
      date: "",
      startTime: "",
      endTime: "",
      status: "Scheduled",
      tasksCompleted: []
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      Scheduled: "bg-primary/10 text-primary border-primary/20",
      "In-Progress": "bg-warning/10 text-warning border-warning/20",
      Completed: "bg-success/10 text-success border-success/20",
      Cancelled: "bg-destructive/10 text-destructive border-destructive/20"
    };
    return colors[status as keyof typeof colors] || colors.Scheduled;
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || "Unknown Client";
  };

  const getCaregiverName = (caregiverId: string) => {
    return caregivers.find(c => c.id === caregiverId)?.name || "Unknown Caregiver";
  };

  const getMatchingCaregivers = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return caregivers;
    
    return caregivers.filter(caregiver => 
      caregiver.status === "Available" &&
      client.carePlan.some(task => 
        caregiver.skills.some(skill => 
          skill.toLowerCase().includes(task.toLowerCase()) || 
          task.toLowerCase().includes(skill.toLowerCase())
        )
      )
    );
  };

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <LiveRoster />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <Calendar className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scheduling & Visit Management</h1>
            <p className="text-muted-foreground">Intelligent scheduling with automated caregiver matching</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printPage} className="no-print">
            <Printer className="h-4 w-4 mr-2" />
            Print Schedule
          </Button>
          <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2" data-tour="scheduling-add-btn">
                <Plus className="h-4 w-4" />
                <span>Schedule Visit</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule New Visit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="client">Client</Label>
                <Select value={newVisit.clientId} onValueChange={(value) => setNewVisit(prev => ({ ...prev, clientId: value, caregiverId: "" }))}>
                  <SelectTrigger data-tour="scheduling-client-select">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.careLevel} Care
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {newVisit.clientId && (
                <div>
                  <Label htmlFor="caregiver">Recommended Caregivers</Label>
                  <Select value={newVisit.caregiverId} onValueChange={(value) => setNewVisit(prev => ({ ...prev, caregiverId: value }))}>
                    <SelectTrigger data-tour="scheduling-caregiver-select">
                      <SelectValue placeholder="Select caregiver" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMatchingCaregivers(newVisit.clientId).map(caregiver => (
                        <SelectItem key={caregiver.id} value={caregiver.id}>
                          {caregiver.name} - ${caregiver.hourlyWage}/hr
                          <div className="text-xs text-muted-foreground">
                            Skills: {caregiver.skills.join(", ")}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newVisit.date}
                  onChange={(e) => setNewVisit(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newVisit.startTime}
                    onChange={(e) => setNewVisit(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newVisit.endTime}
                    onChange={(e) => setNewVisit(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
              
              <Button onClick={handleScheduleVisit} className="w-full" disabled={!newVisit.clientId || !newVisit.caregiverId} data-tour="scheduling-save-btn">
                Schedule Visit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visits.map((visit) => (
          <Card key={visit.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{getClientName(visit.clientId)}</CardTitle>
                  <CardDescription className="flex items-center space-x-1">
                    <UserCheck className="h-3 w-3" />
                    <span>{getCaregiverName(visit.caregiverId)}</span>
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(visit.status)} variant="secondary">
                  {visit.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(visit.date).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{visit.startTime} - {visit.endTime}</span>
              </div>

              {visit.notes && (
                <div className="text-sm p-2 bg-muted/50 rounded border-l-2 border-primary">
                  <p className="font-medium text-foreground mb-1">Visit Notes:</p>
                  <p className="text-muted-foreground">{visit.notes}</p>
                </div>
              )}

              {visit.tasksCompleted.length > 0 && (
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Tasks Completed:</p>
                  <div className="flex flex-wrap gap-1">
                    {visit.tasksCompleted.map((task, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {task}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {visit.verificationStatus && visit.status === "Completed" && (
                <div className="flex items-center gap-2 text-xs">
                  {visit.verificationStatus === "Verified" ? (
                    <Badge className="bg-success/10 text-success border-success/20" variant="secondary">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  ) : visit.verificationStatus === "Manual-Override" ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20" variant="secondary">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Manual override
                    </Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning/20" variant="secondary">
                      <ShieldAlert className="h-3 w-3 mr-1" /> Flagged
                    </Badge>
                  )}
                  {visit.verifiedStartTime && visit.verifiedEndTime && (
                    <span className="text-muted-foreground">
                      Actual: {visit.verifiedStartTime}–{visit.verifiedEndTime}
                    </span>
                  )}
                </div>
              )}

              {visit.verificationIssues && visit.verificationIssues.length > 0 && (
                <div className="text-xs text-warning border-l-2 border-warning bg-warning/5 p-2 rounded">
                  {visit.verificationIssues.map((issue, idx) => (
                    <p key={idx}>• {issue}</p>
                  ))}
                </div>
              )}

              <div className="flex space-x-2 pt-2 border-t no-print">
                {visit.status === "Scheduled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        clockIn(visit.id, null);
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        pos => clockIn(visit.id, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
                        () => clockIn(visit.id, null),
                        { timeout: 5000 }
                      );
                    }}
                  >
                    Clock In
                  </Button>
                )}
                {visit.status === "In-Progress" && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        clockOut(visit.id, null);
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        pos => clockOut(visit.id, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
                        () => clockOut(visit.id, null),
                        { timeout: 5000 }
                      );
                    }}
                  >
                    Clock Out
                  </Button>
                )}
                {visit.status === "Completed" && visit.verificationStatus === "Flagged" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const reason = window.prompt("Reason for manual verification override?");
                      if (reason) clockOut(visit.id, null, reason);
                    }}
                  >
                    Manual Verify
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (window.confirm("Delete this visit? Any unpaid invoices will be recalculated.")) {
                      deleteVisit(visit.id);
                    }
                  }}
                  aria-label="Delete visit"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}