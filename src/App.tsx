import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Demo from "./pages/Demo";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Docs from "./pages/Docs";
import Auth from "./pages/Auth";

import ResetPassword from "./pages/ResetPassword";
import CheckoutReturn from "./pages/CheckoutReturn";
import AccountBilling from "./pages/AccountBilling";
import Legal from "./pages/Legal";
import Pricing from "./pages/Pricing";
import Features from "./pages/Features";

import PrivatePay from "./pages/PrivatePay";
import Resources from "./pages/Resources";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import MobileApp from "./mobile/MobileApp";
import { AuthProvider } from "./contexts/AuthContext";
import { SessionTimeout } from "./components/SessionTimeout";

const queryClient = new QueryClient();

function AppContent() {
  return (
    <>
      <SessionTimeout />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signin" element={<Auth />} />
        <Route path="/signup" element={<Auth initialMode="signup" />} />
        <Route path="/forgot-password" element={<Auth initialForgotOpen />} />
        <Route path="/forgot_password" element={<Auth initialForgotOpen />} />
        <Route path="/forgot" element={<Auth initialForgotOpen />} />
        <Route path="/recover-password" element={<Auth initialForgotOpen />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset_password" element={<ResetPassword />} />
        <Route path="/password-reset" element={<ResetPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/~oauth/*" element={<Navigate to="/auth" replace />} />
        
        
        <Route path="/m/*" element={<MobileApp />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/checkout/return" element={<CheckoutReturn />} />
        <Route path="/account/billing" element={<AccountBilling />} />
        <Route path="/billing" element={<Navigate to="/account/billing" replace />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/legal/:doc" element={<Legal />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/pricing/:persona" element={<Pricing />} />
        <Route path="/features" element={<Features />} />
        
        <Route path="/private-pay" element={<PrivatePay />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/about" element={<About />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/" element={<Index />} />
        <Route path="/index" element={<Navigate to="/" replace />} />
        <Route path="/Index" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
