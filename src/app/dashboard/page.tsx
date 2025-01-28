'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { formatDistance } from 'date-fns';

interface Profile {
  username: string;
  email: string;
  coinbase_commerce_key: string | null;
}

interface Donation {
  id: string;
  donor_name: string;
  message: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [commerceKey, setCommerceKey] = useState('');
  const [error, setError] = useState('');
  const [donations, setDonations] = useState<Donation[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    fetchDonations();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, email, coinbase_commerce_key')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile(profile);
      setCommerceKey(profile.coinbase_commerce_key || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const handleUpdateCommerceKey = async () => {
    try {
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coinbase_commerce_key: commerceKey })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setIsEditing(false);
      fetchProfile(); // Refresh profile data
    } catch (err: any) {
      setError(err.message);
    }
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
          <h1 className="text-xl font-semibold">Account Settings</h1>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-10">
          {/* Left Column - Profile Settings */}
          <div className="space-y-8">
            <Card className="border-none shadow-none bg-transparent">
              <CardHeader className="px-0">
                <CardTitle className="text-2xl">Profile</CardTitle>
                <CardDescription>
                  Manage your account settings and Coinbase Commerce integration
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-8">
                {/* Profile Information */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Personal Information</h3>
                  <Card>
                    <CardContent className="p-6">
                      <dl className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:gap-4">
                          <dt className="text-sm font-medium text-muted-foreground sm:w-[180px]">
                            Username
                          </dt>
                          <dd className="text-sm mt-1 sm:mt-0">
                            {profile?.username}
                          </dd>
                        </div>
                        <Separator />
                        <div className="flex flex-col sm:flex-row sm:gap-4">
                          <dt className="text-sm font-medium text-muted-foreground sm:w-[180px]">
                            Email address
                          </dt>
                          <dd className="text-sm mt-1 sm:mt-0">
                            {profile?.email}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                {/* Coinbase Commerce Key */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Coinbase Commerce</h3>
                  <Card>
                    <CardContent className="p-6">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                              API Key
                            </label>
                            <Input
                              type="text"
                              value={commerceKey}
                              onChange={(e) => setCommerceKey(e.target.value)}
                              placeholder="Enter your Coinbase Commerce API Key"
                              className="max-w-xl"
                            />
                            {error && (
                              <p className="text-sm text-destructive">{error}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateCommerceKey}>
                              Save changes
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setIsEditing(false);
                                setCommerceKey(profile?.coinbase_commerce_key || '');
                                setError('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row sm:gap-4">
                            <dt className="text-sm font-medium text-muted-foreground sm:w-[180px]">
                              API Key
                            </dt>
                            <dd className="text-sm mt-1 sm:mt-0 flex-1">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  {profile?.coinbase_commerce_key ? (
                                    <code className="text-xs bg-muted px-3 py-1.5 rounded-md">
                                      {profile.coinbase_commerce_key.replace(/./g, '•')}
                                    </code>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      No API key set
                                    </span>
                                  )}
                                </div>
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setIsEditing(true)}
                                >
                                  Change
                                </Button>
                              </div>
                            </dd>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Your Coinbase Commerce API key is used to process payments. Keep this key secure and never share it publicly.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Donations */}
          <div className="lg:border-l lg:pl-10">
            <div className="sticky top-6">
              <h2 className="text-2xl font-semibold mb-6">Recent Donations</h2>
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 scrollbar-thin">
                {donations.length === 0 ? (
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-center text-muted-foreground">
                        No donations received yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  donations.map((donation) => (
                    <Card key={donation.id} className="border border-border/50">
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
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              donation.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                              donation.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                              'bg-yellow-500/10 text-yellow-500'
                            }`}>
                              {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 