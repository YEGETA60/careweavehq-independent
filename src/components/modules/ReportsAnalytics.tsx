import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, Download, FileText, RefreshCw } from "lucide-react";
import { exportInvoicesCsv, exportVisitsCsv } from "@/lib/invoice-pdf";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export function ReportsAnalytics() {
  const { visits, invoices, clients, caregivers, getVerifiedHours, loading, refresh } = useHomeCareContext();

  const stats = useMemo(() => {
    const completed = visits.filter((v) => v.status === "Completed");
    const verified = completed.filter((v) => v.verificationStatus === "Verified" || v.verificationStatus === "Manual-Override");
    const totalHours = completed.reduce((s, v) => s + getVerifiedHours(v), 0);
    const revenue = invoices.reduce((s, i) => s + i.amount, 0);
    const outstanding = invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + i.amount, 0);
    const evvCompliance = completed.length ? (verified.length / completed.length) * 100 : 0;
    return { completed: completed.length, totalHours, revenue, outstanding, evvCompliance, missed: visits.filter((v) => v.status === "Cancelled").length };
  }, [visits, invoices, getVerifiedHours]);

  const utilization = useMemo(() => {
    return caregivers.map((c) => {
      const hrs = visits.filter((v) => v.caregiverId === c.id).reduce((s, v) => s + getVerifiedHours(v), 0);
      return { name: c.name.split(" ")[0], hours: +hrs.toFixed(1) };
    });
  }, [caregivers, visits, getVerifiedHours]);

  const revenueByClient = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach((i) => map.set(i.clientId, (map.get(i.clientId) ?? 0) + i.amount));
    return Array.from(map.entries()).map(([cid, amt]) => ({ name: clients.find((c) => c.id === cid)?.name ?? "?", value: +amt.toFixed(2) }));
  }, [invoices, clients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg"><BarChart3 className="h-6 w-6 text-primary-foreground" /></div>
          <div><h1 className="text-2xl font-bold">Reports & Analytics</h1><p className="text-muted-foreground">KPIs, EVV compliance, revenue & utilization</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportVisitsCsv(visits, clients, getVerifiedHours)}><Download className="h-4 w-4 mr-2" />Visits CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportInvoicesCsv(invoices, clients)}><Download className="h-4 w-4 mr-2" />Invoices CSV</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 motion-safe:stagger-children">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </CardContent>
              </Card>
            ))
          : (
            <>
              <Kpi label="Completed Visits" value={stats.completed} />
              <Kpi label="Verified Hours" value={stats.totalHours.toFixed(1)} />
              <Kpi label="Revenue" value={`$${stats.revenue.toFixed(0)}`} />
              <Kpi label="Outstanding" value={`$${stats.outstanding.toFixed(0)}`} />
              <Kpi label="EVV Compliance" value={`${stats.evvCompliance.toFixed(0)}%`} />
              <Kpi label="Cancelled" value={stats.missed} />
            </>
          )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 motion-safe:stagger-children">
        <Card>
          <CardHeader><CardTitle>Caregiver Utilization</CardTitle><CardDescription>Verified hours per caregiver</CardDescription></CardHeader>
          <CardContent style={{ height: 280 }}>
            {loading ? (
              <ChartSkeleton variant="bar" />
            ) : (
              <ResponsiveContainer><BarChart data={utilization}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="hours" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue by Client</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            {loading ? (
              <ChartSkeleton variant="pie" />
            ) : (
              <ResponsiveContainer><PieChart><Pie data={revenueByClient} dataKey="value" nameKey="name" outerRadius={90}>
                {revenueByClient.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-bold">{value}</div></CardContent></Card>
  );
}

function ChartSkeleton({ variant }: { variant: "bar" | "pie" }) {
  if (variant === "pie") {
    return (
      <div className="h-full w-full flex items-center justify-center gap-6">
        <Skeleton className="h-44 w-44 rounded-full" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-sm" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  const heights = [55, 78, 40, 90, 62, 48, 72];
  return (
    <div className="h-full w-full flex items-end justify-around gap-3 px-2 pb-6 pt-2">
      {heights.map((h, i) => (
        <Skeleton key={i} className="w-8 rounded-t-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}