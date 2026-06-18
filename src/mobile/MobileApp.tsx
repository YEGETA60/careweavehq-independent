import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "./components/BottomNav";
import { Today } from "./pages/Today";
import { VisitDetail } from "./pages/VisitDetail";
import { Schedule } from "./pages/Schedule";
import { Messages } from "./pages/Messages";
import { Me } from "./pages/Me";

export default function MobileApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth?redirect=/m/today" replace />;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Routes>
        <Route index element={<Navigate to="today" replace />} />
        <Route path="today" element={<Today />} />
        <Route path="visit/:id" element={<VisitDetail />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="messages" element={<Messages />} />
        <Route path="me" element={<Me />} />
        <Route path="*" element={<Navigate to="today" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}