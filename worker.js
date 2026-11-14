// HackSphere Cloudflare Worker — source assembled by build.mjs and Cloudflare deployment.
const HTML = __HTML_JSON__;
const CSS = __CSS_JSON__;
const APP = __APP_JSON__;
const baseHeaders = {"x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(),microphone=(),geolocation=()"};
function respond(body,type,cache="no-store",status=200){return new Response(body,{status,headers:{...baseHeaders,"content-type":type,"cache-control":cache}})}
export default {
 async fetch(request,env){
   const url=new URL(request.url),path=url.pathname;
   if(path==="/api/health")return Response.json({name:"HackSphere",status:"ok",databaseConfigured:!!(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY)},{headers:{"cache-control":"no-store"}});
   if(path==="/api/config")return Response.json({supabaseUrl:env.SUPABASE_URL||"",supabasePublishableKey:env.SUPABASE_PUBLISHABLE_KEY||""},{headers:{"cache-control":"no-store"}});
   if(path==="/assets/style.css")return respond(CSS,"text/css; charset=utf-8","public, max-age=300");
   if(path==="/assets/app.js")return respond(APP,"application/javascript; charset=utf-8","public, max-age=300");
   if(path.startsWith("/api/join/"))return Response.json({error:"Google Meet OAuth integration is not configured"},{status:503,headers:{"cache-control":"no-store"}});
   if(path.startsWith("/api/"))return Response.json({error:"Unknown API route"},{status:404,headers:{"cache-control":"no-store"}});
   if(request.method!=="GET"&&request.method!=="HEAD")return respond("Method Not Allowed","text/plain", "no-store",405);
   return respond(request.method==="HEAD"?null:HTML,"text/html; charset=utf-8");
 }
};