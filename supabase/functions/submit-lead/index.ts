import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': 'https://coremkt.github.io',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: CORS });
  }

  const cfToken = body.cf_token as string | undefined;
  const cfSecret = Deno.env.get('CF_TURNSTILE_SECRET');

  // Só verifica com Cloudflare se o token foi enviado
  // Sem token = Turnstile não carregou (rede lenta/VPN) → confia no C3 do cliente
  // Token presente mas inválido = tentativa de bypass → bloqueia silenciosamente
  if (cfToken && cfSecret) {
    const formData = new FormData();
    formData.append('secret', cfSecret);
    formData.append('response', cfToken);
    formData.append('remoteip', req.headers.get('x-forwarded-for') ?? '');

    const cfRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const cfJson = await cfRes.json() as { success: boolean };

    if (!cfJson.success) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  }

  // Sem token OU token válido — insere o lead
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { cf_token: _drop, ...leadData } = body;
  const { error } = await supabase.from('leads').insert(leadData);

  if (error) {
    console.error('Insert error:', error.message);
    return new Response('DB error', { status: 500, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
