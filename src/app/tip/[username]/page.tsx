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
        <Card className="w-[380px]">
          <CardHeader>
            <CardTitle className="text-xl text-center text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Donation to @{username}</CardTitle>
          <CardDescription>
            Support {username} with a donation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                required
                placeholder="Your message"
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
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">
                {error}
              </p>
            )}

            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating donation...' : 'Donate'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 