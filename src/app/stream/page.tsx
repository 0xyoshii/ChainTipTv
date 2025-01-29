'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/supabaseClient';
import { formatDistance } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface Donation {
  id: string;
  donor_name: string;
  message: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export default function StreamPage() {
  useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<Donation[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedDonations = {
    completed: donations.filter(d => d.status === 'completed'),
    pending: donations.filter(d => d.status === 'pending'),
    failed: donations.filter(d => d.status === 'failed')
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="h-[64px] border-b flex items-center px-6">
        <div className="max-w-7xl w-full mx-auto">
          <h1 className="text-xl font-semibold">Donation History</h1>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Completed Donations */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Completed
              <span className="text-sm font-normal text-muted-foreground">
                ({groupedDonations.completed.length})
              </span>
            </h2>
            {groupedDonations.completed.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </div>

          {/* Pending Donations */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Pending
              <span className="text-sm font-normal text-muted-foreground">
                ({groupedDonations.pending.length})
              </span>
            </h2>
            {groupedDonations.pending.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </div>

          {/* Failed Donations */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Failed
              <span className="text-sm font-normal text-muted-foreground">
                ({groupedDonations.failed.length})
              </span>
            </h2>
            {groupedDonations.failed.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DonationCard({ donation }: { donation: Donation }) {
  return (
    <Card className="border border-border/50">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <p className="font-medium truncate">
              {donation.donor_name}
            </p>
            <p className="font-medium text-sm whitespace-nowrap">
              ${Number(donation.amount).toFixed(2)} {donation.currency}
            </p>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {donation.message}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {formatDistance(new Date(donation.created_at), new Date(), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 