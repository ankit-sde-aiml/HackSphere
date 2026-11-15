// HackSphere Cloudflare Worker — source assembled by build.mjs and Cloudflare deployment.
const HTML = __HTML_JSON__;
const CSS = __CSS_JSON__;
const APP = __APP_JSON__;
const baseHeaders = {"x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"strict-origin-when-cross-origin","permissions-policy":"camera=(),microphone=(),geolocation=()"};
function respond(body,type,cache="no-store",status=200){return new Response(body,{status,headers:{...baseHeaders,"content-type":type,"cache-control":cache}})}

// R2 video gateway. Uses the existing site's origin to keep session cookies first-party.
// Supabase Auth validates the JWT; Postgres RPC validates ownership, purchase and release.
const videoReply=(message,status,more={})=>new Response(JSON.stringify({error:message}),{
 status,headers:{"content-type":"application/json","cache-control":"no-store",
 "x-content-type-options":"nosniff",...more}});
const videoJson=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,
 headers:{"content-type":"application/json","cache-control":"no-store",
 "x-content-type-options":"nosniff",...headers}});
const videoGuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function videoBearer(request,cookiesAllowed=false){
 let h=request.headers.get("authorization")||"";
 if(h.startsWith("Bearer "))return h.slice(7);
 if(!cookiesAllowed)return "";
 let cookie=(request.headers.get("cookie")||"").split(";").map(x=>x.trim())
    .find(x=>x.startsWith("hs_stream_auth="));
 if(!cookie)return "";
 try{return decodeURIComponent(cookie.slice("hs_stream_auth=".length))}catch(e){return ""}
}
async function videoSupabase(request,env,allowCookie=false){
 const token=videoBearer(request,allowCookie);
 if(token.length<60||token.length>8000||!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)return null;
 const url=env.SUPABASE_URL.replace(/\/$/,"");
 const headers={Authorization:"Bearer "+token,apikey:env.SUPABASE_PUBLISHABLE_KEY};
 let user=null;
 try{
  const r=await fetch(url+"/auth/v1/user",{headers});
  if(!r.ok)return null;
  user=await r.json();
  if(!user?.id||!videoGuid.test(user.id))return null;
 }catch(e){return null}
 return {user,token,headers,url};
}
async function videoRpc(ctx,name,args){
 try{
  const r=await fetch(ctx.url+"/rest/v1/rpc/"+name,{
   method:"POST",headers:{...ctx.headers,"content-type":"application/json"},
   body:JSON.stringify(args)});
  if(!r.ok)return null;
  return await r.json();
 }catch(e){return null}
}
function parseVideoRange(value,total){
 if(!value)return {partial:false,start:0,end:total-1};
 if(!/^bytes=(?:\d+-\d*|-\d+)$/.test(value))return null;
 const raw=value.slice(6),p=raw.split("-");
 let start,end;
 if(p[0]===""){const length=Number(p[1]);if(!Number.isSafeInteger(length)||length<=0)return null;
  start=Math.max(0,total-length);end=total-1;
 }else{
  start=Number(p[0]);
  if(!Number.isSafeInteger(start)||start>=total)return null;
  end=p[1]===""?total-1:Number(p[1]);
  if(!Number.isSafeInteger(end)||end<start)return null;
  end=Math.min(end,total-1);
 }
 return {partial:true,start,end};
}
async function routePrivateVideos(request,env,path){
 const match=path.match(/^\/api\/videos\/([0-9a-f-]{36})\/(session|upload|stream|complete|parts\/\d+)$/i);
 if(path==="/api/videos/status"){
  if(request.method!=="GET")return videoReply("Method not allowed",405,{allow:"GET"});
  return videoJson({r2Connected:!!env.COURSE_VIDEOS,maxUploadBytes:536870912,chunkBytes:8388608,accept:"video/mp4"});
 }
 if(!env.COURSE_VIDEOS)return videoReply(
   "Private R2 video storage is not activated yet. Enable R2 and attach COURSE_VIDEOS binding.",
   503);
 if(path==="/api/videos/prepare"&&request.method==="POST"){
  const ctx=await videoSupabase(request,env);if(!ctx)return videoReply("Sign in as a Trainer or Guide",401);
  let input;try{input=await request.json()}catch(e){return videoReply("Invalid JSON",400)}
  if(!videoGuid.test(String(input?.event_id||""))||typeof input?.title!=="string"||
    !Number.isSafeInteger(input?.size_bytes)||input.size_bytes<1||input.size_bytes>536870912)
      return videoReply("Expected MP4 class, title and size <= 512 MiB",400);
  const video=await videoRpc(ctx,"prepare_video_upload",{
   _event_id:input.event_id,_title:input.title,_size_bytes:input.size_bytes});
  if(!video?.id||!video?.object_key)return videoReply("Class upload not authorized",403);
  if(input.size_bytes>99614720){
   let multipart;
   try{
    multipart=await env.COURSE_VIDEOS.createMultipartUpload(video.object_key,{
      httpMetadata:{contentType:"video/mp4",cacheControl:"private, no-store"}});
   }catch(e){return videoReply("Unable to prepare R2 chunked upload",502)}
   const linked=await videoRpc(ctx,"set_video_multipart",{
     _video_id:video.id,_upload_id:multipart.uploadId});
   if(linked!==true){await multipart.abort().catch(()=>{});return videoReply("Unable to register R2 multipart upload",502)}
   return videoJson({id:video.id,multipart:true,chunkBytes:8388608,maxUploadBytes:536870912});
  }
  return videoJson({id:video.id,multipart:false,maxUploadBytes:536870912});
 }
 if(!match)return videoReply("Video route not found",404);
 const videoId=match[1],verb=match[2];
 if(!videoGuid.test(videoId))return videoReply("Invalid video identifier",400);

 if(verb.startsWith("parts/")&&request.method==="PUT"){
   const partNumber=Number(verb.slice(6));
   if(!Number.isInteger(partNumber)||partNumber<1)return videoReply("Invalid part number",400);
   const ctx=await videoSupabase(request,env);if(!ctx)return videoReply("Login required",401);
   const authorized=await videoRpc(ctx,"authorize_video_upload",{_video_id:videoId});
   if(!authorized?.multipart_upload_id||!authorized.object_key||authorized.size_bytes<=99614720)
     return videoReply("Multipart recording not authorized",403);
   const chunkBytes=8388608,expectedParts=Math.ceil(authorized.size_bytes/chunkBytes);
   if(partNumber>expectedParts)return videoReply("Part outside recording",400);
   const expectedBytes=partNumber===expectedParts?
       authorized.size_bytes-chunkBytes*(partNumber-1):chunkBytes;
   const sent=Number(request.headers.get("x-upload-size")||request.headers.get("content-length")||0);
   if(sent!==expectedBytes||!request.body)return videoReply("Chunk size incorrect",400);
   let part;
   try{
     const bytes=await request.arrayBuffer();
     if(bytes.byteLength!==expectedBytes)return videoReply("Chunk bytes incorrect",400);
     part=await env.COURSE_VIDEOS.resumeMultipartUpload(authorized.object_key,authorized.multipart_upload_id)
       .uploadPart(partNumber,bytes);
   }catch(e){return videoReply("Chunk upload failed. Retry this part.",502)}
   return videoJson({partNumber:part.partNumber,etag:part.etag},201);
 }
 if(verb==="complete"&&request.method==="POST"){
   const ctx=await videoSupabase(request,env);if(!ctx)return videoReply("Login required",401);
   const authorized=await videoRpc(ctx,"authorize_video_upload",{_video_id:videoId});
   if(!authorized?.multipart_upload_id||!authorized.object_key)return videoReply("Multipart access denied",403);
   let input;try{input=await request.json()}catch(e){return videoReply("Invalid parts",400)}
   const count=Math.ceil(authorized.size_bytes/8388608);
   const parts=input?.parts;
   if(!Array.isArray(parts)||parts.length!==count||count>64)
      return videoReply("Incomplete or oversized part list",400);
   for(let i=0;i<parts.length;i++){
      const p=parts[i];
      if(p.partNumber!==i+1||typeof p.etag!=="string"||!p.etag||p.etag.length>255)
        return videoReply("Invalid chunk list",400);
   }
   let object;
   try{
     object=await env.COURSE_VIDEOS.resumeMultipartUpload(
        authorized.object_key,authorized.multipart_upload_id).complete(parts);
   }catch(e){return videoReply("Could not complete the uploaded MP4",502)}
   if(object?.size!==authorized.size_bytes){
     await env.COURSE_VIDEOS.delete(authorized.object_key).catch(()=>{});
     return videoReply("Final MP4 size mismatch",400);
   }
   const finished=await videoRpc(ctx,"finish_video_upload",{
     _video_id:videoId,_size_bytes:object.size});
   if(finished!==true){
     await env.COURSE_VIDEOS.delete(authorized.object_key).catch(()=>{});
     return videoReply("Recording completed but database confirmation failed",502);
   }
   return videoJson({success:true,videoId},201);
 }
 if(verb==="upload"&&request.method==="PUT"){
  const ctx=await videoSupabase(request,env);if(!ctx)return videoReply("Login expired",401);
  if(request.headers.get("content-type")?.split(";")[0]!=="video/mp4")
    return videoReply("Only MP4 video files are accepted",415);
  const bytes=Number(request.headers.get("x-upload-size")||request.headers.get("content-length")||0);
  const actualHeader=request.headers.get("content-length");
  if(actualHeader!==null&&Number(actualHeader)!==bytes)return videoReply("File size header mismatch",400);
  if(!Number.isSafeInteger(bytes)||bytes<1||bytes>99614720)
    return videoReply("Single MP4 upload must be under 95 MiB. Use chunked upload for longer classes.",413);
  const authorized=await videoRpc(ctx,"authorize_video_upload",{_video_id:videoId});
  if(!authorized?.object_key||authorized.multipart_upload_id||authorized.size_bytes!==bytes)
    return videoReply("Not the designated host, session expired, or file size changed",403);
  const key=authorized.object_key;
  if(!request.body)return videoReply("No upload body",400);
  try{
   const stored=await env.COURSE_VIDEOS.put(key,request.body,{
    httpMetadata:{contentType:"video/mp4",cacheControl:"private, no-store"},
    customMetadata:{videoId,uploadedBy:ctx.user.id}
   });
   if(stored?.size!==bytes){await env.COURSE_VIDEOS.delete(key).catch(()=>{});return videoReply("Uploaded size mismatch",400)}
  }catch(e){return videoReply("R2 upload failed; retry with the original MP4",502)}
  const completed=await videoRpc(ctx,"finish_video_upload",{
    _video_id:videoId,_size_bytes:bytes});
  if(completed!==true){
   await env.COURSE_VIDEOS.delete(key).catch(()=>{});
   return videoReply("Video received but registration failed; retry",502);
  }
  return videoJson({success:true,videoId},201);
 }
 if(verb==="session"&&request.method==="POST"){
  const ctx=await videoSupabase(request,env);if(!ctx)return videoReply("Login required",401);
  const access=await videoRpc(ctx,"authorize_video_stream",{_video_id:videoId});
  if(!access?.object_key)return videoReply("Active purchase or lesson release required",403);
  // Media elements cannot attach Authorization headers; a short-lived first-party
  // HttpOnly cookie is sent only to this Worker path. The JWT is revalidated on each range.
  const cookie="hs_stream_auth="+encodeURIComponent(ctx.token)+
    "; Path=/api/videos/; Max-Age=3300; HttpOnly; Secure; SameSite=Strict";
  return videoJson({streamUrl:"/api/videos/"+videoId+"/stream"},200,{"set-cookie":cookie});
 }
 if(verb==="stream"&&(request.method==="GET"||request.method==="HEAD")){
  const ctx=await videoSupabase(request,env,true);if(!ctx)return videoReply("Session expired",401);
  const access=await videoRpc(ctx,"authorize_video_stream",{_video_id:videoId});
  if(!access?.object_key)return videoReply("Active purchase or release date required",403);
  let object;
  try{object=await env.COURSE_VIDEOS.head(access.object_key)}catch(e){return videoReply("R2 storage temporarily unavailable",502)}
  if(!object)return videoReply("Recording not uploaded",404);
  const total=object.size;
  if(!Number.isSafeInteger(total)||total<=0)return videoReply("Recording unavailable",502);
  const parsed=parseVideoRange(request.headers.get("range"),total);
  if(!parsed)return new Response(null,{status:416,headers:{
   "accept-ranges":"bytes","content-range":"bytes */"+total,
   "cache-control":"private, no-store","x-content-type-options":"nosniff"}});
  const partLength=parsed.end-parsed.start+1;
  const headers=new Headers({
   "content-type":"video/mp4","content-length":String(partLength),
   "accept-ranges":"bytes","cache-control":"private, no-store",
   "content-disposition":"inline","x-content-type-options":"nosniff",
   "cross-origin-resource-policy":"same-origin",
   "x-frame-options":"DENY"
  });
  if(object.httpEtag)headers.set("etag",object.httpEtag);
  if(parsed.partial)headers.set("content-range",
    "bytes "+parsed.start+"-"+parsed.end+"/"+total);
  if(request.method==="HEAD")return new Response(null,{status:parsed.partial?206:200,headers});
  let result;
  try{result=await env.COURSE_VIDEOS.get(access.object_key,parsed.partial?
      {range:{offset:parsed.start,length:partLength}}:undefined)}
  catch(e){return videoReply("Unable to read the recording",502)}
  if(!result||!("body" in result))return videoReply("Recording unavailable",404);
  return new Response(result.body,{status:parsed.partial?206:200,headers});
 }
 return videoReply("Method not allowed",405,{allow:verb==="upload"||verb.startsWith("parts/")?"PUT":verb==="session"||verb==="complete"?"POST":"GET, HEAD"});
}

