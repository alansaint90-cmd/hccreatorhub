export function GET() {
  return new Response(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101010"><title>Sem conexão — HC Agency</title><style>body{margin:0;background:#101010;color:white;font:17px/1.6 system-ui,sans-serif;min-height:100dvh;display:grid;place-items:center}main{padding:32px;max-width:440px}img{width:72px;height:72px}h1{font-size:36px;line-height:1.1}p{color:#ddd}a{display:inline-block;background:#C7F000;color:#101010;padding:14px 22px;border-radius:12px;font-weight:700;text-decoration:none}a:focus-visible{outline:3px solid #F72585;outline-offset:5px}</style><main><img src="/icons/app-192.png" alt="HC Agency"><h1>Vamos nos reconectar.</h1><p>Você está sem conexão. Conecte-se à internet para acessar suas campanhas e parcerias com segurança.</p><a href="/?view=overview">Tentar novamente</a></main></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      },
    },
  );
}
