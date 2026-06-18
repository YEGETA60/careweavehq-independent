import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, AlertCircle, CheckCircle, Printer, Download } from "lucide-react";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { printPage } from "@/lib/print-utils";
import { downloadInvoicePdf, exportInvoicesCsv } from "@/lib/invoice-pdf";
import { toast } from "sonner";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";

export function BillingInvoicing() {
  const { invoices, clients, visits, generateInvoice, getVerifiedHours } = useHomeCareContext();

  const getStatusColor = (status: string) => {
    const colors = {
      Pending: "bg-warning/10 text-warning border-warning/20",
      Paid: "bg-success/10 text-success border-success/20",
      Overdue: "bg-destructive/10 text-destructive border-destructive/20"
    };
    return colors[status as keyof typeof colors] || colors.Pending;
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || "Unknown Client";
  };

  const getUnbilledVisits = () => {
    const billedVisitIds = invoices.flatMap(inv => inv.visits);
    return visits.filter(visit =>
      visit.status === "Completed" &&
      !billedVisitIds.includes(visit.id) &&
      getVerifiedHours(visit) > 0
    );
  };

  const generateInvoiceForClient = (clientId: string) => {
    const unbilledVisits = getUnbilledVisits().filter(v => v.clientId === clientId);
    if (unbilledVisits.length > 0) {
      generateInvoice(clientId, unbilledVisits.map(v => v.id));
    }
  };

  const getTotalRevenue = () => {
    return invoices.reduce((total, invoice) => total + invoice.amount, 0);
  };

  const getPendingAmount = () => {
    return invoices
      .filter(inv => inv.status === "Pending")
      .reduce((total, invoice) => total + invoice.amount, 0);
  };

  const unbilledVisits = getUnbilledVisits();
  const clientsWithUnbilledVisits = [...new Set(unbilledVisits.map(v => v.clientId))];

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <DollarSign className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-tour="billing-header">Billing & Invoicing</h1>
            <p className="text-muted-foreground">Automated billing with insurance and private pay support</p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={() => exportInvoicesCsv(invoices, clients)}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button variant="outline" size="sm" onClick={printPage}><Printer className="h-4 w-4 mr-2" />Print</Button>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getTotalRevenue()}</div>
            <p className="text-xs text-muted-foreground">All invoices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${getPendingAmount()}</div>
            <p className="text-xs text-muted-foreground">Outstanding invoices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unbilled Visits</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unbilledVisits.length}</div>
            <p className="text-xs text-muted-foreground">Ready for billing</p>
          </CardContent>
        </Card>
      </div>

      {/* Generate Invoices for Unbilled Visits */}
      {clientsWithUnbilledVisits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Invoices</CardTitle>
            <CardDescription>Clients with completed visits ready for billing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientsWithUnbilledVisits.map(clientId => {
                const client = clients.find(c => c.id === clientId);
                const clientUnbilledVisits = unbilledVisits.filter(v => v.clientId === clientId);
                const totalHours = clientUnbilledVisits.reduce(
                  (sum, v) => sum + getVerifiedHours(v),
                  0
                );
                const totalAmount = client ? totalHours * client.hourlyRate : 0;
                
                return (
                  <div key={clientId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{getClientName(clientId)}</p>
                      <p className="text-sm text-muted-foreground">
                        {clientUnbilledVisits.length} visits, {totalHours.toFixed(2)} hours - ${totalAmount.toFixed(2)}
                      </p>
                    </div>
                    <Button 
                      onClick={() => generateInvoiceForClient(clientId)}
                      size="sm"
                      data-tour="billing-generate-btn"
                    >
                      Generate Invoice
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Invoice #{invoice.id}</CardTitle>
                  <CardDescription>{getClientName(invoice.clientId)}</CardDescription>
                </div>
                <Badge className={getStatusColor(invoice.status)} variant="secondary">
                  {invoice.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount:</span>
                <span className="text-lg font-bold">${invoice.amount}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Due Date:</span>
                <span className="text-sm">{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Visits:</span>
                <span className="text-sm">{invoice.visits.length} visits</span>
              </div>

              <div className="flex space-x-2 pt-2 border-t no-print">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => downloadInvoicePdf(invoice, clients.find((c) => c.id === invoice.clientId), visits, getVerifiedHours)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={printPage}
                >
                  <Printer className="h-3 w-3 mr-1" />
                  Print
                </Button>
                {invoice.status === "Pending" && (
                  <Button size="sm" className="flex-1">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mark Paid
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}