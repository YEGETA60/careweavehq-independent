import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  comingSoon?: boolean;
}

export function ModulePlaceholder({ 
  title, 
  description, 
  icon: Icon, 
  features, 
  comingSoon = false 
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        {comingSoon && (
          <Badge variant="secondary" className="text-sm">
            Coming Soon
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Overview</CardTitle>
          <CardDescription>
            This module will provide comprehensive functionality for {title.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Key Features</h3>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed border-border">
                <p className="text-sm text-muted-foreground text-center">
                  {comingSoon 
                    ? "This module is currently in development and will be available soon."
                    : "Interactive interface will be implemented here with full CRUD operations and real-time updates."
                  }
                </p>
              </div>
              {!comingSoon && (
                <div className="flex space-x-2">
                  <Button className="flex-1">
                    Get Started
                  </Button>
                  <Button variant="outline" className="flex-1">
                    View Documentation
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}