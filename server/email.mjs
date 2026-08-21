import { Resend } from 'resend'

let clientState = null
const productionRuntime = () => process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT)

export function emailConfigured() {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim()
  const from = String(process.env.RESEND_FROM || '').trim()
  return Boolean(apiKey && (from || !productionRuntime()))
}

function emailClient() {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim()
  if (!apiKey) throw Object.assign(new Error('Email delivery is not configured.'), { statusCode: 503 })
  if (!clientState || clientState.apiKey !== apiKey) clientState = { apiKey, client: new Resend(apiKey) }
  return clientState.client
}

function sender() {
  const configured = String(process.env.RESEND_FROM || '').trim()
  if (configured) return configured
  if (!productionRuntime()) return 'Mere X <onboarding@resend.dev>'
  throw Object.assign(new Error('RESEND_FROM is not configured.'), { statusCode: 503 })
}

function codeMarkup(code, purpose) {
  const heading = purpose === 'signup' ? 'Verify your Mere X account' : purpose === 'password_change' ? 'Confirm your password change' : 'Reset your Mere X password'
  const explanation = purpose === 'signup'
    ? 'Enter this code to finish creating your Mere X workspace.'
    : purpose === 'password_change'
      ? 'Enter this code in Security and login to confirm your new password.'
      : 'Enter this code to choose a new password for your Mere X account.'
  return `<!doctype html><html><body style="margin:0;background:#080808;color:#efefec;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080808"><tr><td align="center" style="padding:40px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #2d2d2d;border-radius:18px;background:#101010"><tr><td style="padding:34px"><div style="font-size:14px;font-weight:700;letter-spacing:.08em">MERE X</div><h1 style="margin:42px 0 12px;font-family:Georgia,serif;font-size:30px;font-weight:400">${heading}</h1><p style="margin:0;color:#999;line-height:1.65">${explanation}</p><div style="margin:28px 0;padding:20px;border:1px solid #373737;border-radius:12px;background:#0a0a0a;text-align:center;font-family:monospace;font-size:34px;font-weight:700;letter-spacing:.22em">${code}</div><p style="margin:0;color:#777;font-size:13px;line-height:1.6">This code expires in 10 minutes and can be used once. If you did not request it, you can safely ignore this email.</p></td></tr></table></td></tr></table></body></html>`
}

export async function sendAccountCode({ to, code, purpose, challengeId }) {
  const subject = purpose === 'signup' ? `${code} is your Mere X verification code` : purpose === 'password_change' ? `${code} confirms your Mere X password change` : `${code} is your Mere X password reset code`
  const { data, error } = await emailClient().emails.send({
    from: sender(),
    to: [String(to)],
    subject,
    html: codeMarkup(code, purpose),
    text: `${subject}\n\nThis code expires in 10 minutes and can be used once.`,
  }, { idempotencyKey: `mere-x-${purpose}-${challengeId}` })
  if (error || !data?.id) {
    const failure = new Error(error?.message || 'Email delivery failed.')
    failure.statusCode = 502
    throw failure
  }
  return { id: data.id }
}
