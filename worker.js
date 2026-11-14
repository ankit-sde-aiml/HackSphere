// HackSphere Cloudflare Worker. build.mjs replaces the HTML placeholder at deploy time.
const PAGE = __HTML_JSON__;
const headers = {'content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','x-frame-options':'DENY','cache-control':'no-store'};
export default {
 async fetch(req, env) {
  const url = new URL(req.url);
  if (url.pathname==='/api/health') return Response.json({service:'HackSphere',status:'ok',authConfigured:!!(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY)});
  if (url.pathname==='/api/config') return Response.json({supabaseUrl:env.SUPABASE_URL||'',supabasePublishableKey:env.SUPABASE_PUBLISHABLE_KEY||''},{headers:{'cache-control':'no-store','access-control-allow-origin':url.origin}});
  if (url.pathname.startsWith('/api/')) return Response.json({error:'Endpoint not configured or unavailable'},{status:503});
  if (req.method!=='GET'&&req.method!=='HEAD') return new Response('Method not allowed',{status:405});
  return new Response(req.method==='HEAD'?null:PAGE,{headers});
 }
};