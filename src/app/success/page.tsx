'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabaseClient';

interface DonationDetails {
  donor_name: string;
  amount: string;
  currency: string;
  recipient_username: string;
}

interface SupabaseDonation {
  donor_name: string;
  amount: string;
  currency: string;
  profiles: { username: string }[];
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [donation, setDonation] = useState<DonationDetails | null>(null);

  useEffect(() => {
    const chargeId = searchParams.get('charge');
    if (chargeId) {
      fetchDonationDetails(chargeId);
    }
  }, [searchParams]);

  const fetchDonationDetails = async (chargeId: string) => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select(`
          donor_name,
          amount,
          currency,
          profiles:recipient_id (username)
        `)
        .eq('charge_id', chargeId)
        .single();

      if (error) throw error;

      const typedData = data as SupabaseDonation;
      setDonation({
        donor_name: typedData.donor_name,
        amount: typedData.amount,
        currency: typedData.currency,
        recipient_username: typedData.profiles[0].username
      });
    } catch (error) {
      console.error('Error fetching donation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Donation not found</p>
              <Button onClick={() => window.location.href = '/'}>
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
          <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-500"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <CardTitle className="text-2xl">Thank You!</CardTitle>
          <CardDescription className="text-base">
            Your donation has been received
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {donation.donor_name}, you donated
              </p>
              <p className="text-3xl font-bold">
                ${Number(donation.amount).toFixed(2)} {donation.currency}
              </p>
              <p className="text-sm text-muted-foreground">
                to support @{donation.recipient_username}
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full" 
                onClick={() => window.location.href = `/tip/${donation.recipient_username}`}
              >
                Send Another Donation
              </Button>
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

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
} 