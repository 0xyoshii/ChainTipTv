'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabaseClient';
import { Textarea } from "@/components/ui/textarea";
import { createCharge } from '@/lib/coinbase';

interface Profile {
  id: string;
  username: string;
  coinbase_commerce_key: string | null;
}

export default function TipPage() {
  const params = useParams();
  const username = params.username as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    amount: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, coinbase_commerce_key')
        .eq('username', username)
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');
      if (!data.coinbase_commerce_key) throw new Error('User has not set up donations');
      
      setProfile(data);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.coinbase_commerce_key) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const charge = await createCharge(
        profile.coinbase_commerce_key,
        {
          name: `Donation from ${formData.name}`,
          description: formData.message,
          amount: formData.amount,
          currency: 'USD',
          username: profile.username
        }
      );

      const { error: dbError } = await supabase
        .from('donations')
        .insert({
          recipient_id: profile.id,
          charge_id: charge.data.id,
          donor_name: formData.name,
          message: formData.message,
          amount: formData.amount,
          currency: 'USD',
          status: 'pending'
        });

      if (dbError) throw dbError;

      window.location.href = charge.data.hosted_url;
    } catch (error: unknown) {
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to create donation. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">Support {profile?.username}</CardTitle>
          <CardDescription>
            Show your appreciation with a donation
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Leave a message..."
                  className="resize-none"
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    message: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="amount"
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      amount: e.target.value
                    }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum amount: $1.00
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Continue to Payment</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-arrow-right"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 