import { useState } from "react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Download, Clock, CheckCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { printPage } from "@/lib/print-utils";

export function PayrollPayments() {
  const { caregivers, visits } = useHomeCareContext();
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  const calculateCaregiverPayroll = (caregiverId: string) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    if (!caregiver) return { hours: 0, amount: 0, visits: 0 };

    // Only verified visits count toward payroll
    const caregiverVisits = visits.filter(
      v => v.caregiverId === caregiverId &&
        v.status === "Completed" &&
        (v.verificationStatus === "Verified" || v.verificationStatus === "Manual-Override")
    );

    const totalHours = caregiverVisits.reduce((sum, visit) => {
      const start = visit.verifiedStartTime || visit.startTime;
      const end = visit.verifiedEndTime || visit.endTime;
      const [sh, sm] = start.split(":").map(Number);
      const [eh, em] = end.split(":").map(Number);
      const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
      return sum + Math.max(0, hours);
    }, 0);

    return {
      hours: totalHours,
      amount: totalHours * caregiver.hourlyWage,
      visits: caregiverVisits.length,
    };
  };

  const handleProcessPayroll = (caregiverId: string) => {
    const caregiver = caregivers.find(c => c.id === caregiverId);
    toast.success(`Payroll processed for ${caregiver?.name}`, {
      description: "Payment will be processed via direct deposit"
    });
  };

  const handleExportPayroll = () => {
    toast.success("Payroll report exported", {
      description: "Downloaded payroll summary for the selected period"
    });
  };

  const totalPayrollAmount = caregivers.reduce((total, caregiver) => {
    return total + calculateCaregiverPayroll(caregiver.id).amount;
  }, 0);

  const totalHours = caregivers.reduce((total, caregiver) => {
    return total + calculateCaregiverPayroll(caregiver.id).hours;
  }, 0);

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground text-center sm:text-left">Payroll & Caregiver Payments</h2>
          <p className="text-muted-foreground mt-1">
            Automated payroll processing based on verified visits
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Period</SelectItem>
              <SelectItem value="last">Last Period</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportPayroll} variant="outline" className="no-print">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button onClick={printPage} variant="outline" className="no-print">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="stat-value">${totalPayrollAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">For {selectedPeriod} period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="stat-value">{totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Verified visit hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caregivers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="stat-value">{caregivers.length}</div>
            <p className="text-xs text-muted-foreground">Active payroll accounts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Caregiver Payroll Summary</CardTitle>
          <CardDescription>
            Automated calculation based on completed and verified visits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caregiver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead className="text-right">Hours Worked</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caregivers.map((caregiver) => {
                const payroll = calculateCaregiverPayroll(caregiver.id);
                return (
                  <TableRow key={caregiver.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{caregiver.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {caregiver.certifications.join(", ")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={caregiver.status === "Available" ? "default" : "secondary"}>
                        {caregiver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>${caregiver.hourlyWage}/hr</TableCell>
                    <TableCell className="text-right">{payroll.hours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{payroll.visits}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${payroll.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right no-print">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            toast.success("Pay stub printed");
                            printPage();
                          }}
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Print Stub
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleProcessPayroll(caregiver.id)}
                          disabled={payroll.amount === 0}
                        >
                          Process Payment
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
