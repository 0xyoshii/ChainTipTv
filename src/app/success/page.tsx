'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
            <span className="text-2xl">🎉</span>
          </div>
          <CardTitle className="text-2xl">Thank You!</CardTitle>
          <CardDescription className="text-base">
            Your donation has been received 🙏
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                We'll process your donation shortly ⚡️
              </p>
              <p className="text-sm text-muted-foreground">
                You'll receive a confirmation email once completed
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/'}
              >
                Return Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 