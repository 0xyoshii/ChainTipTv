import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabaseClient';

async function verifySignature(payload: string, signature: string, secret: string) {
  const hmac = createHmac('sha256', secret);
  const computedSignature = hmac.update(payload).digest('hex');
  return computedSignature === signature;
}


export async function POST(
  request: NextRequest,
  { params } : { params: Promise<{ username: string }> }
): Promise<NextResponse> {
  try {
    const signature = request.headers.get('x-cc-webhook-signature');
    if (!signature) {
      return new NextResponse('No signature', { status: 401 });
    }

    const payload = await request.text();
    const { username } = await params;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, webhook_secret')
      .eq('username', username)
      .single();

    if (profileError || !profile?.webhook_secret) {
      return new NextResponse('User not found', { status: 404 });
    }

    const isValid = await verifySignature(payload, signature, profile.webhook_secret);
    if (!isValid) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const webhookData = JSON.parse(payload);
    const { type, data } = webhookData.event;

    let status: 'pending' | 'completed' | 'failed';
    switch (type) {
      case 'charge:pending':
        status = 'pending';
        break;
      case 'charge:confirmed':
        status = 'completed';
        break;
      case 'charge:failed':
        status = 'failed';
        break;
      default:
        return new NextResponse('OK', { status: 200 });
    }

    // Log the current state
    const { data: currentDonation } = await supabase
      .from('donations')
      .select('*')
      .eq('charge_id', data.id)
      .single();
    
    console.log('Current donation state:', currentDonation);
    console.log('Attempting update with:', {
      status,
      charge_id: data.id,
      recipient_id: profile.id
    });

    const { data: updatedData, error: updateError } = await supabase
      .from('donations')
      .update({ status })
      .eq('charge_id', data.id)
      .eq('recipient_id', profile.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating donation:', updateError);
      return new NextResponse('Error updating donation', { status: 500 });
    }

    console.log('Updated donation:', updatedData);
    return new NextResponse('OK', { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Webhook error:', errorMessage);
    return new NextResponse('Internal error', { status: 500 });
  }
} 