/**
 * Cloudflare Worker — Amark.com HTML proxy
 * Deploy tại: https://dash.cloudflare.com -> Workers & Pages -> Create Worker
 * Free tier: 100,000 requests/day
 *
 * Cách deploy nhanh (không cần Wrangler CLI):
 * 1. Vào https://dash.cloudflare.com
 * 2. Workers & Pages -> Create -> Create Worker
 * 3. Paste toàn bộ nội dung file này vào editor
 * 4. Click "Deploy" -> copy URL (ví dụ: amark-proxy.your-name.workers.dev)
 * 5. Thêm vào .env.local: AMARK_PROXY_URL=https://amark-proxy.your-name.workers.dev
 */

export default {
  async fetch(request: Request): Promise<Response> {
    // Security: chỉ cho phép request từ domain của bạn
    const origin = request.headers.get('Origin') || ''
    const allowed = ['localhost:3000', 'your-app.vercel.app'] // đổi thành domain thật
    const isAllowed = allowed.some(d => origin.includes(d))

    // Fetch amark.com — cùng Cloudflare network nên không bị block
    const res = await fetch('https://www.amark.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    })

    const html = await res.text()

    return new Response(html, {
      status: res.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  },
}
