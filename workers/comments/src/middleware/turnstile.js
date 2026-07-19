// ============================================================
// Cloudflare Turnstile Verification
// ============================================================
// Every POST (comment, reply, report) must include a valid
// Turnstile token in the request body field: cf_turnstile_response
// ============================================================

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token, secretKey, ip) {
  if (!token) {
    return { success: false, error: 'Missing Turnstile token.' };
  }

  const body = new URLSearchParams({
    secret:   secretKey,
    response: token,
    remoteip: ip,
  });

  let result;
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    result = await res.json();
  } catch {
    return { success: false, error: 'Turnstile verification request failed.' };
  }

  if (!result.success) {
    return { success: false, error: 'Human verification failed. Please try again.' };
  }

  return { success: true };
}