export default {
 async fetch(request,env){
   const url=new URL(request.url),path=url.pathname;
   if(path.startsWith("/api/videos/"))return routePrivateVideos(request,env,path);
   if(path==="/api/health")return Response.json({name:"HackSphere",status:"ok",databaseConfigured:!!(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY)},{headers:{"cache-control":"no-store"}});
   if(path==="/api/config")return Response.json({supabaseUrl:env.SUPABASE_URL||"",supabasePublishableKey:env.SUPABASE_PUBLISHABLE_KEY||""},{headers:{"cache-control":"no-store"}});
   if(path==="/favicon.svg")return respond('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#12c4ae"/><stop offset="1" stop-color="#087e7b"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#g)"/><path d="M35 7 16 35h15l-5 22 22-32H33z" fill="#fff"/></svg>',"image/svg+xml; charset=utf-8","public, max-age=86400");
   if(path==="/favicon.ico")return Response.redirect(url.origin+"/favicon.svg",302);
   if(path==="/robots.txt")return respond("User-agent: *\nAllow: /\nDisallow: /preview/\nDisallow: /workspace/\nSitemap: "+url.origin+"/sitemap.xml\n","text/plain; charset=utf-8","public, max-age=3600");
   if(path==="/sitemap.xml"){const paths=["/","/programs","/about","/contact","/pricing","/terms","/privacy","/refunds","/delivery"];return respond('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+url.origin+p+'</loc></url>').join('')+'</urlset>',"application/xml; charset=utf-8","public, max-age=3600");}
   if(path==="/assets/style.css")return respond(CSS,"text/css; charset=utf-8","public, max-age=60, must-revalidate");
   if(path==="/assets/app.js")return respond(APP,"application/javascript; charset=utf-8","public, max-age=60, must-revalidate");
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
     const [members,admins]=await Promise.all([
       getJson(search("program_mentors","&program_id=eq."+pid+"&mentor_id=eq."+uid+"&limit=1"),authHeaders),
       getJson(search("staff_roles","&user_id=eq."+uid+"&role=eq.admin&limit=1"),authHeaders)
     ]);
     const isAdmin=(admins?.length||0)>0;
     if(!isAdmin&&(!(members?.length)||meeting.trainer_user_id!==profile.id))
       return reply("Only the Admin or this class's scheduled mentor can create its Google Meet link",403);
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
   if(!(path==="/"||["/about","/contact","/pricing","/terms","/privacy","/refunds","/delivery","/programs"].includes(path)||/^\/programs\/[a-z0-9-]{1,120}$/i.test(path)||path.startsWith("/preview/")||path.startsWith("/workspace/")))return respond("Page not found","text/plain; charset=utf-8","no-store",404);
   return respond(request.method==="HEAD"?null:HTML,"text/html; charset=utf-8");
 }
};