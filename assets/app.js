(()=>{"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
const date=x=>x?new Date(String(x).slice(0,10)+"T00:00:00Z").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}):"—";
const day=(x,n)=>{let d=new Date(x+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const today=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
const notice=(s,k="")=>{let x=document.createElement("div");x.className="toast "+k;x.textContent=s;$("toasts").append(x);setTimeout(()=>x.remove(),4500)};
const tag=s=>'<span class="pill">'+esc(s)+"</span>";
const empty=(t,d)=>'<div class="empty"><div class="empty-icon">✧</div><h3>'+esc(t)+'</h3><p>'+esc(d)+"</p></div>";
const card=(h,b)=>'<section class="panel"><div class="panel-head"><h3>'+esc(h)+'</h3></div>'+b+"</section>";
const row=(icon,t,d,r="")=>'<div class="list-row"><span class="row-icon">'+icon+'</span><div class="row-body"><strong>'+esc(t)+'</strong><small>'+esc(d)+'</small></div>'+r+"</div>";
const title=(h,d,actions="")=>'<div class="page-title"><div><span class="eyebrow">HACKSPHERE WORKSPACE</span><h1>'+esc(h)+'</h1><p>'+esc(d)+'</p></div>'+(actions?'<div class="form-actions">'+actions+'</div>':"")+'</div>';
const field=(name,id,type="text",val="",required=false)=>'<label class="field"><span>'+esc(name)+'</span><input class="input" name="'+id+'" type="'+type+'" value="'+esc(val)+'" '+(required?"required":"")+"></label>";
const choose=(name,id,values,selected=null)=>'<label class="field"><span>'+esc(name)+'</span><select name="'+id+'" class="input">'+values.map(v=>'<option value="'+esc(v[0])+'" '+(selected===v[0]?"selected":"")+' >'+esc(v[1])+"</option>").join("")+"</select></label>";
const notes=(name,id,initial="")=>'<label class="field"><span>'+esc(name)+'</span><textarea class="input" name="'+id+'"></textarea></label>';
const click=(name,action,id="",kind="btn-light")=>'<button class="btn btn-small '+kind+'" data-action="'+action+'" data-id="'+esc(id)+'">'+esc(name)+"</button>";
const keys=["programs","enrollments","payment_claims","timeline_events","live_sessions","staff_roles","staff_invitations","program_staff","guide_allocations","submissions","evaluations","completion_recommendations","certificates","profiles","site_settings"];
let db=null,user=null,demo=false,role="student",page="overview",course=null,lesson=null,filter="All",search="",upi={},timelineOffset=0,paymentSection="pending";
let D={};const reset=()=>{D=Object.fromEntries(keys.map(k=>[k,[]]))};reset();
const p=id=>D.programs.find(x=>x.id===id);
const who=id=>{let x=D.profiles.find(x=>x.id===id);return x?.full_name||x?.email||String(id||"Student").slice(0,9)};
const total=x=>Number(x.training_days)+Number(x.internship_days);
const current=x=>Math.max(0,Math.min(total(x),Math.floor((new Date(today())-new Date(x.start_date))/86400000)+1));
const enrolled=x=>demo||D.enrollments.some(y=>y.program_id===x.id&&y.student_id===user?.id&&y.status==="active");
const selectedPrograms=()=>demo||role==="admin"?D.programs:role==="trainer"?D.programs.filter(x=>D.program_staff.some(y=>y.program_id===x.id&&y.user_id===user.id)):role==="guide"?D.programs.filter(x=>D.guide_allocations.some(y=>y.program_id===x.id&&y.guide_user_id===user.id)):D.programs.filter(enrolled);
const options=arr=>arr.map(x=>[x.id,x.title]);
const menu={student:[["overview","◈","Overview"],["courses","▦","My programs"],["timeline","▤","Daily timeline"],["sessions","▷","Live classes"],["submissions","▥","My submissions"],["enrollment","◫","Enrollment"],["performance","◎","My performance"],["documents","✧","Documents"],["profile","♧","My profile"]],trainer:[["overview","◈","Overview"],["courses","▦","My programs"],["timeline","▤","Training lessons"],["sessions","▷","Live classes"],["reviews","▥","Review submissions"],["performance","◎","Student scores"],["profile","♧","My profile"]],guide:[["overview","◈","Overview"],["courses","▦","My programs"],["timeline","▤","Internship timeline"],["reviews","▥","Project reviews"],["performance","◎","Internship scores"],["complete","✧","Completion reviews"],["profile","♧","My profile"]],admin:[["overview","◈","Overview"],["programs","▦","Programs"],["students","♧","Students"],["timeline","▤","Timeline manager"],["sessions","▷","Live classes"],["reviews","▥","Submissions"],["payments","◫","Payment approvals"],["staff","♙","Staff & roles"],["guides","◇","Guide allocation"],["performance","◎","Scores"],["complete","✧","Certificates"],["settings","⚙","Settings"],["profile","♧","My profile"]]};
function seed(){let a=day(today(),-27),b=day(today(),-69);D.programs=[{id:"demo-stack",title:"Full Stack Development",description:"Learn to build practical applications.",start_date:a,training_days:60,internship_days:30,fee_inr:2999,mode:"Hybrid",status:"ongoing"},{id:"demo-design",title:"UI/UX Design",description:"Product thinking and portfolio projects.",start_date:b,training_days:45,internship_days:30,fee_inr:1999,mode:"Hybrid",status:"ongoing"}];D.profiles=[{id:"demo-student",full_name:"Preview Learner",email:"student@example.com"},{id:"demo-trainer",full_name:"Sample Trainer",email:"trainer@example.com"},{id:"demo-guide",full_name:"Sample Guide",email:"guide@example.com"}];D.enrollments=[{id:"demo-enroll",program_id:"demo-stack",student_id:"demo-student",status:"active",offer_letter_code:"HS-OL-PREVIEW"},{id:"demo-enroll2",program_id:"demo-design",student_id:"demo-student",status:"active"}];D.program_staff=[{program_id:"demo-stack",user_id:"demo-trainer"}];D.staff_roles=[{user_id:"demo-trainer",role:"trainer"},{user_id:"demo-guide",role:"guide"}];D.guide_allocations=[{id:"demo-guide-link",program_id:"demo-design",student_id:"demo-student",guide_user_id:"demo-guide"}];for(let i=0;i<90;i+=3)D.timeline_events.push({id:"d"+i,program_id:"demo-stack",phase:i<60?"training":"internship",activity_type:i<60?"lecture":"project",scheduled_date:day(a,i),title:i<60?["HTML & CSS foundations","JavaScript essentials","React components","Developer workflow"][i/3%4]:"Internship project milestone "+(i-59),description:"Practice and submit your scheduled activity."});D.live_sessions=[{id:"demo-live",program_id:"demo-stack",title:"JavaScript Functions & Scope",session_date:today(),start_time:"19:00",status:"scheduled"}];D.payment_claims=[{id:"demo-pay",program_id:"demo-stack",student_id:"demo-student",amount_inr:2999,status:"approved",utr:"PREVIEW00001"}];D.evaluations=[{id:"demo-score",program_id:"demo-stack",student_id:"demo-student",phase:"training",activity_title:"HTML assignment",score:8,max_score:10,feedback:"Great progress!"}];upi={upi_id:"preview@upi",payee:"Preview only — do not pay"}}

const routePath=()=>"/"+(demo?"preview":"workspace")+"/"+role+"/"+(course&&page==="courses"?"classroom/"+encodeURIComponent(course):course&&["program-detail","program-edit","timeline"].includes(page)?page+"/"+encodeURIComponent(course):page);
function navigateTo(newPage,programId=null,replace=false){
 page=newPage;course=programId;lesson=null;timelineOffset=0;
 const path=routePath();
 if(location.pathname!==path)history[replace?"replaceState":"pushState"]({},'',path);
 $("app-shell").classList.remove("drawer-open");
 render();window.scrollTo({top:0,behavior:"instant"});
}
function readRoute(){
 let segments=location.pathname.split("/").filter(Boolean);
 if(!["preview","workspace"].includes(segments[0])||segments.length<3)return false;
 let allowedRoles=demo?["student","trainer","guide","admin"]:["student",...new Set(D.staff_roles.filter(x=>x.user_id===user?.id).map(x=>x.role))];
 if(allowedRoles.includes(segments[1]))role=segments[1];
 let requested=segments[2];
 if(requested==="classroom"){page="courses";course=segments[3]||null;}
 else if(["program-detail","program-edit","timeline"].includes(requested)){page=requested;course=segments[3]||null;}
 else {page=requested;course=null}
 return true;
}
window.addEventListener("popstate",()=>{if(!user){publicPage();return}readRoute();render()});

function loginDialog(){ $("login-modal").hidden=false;document.body.style.overflow="hidden"}
function hideDialog(){ $("login-modal").hidden=true;document.body.style.overflow=""}
function publicPage(){ $("marketing").hidden=false;$("app-shell").hidden=true;history.replaceState({},"","/");window.scrollTo(0,0)}
function demoOpen(){demo=true;reset();seed();user={id:"demo-student",email:"student@example.com",user_metadata:{full_name:"Preview Learner"}};role="student";page="overview";course=null;hideDialog();navigateTo("overview",null);open();notice("Preview mode: all example data is isolated from live records.","success")}
function open(){hideDialog();$("marketing").hidden=true;$("app-shell").hidden=false;window.scrollTo(0,0);if(!readRoute())navigateTo("overview",null,true);else render()}
async function signIn(){if(!db){$("login-notice").textContent="Google Sign-In will be enabled when the website administrator configures the Google Cloud OAuth Client ID and Secret in Supabase. You can explore Dashboard Preview meanwhile.";return}let r=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/",queryParams:{prompt:"select_account"}}});if(r.error)notice(r.error.message,"error")}
async function signOut(){if(db&&!demo)await db.auth.signOut();user=null;demo=false;reset();publicPage();catalog()}
async function reload(){if(!db||!user||demo)return;await Promise.all(keys.map(async k=>{try{let r=await db.from(k).select("*").limit(900);D[k]=r.error?[]:r.data||[]}catch(e){D[k]=[]}}));try{await db.rpc("accept_my_staff_invitation");let r=await db.from("staff_roles").select("*");if(!r.error)D.staff_roles=r.data||[]}catch(e){}try{let r=await db.rpc("get_payment_instructions");if(!r.error)upi=r.data||{}}catch(e){}}
async function save(t,obj,id){if(demo){if(id)D[t]=D[t].map(x=>x.id===id?{...x,...obj}:x);else D[t].unshift({id:"preview-"+Math.random().toString(36).slice(2),...obj});notice("Updated in preview mode only.","success");render();return}if(!db||!user){notice("Sign in first.","error");return}try{let r=id?await db.from(t).update(obj).eq("id",id):t==="site_settings"?await db.from(t).upsert(obj,{onConflict:"key"}):await db.from(t).insert(obj);if(r.error)throw r.error;notice("Saved successfully.","success");await reload();render()}catch(e){notice(e.message,"error")}}
function catalog(){if(!db){drawCatalog();return}db.from("programs").select("*").in("status",["published","ongoing"]).limit(100).then(r=>{if(!r.error)D.programs=r.data||[];drawCatalog()}).catch(drawCatalog)}
function drawCatalog(){let arr=D.programs.filter(x=>["published","ongoing"].includes(x.status)&&(filter==="All"||x.mode===filter)&&String(x.title+" "+x.description).toLowerCase().includes(search.toLowerCase()));$("catalog").innerHTML=arr.length?arr.map((x,i)=>'<article class="course-card"><div class="course-art '+["","blue","green"][i%3]+'">✦</div><div class="course-body"><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||"Practical learning and project internship")+'</p><div class="course-meta"><span>◷ '+total(x)+' days</span><span>Starts '+date(x.start_date)+'</span><span>'+esc(x.mode)+'</span></div><div class="course-footer"><strong>'+money(x.fee_inr)+'</strong>'+click("View & enroll","enroll-public",x.id,"btn-primary")+"</div></div></article>").join(""):'<div class="catalog-empty"><div class="feature-icon">✧</div><h3>Programs launching soon</h3><p>New programs will appear here when published by HackSphere administration.</p><button class="btn btn-primary" data-action="demo">Preview the learning platform ↗</button></div>'}
function render(){if(!user)return;let roles=demo?["student","trainer","guide","admin"]:["student",...new Set(D.staff_roles.filter(x=>x.user_id===user.id).map(x=>x.role))];if(!roles.includes(role))role=roles.includes("admin")?"admin":roles.includes("trainer")?"trainer":roles.includes("guide")?"guide":"student";if(!menu[role].some(x=>x[0]===page)&&!["program-new","program-detail","program-edit","staff-invite","payment-history","payment-settings","profile","submissions"].includes(page))page="overview";$("role-switch").innerHTML=roles.map(x=>'<option '+(role===x?"selected":"")+' value="'+x+'">'+({student:"Student",trainer:"Trainer",guide:"Internship Guide",admin:"Administrator"})[x]+"</option>").join("");$("side-nav").innerHTML=menu[role].map(([v,i,l])=>'<button class="'+(page===v?"active":"")+'" data-action="navigate" data-view="'+v+'"><span>'+i+"</span>"+l+"</button>").join("");$("side-role").textContent=({student:"Student portal",trainer:"Trainer workspace",guide:"Internship guide",admin:"Administration"})[role];let label=menu[role].find(x=>x[0]===page)?.[2]||({"program-new":"Create Program","program-detail":"Program Workspace","program-edit":"Edit Program","staff-invite":"Invite Staff","payment-history":"Payment History","payment-settings":"Payment Settings",profile:"My Profile",submissions:"Submissions"})[page]||"Workspace";$("section-label").textContent=label;$("crumb").textContent=label.toUpperCase();let name=user.user_metadata?.full_name||user.email?.split("@")[0]||"Learner";$("user-display").textContent=name;$("user-avatar").textContent=name.slice(0,2).toUpperCase();$("demo-pill").hidden=!demo;$("app-page").innerHTML=(course&&page==="courses")?classroom():({overview:overview,courses:courses,programs:programAdmin,"program-new":programNew,"program-detail":programDetail,"program-edit":programEdit,timeline:timeline,sessions:sessions,reviews:reviews,students:students,payments:payments,"payment-history":paymentHistory,"payment-settings":paymentSettings,staff:staff,"staff-invite":staffInvite,guides:guides,performance:performance,complete:complete,documents:documents,enrollment:enrollment,settings:settings,profile:profilePage,submissions:mySubmissions}[page]||overview)()}
function overview(){let ps=selectedPrograms(),stats=role==="admin"?[["▦",D.programs.length,"Programs"],["◫",D.payment_claims.filter(x=>x.status==="pending").length,"Pending payments"],["♙",D.staff_roles.length,"Staff roles"],["✧",D.completion_recommendations.length,"Completion reviews"]]:[["▦",ps.length,"My programs"],["▤",D.timeline_events.length,"Timeline activities"],["◎",D.evaluations.length,"Evaluations"],["▷",D.live_sessions.length,"Live classes"]];return title(({student:"Welcome back, learner!",trainer:"Trainer workspace",guide:"Internship Guide workspace",admin:"HackSphere control center"})[role],"Your learning and work, all in one place.")+'<div class="stat-grid">'+stats.map(x=>'<div class="stat"><span class="sicon">'+x[0]+"</span><b>"+x[1]+"</b><small>"+x[2]+"</small></div>").join("")+'</div><div class="two-col"><div>'+card(role==="student"?"Continue learning":"Your programs",ps.length?ps.map(x=>row("▦",x.title,"Day "+current(x)+" of "+total(x),click("Open","open-course",x.id))).join(""):empty("No programs yet","Your enrolled or assigned programs will appear here."))+'</div><div>'+card("Your learning journey",'<div class="alert"><b>Date-wise unlocking</b><br>Every lesson opens on its scheduled date, regardless of previous training scores.</div>'+row("▷","Live classes","Trainer-managed Meet sessions")+row("◇","Internship","Guide allocated at internship start")+row("✧","Certificates","Admin approves completion"))+"</div></div>"}
function courses(){let ps=selectedPrograms();return title("My learning programs","Select a program to open its classroom and daily curriculum.")+(ps.length?'<div class="grid">'+ps.map(x=>'<article class="course-card"><div class="course-art">▦</div><div class="course-body"><h3>'+esc(x.title)+'</h3><p>'+esc(x.description)+'</p><div class="course-meta">Day '+current(x)+" / "+total(x)+"</div><div class=\"course-footer\">"+tag(x.mode)+click("Open classroom","open-course",x.id,"btn-primary")+"</div></div></article>").join("")+"</div>":empty("No courses yet","Enroll in a published program or wait for your assignment."))}
function classroom(){
 let program=p(course);
 if(!program)return empty("Program not found","Return to your enrolled courses.");
 let events=D.timeline_events.filter(x=>x.program_id===program.id&&(role!=="student"||x.scheduled_date<=today())).sort((a,b)=>a.scheduled_date.localeCompare(b.scheduled_date));
 let selected=events.find(x=>x.id===lesson)||events[0];
 lesson=selected?.id;
 let media='<div><span class="play-icon">▶</span><h3>'+esc(selected?.title||"Your learning space")+'</h3><p>'+esc(selected?.description||"Choose a lesson from the course curriculum.")+'</p></div>';
 if(selected?.resource_url&&/^https:\/\//.test(selected.resource_url)&&/\.(mp4|webm)(\?.*)?$/i.test(selected.resource_url))media='<video controls playsinline preload="metadata" src="'+esc(selected.resource_url)+'"></video>';
 let actions=[];
 if(selected?.resource_url?.startsWith("storage://hacksphere-course-files/"))actions.push(click("Play / open private resource","secure-resource",selected.id,"btn-primary"));
 else if(selected?.resource_url&&/^https:\/\//.test(selected.resource_url))actions.push('<a class="btn btn-light" href="'+esc(selected.resource_url)+'" target="_blank" rel="noopener noreferrer">Open lesson resource ↗</a>');
 if(role==="student"&&selected&&["assignment","project","milestone"].includes(selected.activity_type)){
  actions.push([
   '<form data-kind="submission" data-event="'+esc(selected.id)+'">',
   '<h3 style="font-size:15px">Submit your work</h3>',
   notes("Submission notes","content"),
   field("GitHub / project URL","submission_url","url","",true),
   '<button class="btn btn-primary">Submit for review</button></form>'
  ].join(""));
 }
 if(role!=="student"&&selected){
  actions.push([
   '<form data-kind="media-upload" data-event="'+esc(selected.id)+'" data-program="'+esc(program.id)+'">',
   '<h3 style="font-size:15px">Upload class recording or study material</h3>',
   '<label class="field"><span>PDF, MP4, WebM or image (private storage)</span>',
   '<input class="input" name="resource_file" type="file" accept=".pdf,.mp4,.webm,.png,.jpg,.jpeg" required></label>',
   '<button class="btn btn-primary">Upload and publish resource</button>',
   '<p style="font-size:11px;color:var(--muted)">Uploaded files remain private. Storage and per-file size limits depend on your free Supabase plan.</p>',
   '</form>'
  ].join(""));
 }
 let lessons=events.length?events.map(x=>[
  '<button class="lesson '+(x.id===lesson?'active':'')+'" data-action="lesson" data-id="'+esc(x.id)+'">',
  '<span>'+(['lecture','recording'].includes(x.activity_type)?'▷':'▤')+'</span>',
  '<div><b>'+esc(x.title)+'</b><small>'+date(x.scheduled_date)+' · '+esc(x.phase)+'</small></div>',
  '</button>'
 ].join("")).join(""):empty("No lessons released","Classes and assignments will appear according to the program schedule.");
 return [
  title(program.title,"Day "+current(program)+" / "+total(program)+" · "+program.training_days+" training days + "+program.internship_days+" internship days"),
  '<div class="course-layout"><div>',
  card(selected?.title||"Course player",'<div class="player" id="course-player">'+media+'</div><p>'+esc(selected?.description||"Select a lesson to see instructions and resources.")+'</p>'+actions.join('<div style="height:14px"></div>')),
  '</div><div>',
  card("Course curriculum",'<div class="lesson-list">'+lessons+'</div>'),
  '</div></div>',
  '<button class="btn btn-outline" data-action="close-course">← Back to programs</button>'
 ].join("");
}
function programAdmin(){
 let items=D.programs.slice().sort((a,b)=>String(b.created_at||b.start_date).localeCompare(String(a.created_at||a.start_date)));
 const action='<button class="btn btn-primary" data-action="program-new">+ Create program</button>';
 const feature=[
 '<div class="workspace-banner">',
 '<div class="banner-icon">▦</div>',
 '<div><span class="eyebrow">PROGRAM OPERATIONS</span><h2>Build a program. Own the full journey.</h2>',
 '<p>Set independent training dates, curriculum, live lessons and internship milestones. Allocate Guides only when internships start.</p></div>',
 '<button class="btn btn-white" data-action="program-new">Create a program ↗</button>',
 '</div>'
 ].join("");
 let counts=[
 '<div class="stat-grid">',
 '<div class="stat"><span class="sicon">▦</span><b>'+items.length+'</b><small>Total programs</small></div>',
 '<div class="stat"><span class="sicon">◉</span><b>'+items.filter(x=>x.status==="published"||x.status==="ongoing").length+'</b><small>Live programs</small></div>',
 '<div class="stat"><span class="sicon">▤</span><b>'+items.filter(x=>x.status==="draft").length+'</b><small>Unpublished drafts</small></div>',
 '<div class="stat"><span class="sicon">♙</span><b>'+D.enrollments.length+'</b><small>Approved enrollments</small></div>',
 '</div>'
 ].join("");
 let rows=items.map(x=>{
 const students=D.enrollments.filter(e=>e.program_id===x.id).length;
 return '<article class="manage-program-card">'+
 '<div class="mp-icon">⌘</div><div class="mp-body">'+
 '<div class="mp-title">'+esc(x.title)+' '+(x.status==="published"||x.status==="ongoing"?'<span class="pill green">Live</span>':tag(x.status))+'</div>'+
 '<div class="mp-meta">◷ '+total(x)+' days &nbsp; · &nbsp; '+x.training_days+' training + '+x.internship_days+' internship &nbsp; · &nbsp; '+students+' students</div>'+
 '<div class="mp-meta">Starts '+date(x.start_date)+' &nbsp; · &nbsp; '+esc(x.mode)+' &nbsp; · &nbsp; '+money(x.fee_inr)+'</div></div>'+
 '<div class="mp-actions">'+click("Manage program →","program-detail",x.id,"btn-primary")+click(x.status==="draft"?"Publish":"Unpublish","publish",x.id,"btn-outline")+'</div></article>';
 }).join("");
 return title("Programs & batches","Manage each course and internship as its own independent, dated program.")+
 feature+counts+card("All programs",items.length?'<div class="manage-program-list">'+rows+'</div>':empty("No programs yet","Create your first batch. You can prepare the schedule while it remains a private draft."))+
 '<div class="help-hint">New program → Add daily lessons → Assign Trainer → Publish → Approve enrollments → Allocate Guide when internship starts.</div>'
}
function programNew(){
 if(role!=="admin")return empty("Access denied","Administrator role required.");
 const form=[
 '<form data-kind="program" class="editor-form">',
 '<div class="form-section-label"><span>01</span><div><b>Program identity</b><small>What students will see in the catalog</small></div></div>',
 field("Program title","title","text","",true),
 notes("Description and learning outcomes","description"),
 '<div class="form-section-label"><span>02</span><div><b>Timeline & batch setup</b><small>Content unlocks based on calendar date</small></div></div>',
 '<div class="form-grid">',
 field("Program start date","start_date","date","",true),
 choose("Class format","mode",[["Hybrid","Hybrid — Live + Recorded"],["Live","Live classes"],["Recorded","Recorded lessons"]]),
 field("Training days","training_days","number","60",true),
 field("Internship days","internship_days","number","30",true),
 '</div>',
 '<div class="form-section-label"><span>03</span><div><b>Enrollment</b><small>Fee is verified manually via official UPI</small></div></div>',
 '<div class="form-grid">',
 field("Fee in INR","fee_inr","number","0",true),
 choose("Initial visibility","status",[["draft","Save as draft"],["published","Publish immediately"]]),
 '</div>',
 '<div class="alert">Guide allocation is intentionally separate: you will assign each student’s Internship Guide only when the internship phase starts.</div>',
 '<div class="form-actions" style="margin-top:20px">',
 '<button class="btn btn-primary">Save program →</button>',
 '<button class="btn btn-outline" type="button" data-action="navigate" data-view="programs">Cancel</button>',
 '</div></form>'
 ].join("");
 const preview=[
 '<div class="editor-preview"><span class="eyebrow">SCHEDULE PREVIEW</span><h3>Your program journey</h3>',
 '<div class="preview-schedule"><div class="preview-phase"><span>Training phase</span><strong id="preview-training-days">60 days</strong></div>',
 '<div class="preview-bar"><span id="preview-training-bar"></span><i></i></div>',
 '<div class="preview-phase"><span>Project internship</span><strong id="preview-intern-days">30 days</strong></div>',
 '<p class="preview-start">Starts: <b id="preview-start">Choose a start date</b></p>',
 '<p class="preview-start">Internship begins: <b id="preview-intern-start">Calculated automatically</b></p></div>',
 '<div class="alert warning">This sets program duration, not prewritten content. Trainer/Guide add dated activities after saving.</div>',
 '</div>'
 ].join("");
 return title("Create new program","A focused setup flow for one independently managed training and internship batch.")+
 '<div class="editor-breadcrumb"><button data-action="navigate" data-view="programs">All programs</button><span>/</span><b>New program</b></div>'+
 '<div class="editor-layout"><div>'+card("New program details",form)+'</div><aside>'+preview+'</aside></div>';
}
function programDetail(){
 let x=p(course);
 if(!x)return title("Program workspace","Manage one batch at a time.")+empty("Program not found","Go back to the program list.");
 let en=D.enrollments.filter(e=>e.program_id===x.id),ts=D.program_staff.filter(e=>e.program_id===x.id),ga=D.guide_allocations.filter(e=>e.program_id===x.id),ev=D.timeline_events.filter(e=>e.program_id===x.id);
 const openIn=day(x.start_date,x.training_days),ended=day(x.start_date,total(x)-1);
 const actions='<div class="form-actions">'+click("Edit details","program-edit",x.id,"btn-outline")+click("Manage timeline","program-timeline",x.id,"btn-primary")+'</div>';
 const cover=[
 '<div class="program-cover"><div class="program-cover-icon">⌘</div>',
 '<div><div class="eyebrow">HACKSPHERE PROGRAM WORKSPACE</div><h2>'+esc(x.title)+'</h2><p>'+esc(x.description||"Training and project-based internship program")+'</p>',
 '<div class="program-badges">'+tag(x.mode)+tag(x.status)+(current(x)>x.training_days?'<span class="pill green">Internship phase</span>':'<span class="pill">Training phase</span>')+'</div></div>',
 '</div>'
 ].join("");
 const statSet='<div class="stat-grid">'+[
 ['◷',total(x),'Total calendar days'],['♙',en.length,'Enrolled students'],['▤',ev.length,'Scheduled activities'],['◇',ga.length,'Guide allocations']
 ].map(([a,n,l])=>'<div class="stat"><span class="sicon">'+a+'</span><b>'+n+'</b><small>'+l+'</small></div>').join("")+'</div>';
 const manage=[
 '<div class="program-phase-track"><div><b>Training</b><span>'+x.training_days+' days · '+date(x.start_date)+'</span></div><div><b>Internship</b><span>'+x.internship_days+' days · '+date(openIn)+'</span></div></div>',
 '<div class="program-bar"><span style="width:'+Math.round(x.training_days/total(x)*100)+'%"></span></div>',
 '<div class="detail-facts"><div><span>Program fee</span><b>'+money(x.fee_inr)+'</b></div><div><span>End date</span><b>'+date(ended)+'</b></div><div><span>Program start</span><b>'+date(x.start_date)+'</b></div><div><span>Internship starts</span><b>'+date(openIn)+'</b></div></div>'
 ].join("");
 const students=en.length?en.map(e=>row('♙',who(e.student_id),e.status+' · Offer letter: '+(e.offer_letter_code||'Pending'))).join(""):empty("No enrolled students","Only verified UPI payments activate enrollment.");
 const trainers=ts.length?ts.map(t=>row("♙",who(t.user_id),"Assigned training instructor")).join(""):empty("Trainer not assigned","Assign a trainer from the Staff directory.");
 const guides=ga.length?ga.map(a=>row("◇",who(a.student_id),who(a.guide_user_id)+" · Assigned Guide")).join(""):empty("No Guide yet","Admin allocates Guides only after "+date(openIn)+".");
 return title(x.title,"Manage timeline, enrollment, Trainers and Guides for this batch.",actions)+
 '<div class="editor-breadcrumb"><button data-action="navigate" data-view="programs">All programs</button><span>/</span><b>'+esc(x.title)+'</b></div>'+
 cover+statSet+'<div class="two-col"><div>'+card("Program structure",manage)+card("Enrolled students",students)+'</div><div>'+
 card("Training team",trainers+click("Assign a Trainer","navigate","","btn-light").replace('data-action="navigate"','data-action="navigate" data-view="staff"'))+
 card("Internship guides",guides)+
 card("Operations",'<div class="quick-links">'+click("Timeline","program-timeline",x.id)+click("Payment approvals","navigate","","btn-outline").replace('data-action="navigate"','data-action="navigate" data-view="payments"')+'</div>')+
 '</div></div>';
}
function programEdit(){
 let x=p(course);
 if(!x)return empty("Program not found","Select a program from the list.");
 const form='<form data-kind="program-edit" data-program="'+esc(x.id)+'">'+
 field("Program title","title","text",x.title,true)+
 notes("Description","description",x.description||"")+
 '<div class="form-grid">'+
 field("Start date","start_date","date",x.start_date,true)+
 field("Fee INR","fee_inr","number",x.fee_inr,true)+
 field("Training days","training_days","number",x.training_days,true)+
 field("Internship days","internship_days","number",x.internship_days,true)+
 choose("Delivery mode","mode",[["Hybrid","Hybrid"],["Live","Live"],["Recorded","Recorded"]],x.mode)+
 choose("Visibility","status",[["draft","Draft"],["published","Published"],["ongoing","Ongoing"],["completed","Completed"],["archived","Archived"]],x.status)+
 '</div><div class="alert warning">Changing program dates after content is scheduled can change what students see. Review the timeline and notify affected students before saving.</div>'+
 '<button class="btn btn-primary">Save program changes</button></form>';
 return title("Edit program","Make intentional changes to the selected batch.")+
 '<div class="editor-breadcrumb"><button data-action="program-detail" data-id="'+esc(x.id)+'">Program workspace</button><span>/</span><b>Edit details</b></div>'+
 '<div class="editor-layout"><div>'+card("Program settings",form)+'</div><aside>'+card("Current settings",row('▦',x.title,x.training_days+' training / '+x.internship_days+' internship days')+row('◷','Start',date(x.start_date)))+'</aside></div>';
}
function timeline(){
  let ps=selectedPrograms(), program=p(course||ps[0]?.id);
  if(!program)return title("Daily timeline","Training and internship follow scheduled dates.")+empty("No programs","Enroll or create a program first.");
  let max=total(program), step=14, pages=Math.ceil(max/step);
  if(timelineOffset>=pages)timelineOffset=0;
  let first=timelineOffset*step+1,last=Math.min(max,first+step-1);
  let rows=[];
  for(let n=first;n<=last;n++){
    let d=day(program.start_date,n-1);
    let phase=n<=program.training_days?"Training":"Internship";
    let items=D.timeline_events.filter(t=>t.program_id===program.id&&t.scheduled_date===d);
    let unlocked=d<=today();
    let name=items.length?items.map(t=>t.title).join(" · "):"No activity scheduled";
    if(role==="student"&&!unlocked)name="Scheduled content — unlocks on "+date(d);
    let label=unlocked?"Available":"Locked";
    rows.push([
      '<div class="timeline-row '+(unlocked?"":"future")+'">',
      '<div class="timeline-day"><b>'+n+'</b><small>'+date(d)+'</small></div>',
      '<div class="timeline-copy"><b>'+esc(name)+'</b><p>'+phase+' · '+items.length+' activities</p></div>',
      tag(label),'</div>'
    ].join(""));
  }
  let nav=[
    '<div class="form-actions" style="justify-content:space-between;align-items:center;margin-bottom:16px">',
    '<b style="font-size:12px">Days '+first+'–'+last+' of '+max+'</b>',
    '<div style="display:flex;gap:6px">',
    click("← Previous","timeline-prev","","btn-outline"),
    click("Next →","timeline-next","","btn-light"),
    '</div></div>'
  ].join("");
  let form="";
  if(role==="student"){form=card("Automatic release",'<div class="alert">Every activity unlocks on its scheduled date. Your training scores do not block the internship timeline.</div>');}
  else {
    let elements=[
      '<form data-kind="activity">',
      choose("Program","program_id",options(ps)),
      field("Scheduled unlock date","scheduled_date","date","",true),
      choose("Phase","phase",role==="trainer"?[["training","Training"]]:role==="guide"?[["internship","Internship"]]:[["training","Training"],["internship","Internship"]]),
      choose("Activity type","activity_type",[["lecture","Lecture"],["recording","Recording"],["assignment","Assignment"],["quiz","Quiz"],["project","Project"],["milestone","Milestone"],["resource","Resource"]]),
      field("Activity title","title","text","",true),
      notes("Instructions","description"),
      field("Resource URL","resource_url","url"),
      '<button class="btn btn-primary">Schedule activity</button></form>'
    ];
    form=card("Schedule an activity",elements.join(""));
  }
  return title("Daily learning timeline","Date-based "+max+"-day schedule: "+program.training_days+" training days + "+program.internship_days+" internship days.")
    +'<div class="two-col"><div>'
    +card(program.title,nav+rows.join(""))
    +'</div><div>'+form+'</div></div>';
}
function sessions(){let ps=selectedPrograms(),listings=D.live_sessions.filter(s=>ps.some(x=>x.id===s.program_id));return title("Live sessions","Trainer creates the calendar; Google Meet API needs additional OAuth authorization.")+'<div class="two-col"><div>'+card("Class calendar",listings.length?listings.map(s=>row("▷",s.title,date(s.session_date)+" • "+String(s.start_time).slice(0,5)+" IST",role==="student"?click("Join Live Class","join",s.id,"btn-primary"):tag(s.status))).join(""):empty("No scheduled classes","Trainers will schedule live sessions."))+'</div><div>'+(role==="student"?card("Secure access","You can join only as an active enrolled student during the class time window. Meet controls final admission."):card("Schedule a class",'<div class="alert warning">Google Meet auto-creation is pending trainer OAuth configuration. This calendar saves a session only.</div><form data-kind="session">'+choose("Program","program_id",options(ps))+field("Lecture topic","title","text","",true)+field("Class date","session_date","date","",true)+field("Start time IST","start_time","time","19:00",true)+field("Duration minutes","duration_minutes","number","60",true)+'<button class="btn btn-primary">Schedule</button></form>'))+"</div></div>"}
function eligibleStudents(programId,roleFilter=role){
 let assigned=D.enrollments.filter(e=>e.program_id===programId&&e.status!=="suspended");
 if(roleFilter==="guide")assigned=assigned.filter(e=>D.guide_allocations.some(g=>g.program_id===programId&&g.student_id===e.student_id&&g.guide_user_id===user.id));
 return assigned.map(e=>[e.student_id,who(e.student_id)]);
}
function students(){
 let en=D.enrollments;
 let entries=en.map(e=>row("♧",who(e.student_id),[p(e.program_id)?.title||"Program",e.status,"Offer Letter: "+(e.offer_letter_code||"Pending")].join(" · "),tag(e.status)));
 return title("Student directory","View all program enrollments and verified student access.")
 +card("Enrolled students",entries.join("")||empty("No enrollments yet","Students appear here after payment approval."));
}
function reviews(){
 let events=D.timeline_events,items=D.submissions.filter(s=>{
  let ev=events.find(x=>x.id===s.event_id);
  if(!ev)return false;
  return role==="admin"||
   (role==="trainer"&&ev.phase==="training"&&D.program_staff.some(ps=>ps.program_id===ev.program_id&&ps.user_id===user.id))||
   (role==="guide"&&ev.phase==="internship"&&D.guide_allocations.some(g=>g.program_id===ev.program_id&&g.guide_user_id===user.id&&g.student_id===s.student_id));
 });
 return title("Submission reviews","Review training assignments or internship project work for your assigned students.")
 +card("Pending and reviewed submissions",items.map(s=>{
  let ev=events.find(x=>x.id===s.event_id);
  let link=s.submission_url&&/^https:\/\//.test(s.submission_url)?'<a href="'+esc(s.submission_url)+'" target="_blank" rel="noopener noreferrer" class="btn btn-small btn-outline">Open work ↗</a>':"";
  let actions='<div class="form-actions">'+link+(s.status!=="approved"?click("Approve","review-approve",s.id,"btn-primary")+click("Request changes","review-changes",s.id,"btn-outline"):"")+'</div>';
  return row("▥",ev?.title||"Assignment",who(s.student_id)+" · "+(s.content||"Work submitted")+" · "+s.status,actions)
 }).join("")||empty("No submissions to review","Student submissions will appear when an assignment or project has been submitted."));
}
function performance(){
 let all=role==="student"?D.evaluations.filter(x=>x.student_id===user.id):D.evaluations;
 let ps=selectedPrograms().filter(p=>role!=="guide"||D.guide_allocations.some(g=>g.program_id===p.id&&g.guide_user_id===user.id));
 let form="";
 if(role!=="student"){
  let selectedProgram=ps[0]?.id;
  let studentsList=selectedProgram?eligibleStudents(selectedProgram):[];
  let eligibleCount=studentsList.length;
  form=card("Score a student",
  eligibleCount?[
  '<form data-kind="score">',
  choose("Program","program_id",options(ps)),
  choose("Enrolled student","student_id",studentsList),
  choose("Evaluation phase","phase",role==="trainer"?[["training","Training"]]:role==="guide"?[["internship","Internship"]]:[["training","Training"],["internship","Internship"]]),
  field("Assignment / milestone","activity_title","text","",true),
  '<div class="form-grid">',field("Score","score","number","",true),field("Maximum score","max_score","number","10",true),'</div>',
  notes("Constructive feedback","feedback"),
  '<button class="btn btn-primary">Save score</button></form>'
  ].join(""):empty("No eligible students","Assign a program and enroll students before entering marks."));
 }
 return title("Performance and evaluations","Trainer and Internship Guide scores are independent.")
 +'<div class="two-col"><div>'
 +card("Evaluation history",all.map(x=>row("◎",x.activity_title,who(x.student_id)+" · "+x.phase+" · "+(x.feedback||""),tag(x.score+" / "+x.max_score))).join("")||empty("No evaluations yet","Results appear as students complete tasks."))
 +'</div><div>'+(form||card("Your scores","Evaluation details will appear when your work is reviewed."))+'</div></div>';
}
function paymentInstructions(){return upi.upi_id?'<div class="alert success"><b>Official UPI</b><br>ID: '+esc(upi.upi_id)+"<br>Payee: "+esc(upi.payee||"HackSphere")+"<br>"+esc(upi.instructions||"")+"</div>"+(upi.qr_url&&upi.qr_url.startsWith("https://")?'<img alt="Official UPI QR code" src="'+esc(upi.qr_url)+'" style="width:175px;margin:12px 0;border-radius:12px">':""):'<div class="alert warning">Official UPI payment details are not configured. Please do not send money yet.</div>'}
function enrollment(){let ps=D.programs.filter(x=>["published","ongoing"].includes(x.status)),mine=D.enrollments.filter(x=>x.student_id===user.id);return title("My enrollments","Enrollment activates after manual verification of actual bank credit.")+'<div class="two-col"><div>'+card("UPI enrollment",paymentInstructions()+(upi.upi_id?'<form data-kind="payment">'+choose("Program","program_id",options(ps))+field("Transaction UTR","utr","text","",true)+'<label class="field"><span>Payment screenshot (PNG / JPG / WebP, max 5 MB)</span><input class="input" type="file" name="proof_file" accept="image/png,image/jpeg,image/webp" required></label><div class="alert warning">Your UTR and screenshot are submitted for verification. Only a matching actual bank credit activates enrollment.</div><button class="btn btn-primary">Submit for bank verification</button></form>':""))+'</div><div>'+card("Enrolled programs",mine.length?mine.map(x=>row("▦",p(x.program_id)?.title||"Program",x.offer_letter_code||"Offer letter pending",tag(x.status))).join(""):empty("No enrollments","Purchase verification is required."))+"</div></div>"}
function upiForm(){return '<form data-kind="upi">'+field("Official UPI ID","upi_id","text",upi.upi_id||"",true)+field("Payee","payee","text",upi.payee||"",true)+field("QR image HTTPS URL","qr_url","url",upi.qr_url||"")+notes("Student instructions","instructions")+'<button class="btn btn-primary">Save payment settings</button></form>'}
function payments(){
 let pending=D.payment_claims.filter(x=>x.status==="pending").slice().sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
 let outstanding=pending.reduce((sum,x)=>sum+Number(x.amount_inr||0),0);
 let intro=[
 '<div class="workspace-banner payment-banner"><div class="banner-icon">◫</div>',
 '<div><span class="eyebrow">FINANCE OPERATIONS</span><h2>Verify payments before unlocking access.</h2><p>Check every UPI transfer in your actual bank statement. A screenshot or transaction reference is evidence, not confirmation.</p></div>',
 '<button class="btn btn-white" data-action="payment-history">View history ↗</button></div>'
 ].join("");
 const actions='<div class="form-actions">'+click("Payment history","payment-history","","btn-outline")+click("UPI settings","payment-settings","","btn-light")+'</div>';
 let pendingCards=pending.length?pending.map(x=>{
 let student=who(x.student_id),prog=p(x.program_id);
 return '<article class="payment-review-card"><div class="payment-avatar">₹</div>'+
 '<div class="payment-review-body"><div class="payment-person">'+esc(student)+' <span class="pill orange">Needs verification</span></div>'+
 '<p>'+esc(prog?.title||"Program")+' · '+money(x.amount_inr)+'</p>'+
 '<div class="payment-reference">UTR: <b>'+esc(x.utr)+'</b></div></div>'+
 '<div class="payment-action-column">'+click("View proof","proof",x.id,"btn-outline")+click("Approve","approve-pay",x.id,"btn-primary")+click("Reject","reject-pay",x.id,"btn-danger")+'</div></article>';
 }).join(""):empty("No payments waiting","Every submitted UPI claim will appear here for your verification.");
 return title("UPI payment approvals","Control student enrollment using real bank-credit verification.",actions)+intro+
 '<div class="stat-grid">'+
 '<div class="stat"><span class="sicon">◫</span><b>'+pending.length+'</b><small>Awaiting approval</small></div>'+
 '<div class="stat"><span class="sicon">₹</span><b>'+money(outstanding)+'</b><small>Claims to verify</small></div>'+
 '<div class="stat"><span class="sicon">✓</span><b>'+D.payment_claims.filter(x=>x.status==="approved").length+'</b><small>Approved claims</small></div>'+
 '<div class="stat"><span class="sicon">✕</span><b>'+D.payment_claims.filter(x=>x.status==="rejected").length+'</b><small>Rejected claims</small></div>'+
 '</div>'+card("Payment verification queue",pendingCards);
}
function paymentHistory(){
 const records=D.payment_claims.filter(x=>x.status!=="pending");
 let list=records.length?records.map(x=>'<div class="history-row">'+
 '<span class="history-amount">'+money(x.amount_inr)+'</span>'+
 '<div><b>'+esc(who(x.student_id))+'</b><small>'+esc(p(x.program_id)?.title||"Program")+' · '+esc(x.utr)+'</small></div>'+
 tag(x.status)+'</div>').join(""):empty("No completed reviews","Approved and rejected payments will be listed here.");
 return title("Payment history","Track UPI payment decisions without mixing them with pending claims.")+
 '<div class="editor-breadcrumb"><button data-action="navigate" data-view="payments">Payment approvals</button><span>/</span><b>History</b></div>'+
 card("Reviewed transactions",list);
}
function paymentSettings(){
 return title("Official UPI configuration","Configure the verified payee shown to students before any payment.")+
 '<div class="editor-breadcrumb"><button data-action="navigate" data-view="payments">Payment approvals</button><span>/</span><b>UPI settings</b></div>'+
 '<div class="editor-layout"><div>'+
 card("Bank/UPI payment details",upiForm())+
 '</div><aside>'+card("Student payment rules",'<div class="alert warning"><b>Always validate incoming credit.</b><br>Uploaded proof or UTR does not confirm a payment. Only Administrator can approve a claim.</div><p class="help-hint">The official UPI ID and QR appear to students only once you publish them here.</p>')+
 '</aside></div>';
}
function staff(){
 const staff=D.staff_roles,invites=D.staff_invitations;
 const people=new Map();
 for(const x of staff){if(!people.has(x.user_id))people.set(x.user_id,[]);people.get(x.user_id).push(x.role)}
 let employees=[...people].map(([uid,rr])=>'<article class="manage-program-card"><div class="mp-icon">♙</div><div class="mp-body">'+
 '<div class="mp-title">'+esc(who(uid))+'</div>'+
 '<div class="mp-meta">'+(D.profiles.find(x=>x.id===uid)?.email||"Staff account")+'</div>'+
 '<div class="mp-meta">'+rr.map(r=>'<span class="pill">'+esc(r)+'</span>').join(" ")+'</div>'+
 '</div><div class="mp-actions">'+tag("Active")+'</div></article>').join("");
 let trainers=D.staff_roles.filter(x=>x.role==="trainer").map(x=>[x.user_id,who(x.user_id)]);
 return title("Staff & teaching team","Invite Google accounts, assign Trainer roles, and prepare Guides for internship allocation.",
 '<button class="btn btn-primary" data-action="staff-invite">+ Invite staff</button>')+
 '<div class="stat-grid">'+
 '<div class="stat"><span class="sicon">♙</span><b>'+people.size+'</b><small>Staff members</small></div>'+
 '<div class="stat"><span class="sicon">▷</span><b>'+staff.filter(x=>x.role==="trainer").length+'</b><small>Trainers</small></div>'+
 '<div class="stat"><span class="sicon">◇</span><b>'+staff.filter(x=>x.role==="guide").length+'</b><small>Internship Guides</small></div>'+
 '<div class="stat"><span class="sicon">◷</span><b>'+invites.filter(x=>x.status==="pending").length+'</b><small>Pending invitations</small></div>'+
 '</div>'+
 '<div class="two-col"><div>'+
 card("Staff directory",employees||empty("No staff onboarded","Invite the first Trainer or Guide by Google email."))+
 card("Pending invitations",invites.length?invites.map(x=>row('♙',x.email,x.role+' · '+x.status,tag(x.status))).join(""):empty("No invitations","Invite team members from the dedicated invitation screen."))+
 '</div><div>'+
 card("Assign Trainer to program",D.programs.length&&trainers.length?[
  '<form data-kind="trainer">',
  choose("Program","program_id",options(D.programs)),
  choose("Trainer","user_id",trainers),
  '<button class="btn btn-primary">Assign Trainer</button></form>'
 ].join(""):empty("No Trainers available","Invite a Trainer and have them sign in with their Google account."))+
 '</div></div>';
}
function staffInvite(){
 return title("Invite staff","Send Trainer and/or Internship Guide access to a verified Google account.")+
 '<div class="editor-breadcrumb"><button data-action="navigate" data-view="staff">Staff directory</button><span>/</span><b>Invite a team member</b></div>'+
 '<div class="editor-layout"><div>'+card("Staff invitation",[
 '<form data-kind="invite">',
 field("Google account email","email","email","",true),
 '<p style="color:var(--muted);font-size:12px;margin:4px 0 16px">The person must sign in with this exact verified Google account.</p>',
 '<label class="checkbox"><input type="checkbox" name="trainer"> Trainer — Training classes, assignments, scores</label>',
 '<label class="checkbox"><input type="checkbox" name="guide"> Internship Guide — Project milestones, reviews, scores</label>',
 '<div class="alert">One person may have both roles. The dashboard role switcher appears after the invitation is accepted.</div>',
 '<div class="form-actions" style="margin-top:20px"><button class="btn btn-primary">Create invitation</button>',
 '<button type="button" class="btn btn-outline" data-action="navigate" data-view="staff">Cancel</button></div>',
 '</form>'
 ].join(""))+'</div><aside>'+
 card("Invite workflow",'<div class="process-list"><p><b>01.</b> Admin creates invitation record</p><p><b>02.</b> Staff opens HackSphere website URL</p><p><b>03.</b> Staff signs in using the invited Google account</p><p><b>04.</b> Permissions become available after verified matching</p></div><div class="alert warning">Email sending is not configured. Share the website link with the invited person.</div>')+
 '</aside></div>';
}
function guides(){
 let eligible=D.programs.filter(pr=>day(pr.start_date,pr.training_days)<=today());
 let selected=eligible[0]?.id;
 let students=selected?D.enrollments.filter(e=>e.program_id===selected&&e.status==="active"):[];
 let staff=D.staff_roles.filter(x=>x.role==="guide");
 let form=eligible.length&&students.length&&staff.length?[
 '<form data-kind="guide">',
 choose("Internship program","program_id",options(eligible)),
 choose("Enrolled student","student_id",students.map(e=>[e.student_id,who(e.student_id)])),
 choose("Internship Guide","guide_user_id",staff.map(r=>[r.user_id,who(r.user_id)])),
 '<button class="btn btn-primary">Allocate guide</button></form>'
 ].join(""):empty("Not available yet","Needs a started internship, an active enrolled student and a staff Guide.");
 let current=D.guide_allocations.map(x=>row("◇",who(x.student_id),p(x.program_id)?.title||"Program",tag(who(x.guide_user_id)))).join("");
 return title("Internship Guide allocation","Guides can be allocated only from the internship start date, never at program creation.")
 +'<div class="two-col"><div>'+card("Allocate guide",form)+'</div><div>'+card("Current allocations",current||empty("No guides assigned","Allocations appear here at the internship phase."))+'</div></div>';
}
function complete(){return title("Completion and certificates","Guide recommendation comes first. Only admin approves final certificates.")+'<div class="two-col"><div>'+card("Completion queue",D.completion_recommendations.map(x=>row("✧",who(x.student_id),p(x.program_id)?.title||"Program",tag(x.recommendation)+(role==="admin"?click("Approve","certificate",x.id,"btn-primary"):""))).join("")||empty("No recommendations","Guide reviews appear after the internship ends."))+'</div><div>'+(role==="guide"?card("Recommend completion",'<form data-kind="recommend">'+choose("Program","program_id",options(selectedPrograms()))+field("Student UUID","student_id","text","",true)+choose("Decision","recommendation",[["recommended","Recommend"],["needs_improvement","Needs improvement"]])+notes("Remarks","remarks")+'<button class="btn btn-primary">Submit review</button></form>'):card("Certificate policy","Only admin can approve after the Guide recommends completion."))+"</div></div>"}
function documents(){
 const mine=D.enrollments.filter(x=>x.student_id===user.id);
 const certs=D.certificates.filter(x=>x.student_id===user.id);
 const letters=mine.length?mine.map(x=>row("▣",p(x.program_id)?.title||"Program",
 x.offer_letter_code||"Pending",
 click("Print / Save PDF","letter",x.id,"btn-primary"))).join(""):empty("No offer letters","Offer letters are available after verified UPI enrollment.");
 const certificates=certs.length?certs.map(x=>row("✧",p(x.program_id)?.title||"Program",x.code,
 click("Print / Save PDF","certificate-print",x.id,"btn-primary"))).join(""):empty("No certificates yet","Guide recommendation and admin approval are required.");
 return title("My documents","Verifiable offer letters and completion certificates, with a unique document ID.")
   +card("Offer letters",letters)+card("Completion certificates",certificates);
}
function printCredential(kind,id){
 let item=kind==="certificate"?D.certificates.find(x=>x.id===id):D.enrollments.find(x=>x.id===id);
 if(!item){notice("Document not found.","error");return}
 const program=p(item.program_id);
 const code=kind==="certificate"?item.code:item.offer_letter_code;
 if(!code){notice("Document code is not ready.","error");return}
 let name=kind==="certificate"?item.issued_name:item.offer_letter_name;
 name=name||who(item.student_id);
 const verifiedUrl=location.origin+"/?verify="+encodeURIComponent(code);
 const titleText=kind==="certificate"?"CERTIFICATE OF COMPLETION":"TRAINING + INTERNSHIP OFFER LETTER";
 const bodyText=kind==="certificate"?"This is to certify that the recipient has completed the HackSphere training and project-based internship program, following final approval by the administration.":"HackSphere confirms this student's verified enrollment in the specified training and project-based internship program, subject to its stated schedule and participation requirements.";
 const html=[
 '<!doctype html><html><head><meta charset="utf-8"><title>'+esc(titleText)+'</title>',
 '<style>body{font:16px system-ui;background:#eff0f9;margin:0;color:#172246}.sheet{max-width:850px;min-height:570px;margin:36px auto;padding:55px;background:white;border:10px solid #e8e6ff;box-shadow:0 18px 40px #0001;position:relative;box-sizing:border-box}.brand{font-size:24px;font-weight:900;color:#6253da}.over{letter-spacing:3px;color:#7e7c9c;font-size:12px;margin-top:48px}.main{font-size:34px;font-weight:800;margin:18px 0;color:#16234a}.recipient{font-size:24px;font-weight:800;color:#6253da;margin:20px 0}.copy{line-height:1.85;color:#50607a}.foot{display:flex;gap:25px;align-items:center;justify-content:space-between;border-top:1px solid #dedff0;padding-top:18px;margin-top:40px}.code{font-size:11px;color:#586481;line-height:1.9}.qr{width:105px;height:105px}.action{display:block;margin:20px auto;background:#6658e9;color:#fff;border:0;border-radius:9px;padding:13px 25px;font-weight:750;cursor:pointer}@media print{body{background:white}.sheet{box-shadow:none;border:8px solid #e8e6ff;margin:0;max-width:none;min-height:250mm}.action{display:none}}</style></head><body>',
 '<button class="action" onclick="window.print()">Print / Save as PDF</button>',
 '<main class="sheet"><div class="brand">ϟ HackSphere.</div><div class="over">OFFICIAL HACKSPHERE DOCUMENT</div>',
 '<div class="main">'+esc(titleText)+'</div><p>Issued to</p><div class="recipient">'+esc(name)+'</div>',
 '<p class="copy">'+esc(bodyText)+'</p>',
 '<p class="copy"><b>Program:</b> '+esc(program?.title||"HackSphere Program")+'</p>',
 '<p class="copy"><b>Program start:</b> '+date(program?.start_date)+'</p>',
 '<div class="foot"><div class="code"><b>Document ID</b><br>'+esc(code)+'<br><b>Verify online:</b> '+esc(verifiedUrl)+'</div>',
 '<div class="qr" id="qrcode"></div></div></main>',
 '<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>',
 '<script>if(window.QRCode)new QRCode(document.getElementById("qrcode"),{text:'+JSON.stringify(verifiedUrl)+',width:100,height:100});</script>',
 '</body></html>'
 ].join("");
 const win=window.open("","_blank");
 if(!win){notice("Please allow popups to open your PDF document.","error");return}
 win.document.open();win.document.write(html);win.document.close();
}
async function showVerification(code){
 const old=document.getElementById("verify-overlay");if(old)old.remove();
 let heading="Document verification",body="";
 if(!db){body='<div class="alert warning">Database verification is unavailable.</div>'}
 else {
   try{
    let r=await db.rpc("verify_hacksphere_document",{document_code:code});
    if(r.error)throw r.error;
    let d=r.data||{};
    body=d.valid?[
      '<div class="alert success">✓ Verified HackSphere '+esc(d.kind?.replace("_"," "))+'</div>',
      '<p><b>Holder:</b> '+esc(d.holder_name)+'</p>',
      '<p><b>Program:</b> '+esc(d.program)+'</p>',
      '<p><b>Document ID:</b> '+esc(d.code)+'</p>',
      '<p><b>Status:</b> '+esc(d.status)+'</p>'
    ].join(""):'<div class="alert warning">No currently valid HackSphere document matches this ID.</div>';
   }catch(error){body='<div class="alert warning">'+esc(error.message)+'</div>'}
 }
 let modal=document.createElement("div");modal.className="modal-layer";modal.id="verify-overlay";
 modal.innerHTML='<div class="modal" role="dialog" aria-modal="true"><button class="icon-button modal-close" data-action="close-verify">✕</button><div class="logo" style="margin:auto">ϟ</div><h2>'+heading+'</h2>'+body+'<button class="btn btn-outline" data-action="close-verify">Close</button></div>';
 document.body.append(modal);
}
function mySubmissions(){
 let mine=D.submissions.filter(x=>x.student_id===user.id);
 let unlocked=D.timeline_events.filter(x=>D.enrollments.some(e=>e.program_id===x.program_id&&e.student_id===user.id)&&
 ["assignment","project","milestone"].includes(x.activity_type)&&x.scheduled_date<=today());
 let pending=unlocked.filter(x=>!mine.some(sub=>sub.event_id===x.id));
 let todo=pending.map(x=>'<article class="task-card"><span class="task-icon">▤</span><div><b>'+esc(x.title)+'</b><small>'+esc(p(x.program_id)?.title||"Program")+' • '+date(x.scheduled_date)+'</small></div>'+click("Open","open-course",x.program_id,"btn-primary")+'</article>').join("");
 let done=mine.map(x=>{let t=D.timeline_events.find(y=>y.id===x.event_id);return row("✓",t?.title||"Assignment",x.status+' • '+date(x.submitted_at?.slice(0,10)),tag(x.status))}).join("");
 return title("Assignments & submissions","A focused inbox for your project work and trainer feedback.")+
 '<div class="stat-grid">'+
 '<div class="stat"><span class="sicon">▥</span><b>'+pending.length+'</b><small>Available tasks</small></div>'+
 '<div class="stat"><span class="sicon">✓</span><b>'+mine.length+'</b><small>Submitted work</small></div>'+
 '<div class="stat"><span class="sicon">◎</span><b>'+D.evaluations.filter(x=>x.student_id===user.id).length+'</b><small>Reviews</small></div>'+
 '<div class="stat"><span class="sicon">▦</span><b>'+selectedPrograms().length+'</b><small>My courses</small></div></div>'+
 '<div class="two-col"><div>'+card("Ready for submission",todo||empty("All caught up","New activities appear according to your daily learning timetable."))+
 '</div><div>'+card("Previous submissions",done||empty("Nothing submitted yet","Open a released assignment inside your classroom."))+'</div></div>';
}
function profilePage(){
 let name=user.user_metadata?.full_name||D.profiles.find(x=>x.id===user.id)?.full_name||'HackSphere member';
 let accountRoles=demo?["student","trainer","guide","admin"]:["student",...D.staff_roles.filter(x=>x.user_id===user.id).map(x=>x.role)];
 return title("My Google account","Secure account details and your authorized HackSphere roles.")+
 '<div class="profile-hero"><span class="profile-large-avatar">'+esc(name.slice(0,2).toUpperCase())+'</span><div><h2>'+esc(name)+'</h2><p>'+esc(user.email||"Connected with Google")+'</p><div class="form-actions">'+accountRoles.map(x=>'<span class="pill green">'+esc(x)+'</span>').join("")+'</div></div></div>'+
 '<div class="equal-col"><div>'+card("Account security",
 row("✓","Authentication provider","Google OAuth",tag("Connected"))+
 row("♙","Email",user.email||"Not available")+
 row("▦","Permissions","Only authorized Admin can change staff roles."))+'</div><div>'+
 card("Public display name",'<form data-kind="profile">'+field("Name","full_name","text",name,true)+
 '<div class="alert">This name is displayed in the LMS. Changing it cannot add staff or Admin access.</div>'+
 '<button class="btn btn-primary">Update name</button></form>')+
 '</div></div>';
}
function refreshProgramPreview(form){
 let t=Number(form.querySelector('[name="training_days"]')?.value||0), i=Number(form.querySelector('[name="internship_days"]')?.value||0);
 let start=form.querySelector('[name="start_date"]')?.value;
 let set=(id,value)=>{let e=document.getElementById(id);if(e)e.textContent=value};
 set("preview-training-days",t+" days");set("preview-intern-days",i+" days");
 let track=document.getElementById("preview-training-bar");if(track)track.style.width=Math.round(t/Math.max(1,t+i)*100)+"%";
 set("preview-start",start?date(start):"Choose a start date");
 set("preview-intern-start",start&&t>0?date(day(start,t)):"Calculated automatically");
}

function settings(){return title("Website settings","Manage official UPI instructions and integration status.")+card("Payment configuration",upiForm())+card("Google OAuth & Meet","Google Cloud OAuth client credentials are required for sign-in and automated Google Meet creation.")}
document.addEventListener("click",async e=>{let b=e.target.closest("[data-action]");if(!b)return;let a=b.dataset.action,id=b.dataset.id;if(a==="login")loginDialog();else if(a==="close-login")hideDialog();else if(a==="google-login")signIn();else if(a==="demo")demoOpen();else if(a==="toggle-public-menu")$("mobile-links").hidden=!$("mobile-links").hidden;else if(a==="open-drawer")$("app-shell").classList.add("drawer-open");else if(a==="close-drawer")$("app-shell").classList.remove("drawer-open");else if(a==="signout")signOut();else if(a==="home")publicPage();else if(a==="navigate"){navigateTo(b.dataset.view)}else if(a==="open-course"){navigateTo("courses",id)}else if(a==="close-course"){navigateTo("courses")}else if(a==="lesson"){lesson=id;render()}else if(a==="enroll-public"){if(!user)loginDialog();else{navigateTo("enrollment");open()}}else if(a==="timeline-prev"){timelineOffset=Math.max(0,timelineOffset-1);render()}else if(a==="timeline-next"){timelineOffset=(timelineOffset+1)%Math.ceil(total(p(course||selectedPrograms()[0]?.id))/14);render()}else if(a==="secure-resource"){let event=D.timeline_events.find(x=>x.id===id);if(!event?.resource_url)return;let path=event.resource_url.replace("storage://hacksphere-course-files/","");if(demo){notice("Preview only — no private recording file is stored.");return}let r=await db.storage.from("hacksphere-course-files").createSignedUrl(path,600);if(r.error){notice(r.error.message,"error");return}if(/\.(mp4|webm)$/i.test(path)){let player=$("course-player");player.innerHTML='<video controls autoplay playsinline src="'+esc(r.data.signedUrl)+'"></video>';}else window.open(r.data.signedUrl,"_blank","noopener,noreferrer")}else if(a==="program-new"){navigateTo("program-new")}
else if(a==="program-detail"){navigateTo("program-detail",id)}else if(a==="program-edit"){navigateTo("program-edit",id)}
else if(a==="program-timeline"){navigateTo("timeline",id)}
else if(a==="staff-invite"){navigateTo("staff-invite")}
else if(a==="payment-history"){navigateTo("payment-history")}
else if(a==="payment-settings"){navigateTo("payment-settings")}
else if(a==="profile"){navigateTo("profile")}
else if(a==="publish"){let x=p(id);await save("programs",{status:x.status==="draft"?"published":"draft"},id)}else if(a==="proof"){let claim=D.payment_claims.find(x=>x.id===id);if(!claim?.proof_path){notice("No screenshot attached.","error");return}if(demo){notice("Screenshot is not available in preview mode.");return}let r=await db.storage.from("hacksphere-payment-proofs").createSignedUrl(claim.proof_path,300);if(r.error)notice(r.error.message,"error");else window.open(r.data.signedUrl,"_blank","noopener,noreferrer")}else if(a==="approve-pay"||a==="reject-pay"){if(a==="approve-pay"&&!confirm("Have you personally verified the actual bank credit for this transaction?"))return;await save("payment_claims",{status:a==="approve-pay"?"approved":"rejected",reviewed_by:user.id,reviewed_at:new Date().toISOString()},id)}else if(a==="letter"){printCredential("offer_letter",id)}else if(a==="certificate-print"){printCredential("certificate",id)}else if(a==="check-code"){let code=prompt("Enter your HackSphere document ID");if(code)showVerification(code)}else if(a==="close-verify"){document.getElementById("verify-overlay")?.remove()}else if(a==="review-approve"||a==="review-changes"){await save("submissions",{status:a==="review-approve"?"approved":"changes_requested"},id)}else if(a==="certificate"){let x=D.completion_recommendations.find(x=>x.id===id);if(x&&x.recommendation==="recommended"&&confirm("Approve final certificate?"))await save("certificates",{student_id:x.student_id,program_id:x.program_id,approved_by:user.id})}else if(a==="join"){notice("Google Meet account authorization is pending.","error")}});
document.addEventListener("change",e=>{if(e.target.id==="role-switch"){role=e.target.value;navigateTo("overview")}});
document.addEventListener("input",e=>{if(e.target.closest('form[data-kind="program"]'))refreshProgramPreview(e.target.closest('form[data-kind="program"]'));if(e.target.id==="catalog-search"){search=e.target.value;drawCatalog()}});
document.addEventListener("click",e=>{let b=e.target.closest("[data-filter]");if(!b)return;filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x.dataset.filter===filter));drawCatalog()});
document.addEventListener("submit",async e=>{let form=e.target.closest("form[data-kind]");if(!form)return;e.preventDefault();let f=Object.fromEntries(new FormData(form).entries()),type=form.dataset.kind;
if(type==="program"){f.training_days=+f.training_days;f.internship_days=+f.internship_days;f.fee_inr=+f.fee_inr;f.created_by=user.id;await save("programs",f);navigateTo("programs")}
else if(type==="program-edit"){f.training_days=+f.training_days;f.internship_days=+f.internship_days;f.fee_inr=+f.fee_inr;let id=form.dataset.program;if(id){await save("programs",f,id);navigateTo("program-detail",id)}}
else if(type==="profile"){await save("profiles",{full_name:f.full_name},user.id)}
else if(type==="activity"){f.created_by=user.id;await save("timeline_events",f)}
else if(type==="session"){f.duration_minutes=+f.duration_minutes;f.trainer_user_id=user.id;await save("live_sessions",f)}
else if(type==="submission"){f.student_id=user.id;f.event_id=form.dataset.event;await save("submissions",f)}
else if(type==="media-upload"){
 let file=form.querySelector('input[name="resource_file"]')?.files?.[0];
 let allowed=["application/pdf","video/mp4","video/webm","image/png","image/jpeg"];
 if(!file||!allowed.includes(file.type)||file.size>104857600){notice("Choose a supported file under 100 MB.","error");return}
 let eventId=form.dataset.event,programId=form.dataset.program,extension={"application/pdf":"pdf","video/mp4":"mp4","video/webm":"webm","image/png":"png","image/jpeg":"jpg"}[file.type];
 let path=programId+"/"+eventId+"/"+crypto.randomUUID()+"."+extension;
 if(demo){await save("timeline_events",{resource_url:"storage://hacksphere-course-files/"+path},eventId);return}
 let result=await db.storage.from("hacksphere-course-files").upload(path,file,{contentType:file.type,cacheControl:"3600",upsert:false});
 if(result.error){notice(result.error.message,"error");return}
 await save("timeline_events",{resource_url:"storage://hacksphere-course-files/"+path},eventId);
}

else if(type==="score"){f.score=+f.score;f.max_score=+f.max_score;f.evaluator_id=user.id;await save("evaluations",f)}
else if(type==="payment"){const file=form.querySelector('input[name="proof_file"]')?.files?.[0];if(!file||!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5242880){notice("Upload a valid screenshot under 5 MB.","error");return}delete f.proof_file;f.student_id=user.id;f.amount_inr=p(f.program_id).fee_inr;if(demo){f.proof_path="demo-student/preview.png";await save("payment_claims",f)}else{const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";const path=user.id+"/"+crypto.randomUUID()+"."+ext;let uploaded=await db.storage.from("hacksphere-payment-proofs").upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error){notice(uploaded.error.message,"error");return}f.proof_path=path;await save("payment_claims",f)}}
else if(type==="upi"){upi=f;await save("site_settings",{key:"payments_upi",value:f,updated_by:user.id})}
else if(type==="invite"){let email=f.email.toLowerCase();if(f.trainer)await save("staff_invitations",{email,role:"trainer",created_by:user.id});if(f.guide)await save("staff_invitations",{email,role:"guide",created_by:user.id})}
else if(type==="trainer"){f.role="trainer";f.assigned_by=user.id;await save("program_staff",f)}
else if(type==="guide"){f.allocated_by=user.id;await save("guide_allocations",f)}
else if(type==="recommend"){f.guide_user_id=user.id;await save("completion_recommendations",f)}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){hideDialog();$("app-shell").classList.remove("drawer-open")}});
async function init(){try{let r=await fetch("/api/config",{cache:"no-store"}),config=await r.json();if(config.supabaseUrl&&config.supabasePublishableKey&&window.supabase){db=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);let x=await db.auth.getUser();if(x.data.user){user=x.data.user;await reload();if(location.pathname==="/"&&D.staff_roles.some(r=>r.user_id===user.id&&r.role==="admin"))role="admin";open()}else catalog();let verify=new URLSearchParams(location.search).get("verify");if(verify)showVerification(verify)}else drawCatalog()}catch(e){console.warn(e);drawCatalog()}}
init();
})();