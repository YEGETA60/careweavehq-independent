import {
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { useMemo } from "react";

export function DashboardOverview() {
  const { clients, caregivers, visits, invoices } = useHomeCareContext();

  const todayStr = new Date().toISOString().split("T")[0];
  const monthStart = new Date();
  monthStart.setDate(1);

  const activeClients = clients.filter((c) => c.status === "Active").length;
  const activeCaregivers = caregivers.filter((c) => c.status !== "Off-Duty").length;
  const todayVisits = visits.filter((v) => v.date === todayStr);
  const todayCompletion = todayVisits.length
    ? Math.round(
        (todayVisits.filter((v) => v.status === "Completed").length / todayVisits.length) * 100,
      )
    : 0;
  const monthlyRevenue = invoices
    .filter((i) => new Date(i.dueDate) >= monthStart)
    .reduce((s, i) => s + i.amount, 0);

  const stats = [
    {
      title: "Active Clients",
      value: String(activeClients),
      change: `${clients.length} total`,
      trend: "up" as const,
      icon: Users,
      description: "Total active clients receiving care",
    },
    {
      title: "Active Caregivers",
      value: String(activeCaregivers),
      change: `${caregivers.length} on staff`,
      trend: "up" as const,
      icon: UserCheck,
      description: "Available caregivers on staff",
    },
    {
      title: "Today's Visits",
      value: String(todayVisits.length),
      change: `${todayCompletion}%`,
      trend: "neutral" as const,
      icon: Calendar,
      description: "Scheduled visits completion rate",
    },
    {
      title: "Monthly Revenue",
      value: `$${monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      change: `${invoices.filter((i) => i.status === "Paid").length} paid`,
      trend: "up" as const,
      icon: DollarSign,
      description: "Revenue for current month",
    },
  ];

  const recentActivity = useMemo(() => {
    const items: { message: string; time: string; status: "success" | "warning" | "alert" }[] = [];
    const recentVisits = [...visits]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6);
    for (const v of recentVisits) {
      const client = clients.find((c) => c.id === v.clientId);
      if (!client) continue;
      if (v.verificationStatus === "Flagged") {
        items.push({
          message: `Visit flagged: ${client.name} — ${(v.verificationIssues || [])[0] || "review needed"}`,
          time: v.date,
          status: "alert",
        });
      } else if (v.status === "Completed") {
        items.push({ message: `Visit completed: ${client.name}`, time: v.date, status: "success" });
      }
    }
    const recentInvoices = invoices.slice(0, 3);
    for (const inv of recentInvoices) {
      const client = clients.find((c) => c.id === inv.clientId);
      if (!client) continue;
      items.push({
        message:
          inv.status === "Paid"
            ? `Invoice paid: ${client.name} — $${inv.amount.toFixed(2)}`
            : `Invoice ${inv.status.toLowerCase()}: ${client.name} — $${inv.amount.toFixed(2)}`,
        time: inv.dueDate,
        status: inv.status === "Paid" ? "success" : inv.status === "Overdue" ? "alert" : "warning",
      });
    }
    return items.slice(0, 5);
  }, [visits, clients, invoices]);

  const upcomingTasks = useMemo(() => {
    const tasks: { task: string; priority: "high" | "medium" | "low"; due: string }[] = [];
    const overdueInvoices = invoices.filter((i) => i.status === "Overdue").length;
    if (overdueInvoices)
      tasks.push({
        task: `Follow up on ${overdueInvoices} overdue invoice${overdueInvoices > 1 ? "s" : ""}`,
        priority: "high",
        due: "Today",
      });
    const flagged = visits.filter((v) => v.verificationStatus === "Flagged").length;
    if (flagged)
      tasks.push({
        task: `Review ${flagged} flagged EVV visit${flagged > 1 ? "s" : ""}`,
        priority: "high",
        due: "Today",
      });
    const upcomingVisits = visits.filter(
      (v) => v.date >= todayStr && v.status === "Scheduled",
    ).length;
    if (upcomingVisits)
      tasks.push({
        task: `${upcomingVisits} upcoming visits to confirm`,
        priority: "medium",
        due: "This week",
      });
    const pendingInvoices = invoices.filter((i) => i.status === "Pending").length;
    if (pendingInvoices)
      tasks.push({
        task: `${pendingInvoices} invoices pending review`,
        priority: "medium",
        due: "This week",
      });
    return tasks.slice(0, 4);
  }, [visits, invoices, todayStr]);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary/10 to-accent/10 rounded-bl-3xl" />
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      {stat.title}
                    </CardTitle>
                  </div>
                  {stat.trend === "up" && (
                    <div className="hidden sm:flex items-center space-x-1 text-success shrink-0">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs font-medium">{stat.change}</span>
                    </div>
                  )}
                  {stat.trend === "neutral" && (
                    <div className="hidden sm:block text-xs font-medium text-muted-foreground shrink-0">{stat.change}</div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Latest updates across your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                <div className={`p-1 rounded-full ${
                  activity.status === "success" ? "bg-success/20" :
                  activity.status === "warning" ? "bg-warning/20" :
                  "bg-destructive/20"
                }`}>
                  {activity.status === "success" && <CheckCircle className="h-3 w-3 text-success" />}
                  {activity.status === "warning" && <Clock className="h-3 w-3 text-warning" />}
                  {activity.status === "alert" && <AlertTriangle className="h-3 w-3 text-destructive" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View All Activity
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Upcoming Tasks</span>
            </CardTitle>
            <CardDescription>Important tasks requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingTasks.map((task, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{task.task}</p>
                  <p className="text-xs text-muted-foreground">{task.due}</p>
                </div>
                <Badge variant={
                  task.priority === "high" ? "destructive" :
                  task.priority === "medium" ? "default" :
                  "secondary"
                }>
                  {task.priority}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              View All Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}