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
   if(path==="/favicon.svg")return respond('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#12c4ae"/><stop offset="1" stop-color="#087e7b"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><path d="M35 7 16 35h15l-5 22 22-32H33z" fill="#fff"/></svg>',"image/svg+xml; charset=utf-8","public, max-age=86400");
   if(path==="/favicon.ico")return Response.redirect(url.origin+"/favicon.svg",302);
   if(path==="/robots.txt")return respond("User-agent: *\nAllow: /\nDisallow: /preview/\nDisallow: /workspace/\nSitemap: "+url.origin+"/sitemap.xml\n","text/plain; charset=utf-8","public, max-age=3600");
   if(path==="/sitemap.xml"){const paths=["/","/about","/contact","/pricing","/terms","/privacy","/refunds","/delivery"];return respond('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+url.origin+p+'</loc></url>').join('')+'</urlset>',"application/xml; charset=utf-8","public, max-age=3600");}
   if(path==="/assets/style.css")return respond(CSS,"text/css; charset=utf-8","public, max-age=300");
   if(path==="/assets/app.js")return respond(APP,"application/javascript; charset=utf-8","public, max-age=300");
   if(path==="/api/meet/create") {
     if(request.method!=="POST")return Response.json({error:"POST required"},{status:405});
     if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)return Response.json({error:"Authentication unavailable"},{status:503});
     const access=request.headers.get("Authorization")||"";
     const supabaseToken=access.startsWith("Bearer ")?access.slice(7):"";
     if(supabaseToken.length<40||supabaseToken.length>8000)return Response.json({error:"Login required"},{status:401});
     let input;
     try{input=await request.json()}catch(e){return Response.json({error:"Invalid JSON"},{status:400})}
     const sessionId=String(input?.session_id||"");
     const googleToken=String(input?.google_token||"");
     if(!/^[0-9a-fA-F-]{36}$/.test(sessionId)||googleToken.length<30||googleToken.length>5000)
       return Response.json({error:"Invalid session or authorization token"},{status:400});
     const base=env.SUPABASE_URL.replace(/\/$/,"");
     const authHeaders={apikey:env.SUPABASE_PUBLISHABLE_KEY,Authorization:"Bearer "+supabaseToken};
     const reply=(message,status)=>Response.json({error:message},{status,headers:{"cache-control":"no-store"}});
     const getJson=async(url,headers)=>{
       const r=await fetch(url,{headers});if(!r.ok)return null;return await r.json();
     };
     const profile=await getJson(base+"/auth/v1/user",authHeaders);
     if(!profile?.id||!profile?.email)return reply("Session expired; sign in again",401);
     const search=(table,filter)=>base+"/rest/v1/"+table+"?select=*"+filter;
     const escaped=encodeURIComponent(sessionId);
     const schedule=await getJson(search("live_sessions","&id=eq."+escaped+"&limit=1"),authHeaders);
     const meeting=Array.isArray(schedule)?schedule[0]:null;
     if(!meeting||meeting.status!=="scheduled")return reply("Class schedule not available",404);
     if(meeting.meet_status==="ready")return reply("Google Meet space already registered",409);
     const pid=encodeURIComponent(meeting.program_id),uid=encodeURIComponent(profile.id);
     const [trainers,guides,admins]=await Promise.all([
       getJson(search("program_staff","&program_id=eq."+pid+"&user_id=eq."+uid+"&role=eq.trainer&limit=1"),authHeaders),
       getJson(search("program_guides","&program_id=eq."+pid+"&user_id=eq."+uid+"&limit=1"),authHeaders),
       getJson(search("staff_roles","&user_id=eq."+uid+"&role=eq.admin&limit=1"),authHeaders)
     ]);
     if(!((trainers?.length||0)||(guides?.length||0)||(admins?.length||0)))
       return reply("Only assigned teaching staff can create a class meeting",403);
     // The Google bearer token must belong to the SAME verified Google identity as Supabase Auth.
     const googleIdentity=await getJson("https://openidconnect.googleapis.com/v1/userinfo",{Authorization:"Bearer "+googleToken});
     if(!googleIdentity?.email_verified||String(googleIdentity.email).toLowerCase()!==String(profile.email).toLowerCase())
       return reply("Google Meet consent must use your signed-in Google account",403);
     let googleResponse;
     try{googleResponse=await fetch("https://meet.googleapis.com/v2/spaces",{method:"POST",
        headers:{"Authorization":"Bearer "+googleToken,"Content-Type":"application/json"},
        body:JSON.stringify({config:{accessType:"RESTRICTED"}})})}
     catch(e){return reply("Google Meet service temporarily unavailable",502)}
     if(!googleResponse.ok){
       const status=googleResponse.status;
       // Don't echo provider tokens or raw Google diagnostics to the browser.
       return reply(status===403?"Google Meet API permission missing. Enable Meet API and grant the meetings.space.created scope.":
          status===401?"Trainer must reconnect Google Meet consent.":"Google Meet space creation failed ("+status+")",502);
     }
     const created=await googleResponse.json();
     if(!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(created.meetingUri||""))
       return reply("Google Meet returned an unexpected meeting URI",502);
     const stored=await fetch(base+"/rest/v1/rpc/register_meet_space",{
       method:"POST",headers:{...authHeaders,"Content-Type":"application/json"},
       body:JSON.stringify({_session_id:sessionId,_meet_uri:created.meetingUri,_space_name:created.name||null})
     });
     if(!stored.ok)return reply("Meeting created but private registration needs administrator review",502);
     return Response.json({success:true,session_id:sessionId,meet_status:"ready"},{headers:{"cache-control":"no-store"}});
   }
   if(path.startsWith("/api/join/"))return Response.json({error:"Google Meet OAuth integration is not configured"},{status:503,headers:{"cache-control":"no-store"}});
   if(path.startsWith("/api/"))return Response.json({error:"Unknown API route"},{status:404,headers:{"cache-control":"no-store"}});
   if(request.method!=="GET"&&request.method!=="HEAD")return respond("Method Not Allowed","text/plain", "no-store",405);
   if(!(path==="/"||["/about","/contact","/pricing","/terms","/privacy","/refunds","/delivery"].includes(path)||path.startsWith("/preview/")||path.startsWith("/workspace/")))return respond("Page not found","text/plain; charset=utf-8","no-store",404);
   return respond(request.method==="HEAD"?null:HTML,"text/html; charset=utf-8");
 }
};