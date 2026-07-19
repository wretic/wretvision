// ============================================================
// Response Helpers
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://wretvision.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function jsonOk(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function corsPreflightResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
