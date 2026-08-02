import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SB_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SB_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FB_PIXEL   = Deno.env.get('FB_PIXEL_ID') ?? ''
const FB_TOKEN   = Deno.env.get('FB_CAPI_TOKEN') ?? ''

async function sendFbEvent(email: string, eventName: string, utms: Record<string, string>) {
  if (!FB_PIXEL || !FB_TOKEN) return

  const hashedEmail = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(email.toLowerCase().trim())
  ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join(''))

  await fetch(`https://graph.facebook.com/v21.0/${FB_PIXEL}/events?access_token=${FB_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: { em: [hashedEmail] },
        custom_data: utms
      }]
    })
  }).catch(() => {})
}

Deno.serve(async (req) => {
  if (req.method === 'GET') return new Response('ok', { status: 200 })
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  let body: any
  try { body = await req.json() } catch { return new Response('invalid json', { status: 400 }) }

  const event   = body.event
  const payload = body.payload

  if (!event || !payload) return new Response('ignored', { status: 200 })

  const isCreated  = event === 'invitee.created'
  const isCanceled = event === 'invitee.canceled'
  if (!isCreated && !isCanceled) return new Response('ignored', { status: 200 })

  const email   = payload?.invitee?.email?.toLowerCase?.() ?? ''
  const nome    = payload?.invitee?.name ?? ''
  const startAt = payload?.event?.start_time ?? null

  // UTMs vêm do tracking_context do Calendly (se configurado) ou das custom questions
  const tracking = payload?.tracking ?? {}
  const utms: Record<string, string> = {
    utm_source:   tracking.utm_source   ?? '',
    utm_medium:   tracking.utm_medium   ?? '',
    utm_campaign: tracking.utm_campaign ?? '',
    utm_content:  tracking.utm_content  ?? '',
    utm_term:     tracking.utm_term     ?? '',
  }

  if (!email) return new Response('no email', { status: 200 })

  const sb = createClient(SB_URL, SB_KEY)

  // Busca lead mais recente com esse email
  const { data: leads, error } = await sb
    .from('leads')
    .select('id, session_id, status, quiz_id')
    .ilike('email', email)
    .order('criado_em', { ascending: false })
    .limit(1)

  if (error) return new Response('db error: ' + error.message, { status: 500 })

  const lead = leads?.[0]

  if (lead) {
    const novoStatus = isCreated ? 'call_agendada' : 'contatado'
    const stepName   = isCreated ? 'agendamento'   : 'agendamento_cancelado'

    await sb.from('leads').update({
      status: novoStatus,
      atualizado_em: new Date().toISOString()
    }).eq('id', lead.id)

    await sb.from('eventos').insert({
      quiz_id:    lead.quiz_id ?? 'quiz-imob',
      session_id: lead.session_id,
      step:       stepName,
      step_index: isCreated ? 17 : 18
    })

    // Facebook CAPI — server-side, sem dependência de pixel no browser
    if (isCreated && email) {
      await sendFbEvent(email, 'Schedule', utms)
    }
  }

  // Log para debug (lead encontrado ou não)
  await sb.from('eventos').insert({
    quiz_id:    'calendly-log',
    session_id: email,
    step:       event,
    step_index: lead ? 1 : 0
  })

  return new Response(JSON.stringify({ ok: true, lead_found: !!lead }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
})
