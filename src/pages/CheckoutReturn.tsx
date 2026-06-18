import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">You're all set!</h1>
        <p className="text-muted-foreground">
          {sessionId
            ? "Your payment method is on file and your free trial is now active. We'll only charge you when the trial ends."
            : "Returned from checkout."}
        </p>
        <Button asChild><Link to="/">Go to dashboard</Link></Button>
      </div>
    </div>
  );
}