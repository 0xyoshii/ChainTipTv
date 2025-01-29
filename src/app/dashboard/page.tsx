'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Separator } from "@/components/ui/separator";
import { formatDistance } from 'date-fns';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface Profile {
  username: string;
  email: string;
  coinbase_commerce_key: string | null;
  webhook_secret: string | null;
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

interface DonationStats {
  totalCount: number;
  totalAmount: number;
  completedCount: number;
  completedAmount: number;
}

export default function Dashboard() {
  const { isLoading: isAuthLoading } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [commerceKey, setCommerceKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [error, setError] = useState('');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<DonationStats>({
    totalCount: 0,
    totalAmount: 0,
    completedCount: 0,
    completedAmount: 0
  });
  const [editingField, setEditingField] = useState<'api_key' | 'webhook_secret' | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading) {
      fetchProfile();
      fetchDonations();
    }
  }, [isAuthLoading]);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, email, coinbase_commerce_key, webhook_secret')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile(profile);
      setCommerceKey(profile.coinbase_commerce_key || '');
      setWebhookSecret(profile.webhook_secret || '');
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
      
      const donations = data || [];
      setDonations(donations);

      const stats = donations.reduce((acc, donation) => {
        acc.totalCount++;
        acc.totalAmount += Number(donation.amount);
        
        if (donation.status === 'completed') {
          acc.completedCount++;
          acc.completedAmount += Number(donation.amount);
        }
        return acc;
      }, {
        totalCount: 0,
        totalAmount: 0,
        completedCount: 0,
        completedAmount: 0
      });

      setStats(stats);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const handleUpdateCommerceKey = async () => {
    try {
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const updateData = editingField === 'api_key' 
        ? { coinbase_commerce_key: commerceKey }
        : { webhook_secret: webhookSecret };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setIsEditing(false);
      setEditingField(null);
      fetchProfile();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (field: 'api_key' | 'webhook_secret') => {
    setIsEditing(true);
    setEditingField(field);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingField(null);
    setCommerceKey(profile?.coinbase_commerce_key || '');
    setWebhookSecret(profile?.webhook_secret || '');
    setError('');
  };

  const renderEditForm = () => {
    const isApiKey = editingField === 'api_key';
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            {isApiKey ? 'API Key' : 'Webhook Secret'}
          </label>
          <Input
            type="text"
            value={isApiKey ? commerceKey : webhookSecret}
            onChange={(e) => isApiKey 
              ? setCommerceKey(e.target.value)
              : setWebhookSecret(e.target.value)
            }
            placeholder={`Enter your ${isApiKey ? 'Coinbase Commerce API Key' : 'Webhook Secret'}`}
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
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  if (isAuthLoading || loading) {
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
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Message */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, {profile?.username}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your donations
            </p>
          </div>
          <Button 
            onClick={() => router.push('/stream')}
            className="gap-2"
          >
            <span>Donations Stream</span>
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
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Donations
                </p>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.totalCount}
                  </p>
                  <div className="flex gap-2 items-center mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {stats.completedCount} completed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      {donations.filter(d => d.status === 'pending').length} pending
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      {donations.filter(d => d.status === 'failed').length} failed
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </p>
                <div>
                  <p className="text-2xl font-bold">
                    ${stats.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${stats.completedAmount.toFixed(2)} completed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </p>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.totalCount ? Math.round((stats.completedCount / stats.totalCount) * 100) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.completedCount} of {stats.totalCount} donations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Average Donation
                </p>
                <div>
                  <p className="text-2xl font-bold">
                    ${stats.completedCount ? (stats.completedAmount / stats.completedCount).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    from completed donations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                    <CardContent className="p-6 space-y-6">
                      {/* API Key section */}
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
                                onClick={() => handleEdit('api_key')}
                              >
                                Change
                              </Button>
                            </div>
                          </dd>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your Coinbase Commerce API key is used to process payments. Get it from{' '}
                          <a 
                            href="https://beta.commerce.coinbase.com/settings/security" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary underline hover:text-primary/80"
                          >
                            Coinbase Commerce Settings
                          </a>
                          . Keep this key secure.
                        </p>
                      </div>

                      <Separator />

                      {/* Webhook Secret section */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:gap-4">
                          <dt className="text-sm font-medium text-muted-foreground sm:w-[180px]">
                            Webhook Secret
                          </dt>
                          <dd className="text-sm mt-1 sm:mt-0 flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                {profile?.webhook_secret ? (
                                  <code className="text-xs bg-muted px-3 py-1.5 rounded-md">
                                    {profile.webhook_secret.replace(/./g, '•')}
                                  </code>
                                ) : (
                                  <span className="text-muted-foreground">
                                    No webhook secret set
                                  </span>
                                )}
                              </div>
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit('webhook_secret')}
                              >
                                Change
                              </Button>
                            </div>
                          </dd>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your webhook secret is used to verify Coinbase Commerce notifications. Get it from{' '}
                          <a 
                            href="https://beta.commerce.coinbase.com/settings/notifications" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary underline hover:text-primary/80"
                          >
                            Coinbase Commerce Notifications
                          </a>
                          . Keep this secret secure.
                        </p>
                      </div>

                      {/* Edit Form */}
                      {isEditing && (
                        <>
                          <Separator />
                          {renderEditForm()}
                        </>
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Recent Donations</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/stream')}
                >
                  View All
                </Button>
              </div>
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