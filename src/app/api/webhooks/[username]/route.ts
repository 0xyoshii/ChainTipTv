import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

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
    console.log('Webhook event:', { type, chargeId: data.id });

    let status: 'completed' | 'failed';
    switch (type) {
      case 'charge:confirmed':
        status = 'completed';
        break;
      case 'charge:failed':
        status = 'failed';
        break;
      default:
        return new NextResponse('OK', { status: 200 });
    }

    const { data: donations, error: findError } = await supabase
      .from('donations')
      .select('*')
      .eq('charge_id', data.id);

    console.log('Found donations:', donations);

    if (!donations?.length) {
      console.error('No donation found with charge_id:', data.id);
      return new NextResponse('Donation not found', { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('donations')
      .update({ status })
      .eq('charge_id', data.id);

    if (updateError) {
      console.error('Error updating donation:', updateError);
      return new NextResponse('Error updating donation', { status: 500 });
    }

    console.log('Successfully updated donation status to:', status);
    return new NextResponse('OK', { status: 200 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Webhook error:', errorMessage);
    return new NextResponse('Internal error', { status: 500 });
  }
} 