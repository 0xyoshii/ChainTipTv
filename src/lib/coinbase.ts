export async function createCharge(apiKey: string, params: {
  name: string;
  description: string;
  amount: string;
  currency: string;
  username: string;
}) {
  const response = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': apiKey,
    },
    body: JSON.stringify({
      name: params.name,
      description: params.description,
      pricing_type: 'fixed_price',
      local_price: {
        amount: params.amount,
        currency: params.currency
      },
      redirect_url: `${window.location.origin}/success`,
      webhook_url: `${window.location.origin}/api/webhooks/${params.username}`
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create charge');
  }

  return response.json();
} 