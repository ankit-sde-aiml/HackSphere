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
const title=(h,d)=>'<div class="page-title"><div><span class="eyebrow">HACKSPHERE WORKSPACE</span><h1>'+esc(h)+'</h1><p>'+esc(d)+"</p></div></div>";
const field=(name,id,type="text",val="",required=false)=>'<label class="field"><span>'+esc(name)+'</span><input class="input" name="'+id+'" type="'+type+'" value="'+esc(val)+'" '+(required?"required":"")+"></label>";
const choose=(name,id,values)=>'<label class="field"><span>'+esc(name)+'</span><select name="'+id+'" class="input">'+values.map(v=>'<option value="'+esc(v[0])+'">'+esc(v[1])+"</option>").join("")+"</select></label>";
const notes=(name,id)=>'<label class="field"><span>'+esc(name)+'</span><textarea class="input" name="'+id+'"></textarea></label>';
const click=(name,action,id="",kind="btn-light")=>'<button class="btn btn-small '+kind+'" data-action="'+action+'" data-id="'+esc(id)+'">'+esc(name)+"</button>";
const keys=["programs","enrollments","payment_claims","timeline_events","live_sessions","staff_roles","staff_invitations","program_staff","guide_allocations","submissions","evaluations","completion_recommendations","certificates","profiles","site_settings"];
let db=null,user=null,demo=false,role="student",page="overview",course=null,lesson=null,filter="All",search="",upi={},timelineOffset=0;
let D={};const reset=()=>{D=Object.fromEntries(keys.map(k=>[k,[]]))};reset();
const p=id=>D.programs.find(x=>x.id===id);
const who=id=>{let x=D.profiles.find(x=>x.id===id);return x?.full_name||x?.email||String(id||"Student").slice(0,9)};
const total=x=>Number(x.training_days)+Number(x.internship_days);
const current=x=>Math.max(0,Math.min(total(x),Math.floor((new Date(today())-new Date(x.start_date))/86400000)+1));
const enrolled=x=>demo||D.enrollments.some(y=>y.program_id===x.id&&y.student_id===user?.id&&y.status==="active");
const selectedPrograms=()=>demo||role==="admin"?D.programs:role==="trainer"?D.programs.filter(x=>D.program_staff.some(y=>y.program_id===x.id&&y.user_id===user.id)):role==="guide"?D.programs.filter(x=>D.guide_allocations.some(y=>y.program_id===x.id&&y.guide_user_id===user.id)):D.programs.filter(enrolled);
const options=arr=>arr.map(x=>[x.id,x.title]);
const menu={student:[["overview","◈","Overview"],["courses","▦","My programs"],["timeline","▤","Daily timeline"],["enrollment","◫","Enrollment"],["performance","◎","My performance"],["documents","✧","Documents"]],trainer:[["overview","◈","Overview"],["courses","▦","My programs"],["timeline","▤","Training lessons"],["sessions","▷","Live classes"],["reviews","▥","Review submissions"],["performance","◎","Student scores"]],guide:[["overview","◈","Overview"],["courses","▦","My programs"],["timeline","▤","Internship timeline"],["reviews","▥","Project reviews"],["performance","◎","Internship scores"],["complete","✧","Completion reviews"]],admin:[["overview","◈","Overview"],["programs","▦","Programs"],["students","♧","Students"],["timeline","▤","Timeline manager"],["sessions","▷","Live classes"],["reviews","▥","Submissions"],["payments","◫","Payment approvals"],["staff","♙","Staff & roles"],["guides","◇","Guide allocation"],["performance","◎","Scores"],["complete","✧","Certificates"],["settings","⚙","Settings"]]};
function seed(){let a=day(today(),-27),b=day(today(),-69);D.programs=[{id:"demo-stack",title:"Full Stack Development",description:"Learn to build practical applications.",start_date:a,training_days:60,internship_days:30,fee_inr:2999,mode:"Hybrid",status:"ongoing"},{id:"demo-design",title:"UI/UX Design",description:"Product thinking and portfolio projects.",start_date:b,training_days:45,internship_days:30,fee_inr:1999,mode:"Hybrid",status:"ongoing"}];D.profiles=[{id:"demo-student",full_name:"Preview Learner",email:"student@example.com"},{id:"demo-trainer",full_name:"Sample Trainer",email:"trainer@example.com"},{id:"demo-guide",full_name:"Sample Guide",email:"guide@example.com"}];D.enrollments=[{id:"demo-enroll",program_id:"demo-stack",student_id:"demo-student",status:"active",offer_letter_code:"HS-OL-PREVIEW"},{id:"demo-enroll2",program_id:"demo-design",student_id:"demo-student",status:"active"}];D.program_staff=[{program_id:"demo-stack",user_id:"demo-trainer"}];D.staff_roles=[{user_id:"demo-trainer",role:"trainer"},{user_id:"demo-guide",role:"guide"}];D.guide_allocations=[{id:"demo-guide-link",program_id:"demo-design",student_id:"demo-student",guide_user_id:"demo-guide"}];for(let i=0;i<90;i+=3)D.timeline_events.push({id:"d"+i,program_id:"demo-stack",phase:i<60?"training":"internship",activity_type:i<60?"lecture":"project",scheduled_date:day(a,i),title:i<60?["HTML & CSS foundations","JavaScript essentials","React components","Developer workflow"][i/3%4]:"Internship project milestone "+(i-59),description:"Practice and submit your scheduled activity."});D.live_sessions=[{id:"demo-live",program_id:"demo-stack",title:"JavaScript Functions & Scope",session_date:today(),start_time:"19:00",status:"scheduled"}];D.payment_claims=[{id:"demo-pay",program_id:"demo-stack",student_id:"demo-student",amount_inr:2999,status:"approved",utr:"PREVIEW00001"}];D.evaluations=[{id:"demo-score",program_id:"demo-stack",student_id:"demo-student",phase:"training",activity_title:"HTML assignment",score:8,max_score:10,feedback:"Great progress!"}];upi={upi_id:"preview@upi",payee:"Preview only — do not pay"}}
function loginDialog(){ $("login-modal").hidden=false;document.body.style.overflow="hidden"}
function hideDialog(){ $("login-modal").hidden=true;document.body.style.overflow=""}
function publicPage(){ $("marketing").hidden=false;$("app-shell").hidden=true;window.scrollTo(0,0)}
function demoOpen(){demo=true;reset();seed();user={id:"demo-student",email:"student@example.com",user_metadata:{full_name:"Preview Learner"}};role="student";page="overview";course=null;hideDialog();open();notice("Preview only — no real user data will be modified.","success")}
function open(){hideDialog();$("marketing").hidden=true;$("app-shell").hidden=false;window.scrollTo(0,0);render()}
async function signIn(){if(!db){$("login-notice").textContent="Google Sign-In will be enabled when the website administrator configures the Google Cloud OAuth Client ID and Secret in Supabase. You can explore Dashboard Preview meanwhile.";return}let r=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/",queryParams:{prompt:"select_account"}}});if(r.error)notice(r.error.message,"error")}
async function signOut(){if(db&&!demo)await db.auth.signOut();user=null;demo=false;reset();publicPage();catalog()}
async function reload(){if(!db||!user||demo)return;await Promise.all(keys.map(async k=>{try{let r=await db.from(k).select("*").limit(900);D[k]=r.error?[]:r.data||[]}catch(e){D[k]=[]}}));try{await db.rpc("accept_my_staff_invitation");let r=await db.from("staff_roles").select("*");if(!r.error)D.staff_roles=r.data||[]}catch(e){}try{let r=await db.rpc("get_payment_instructions");if(!r.error)upi=r.data||{}}catch(e){}}
async function save(t,obj,id){if(demo){if(id)D[t]=D[t].map(x=>x.id===id?{...x,...obj}:x);else D[t].unshift({id:"preview-"+Math.random().toString(36).slice(2),...obj});notice("Updated in preview mode only.","success");render();return}if(!db||!user){notice("Sign in first.","error");return}try{let r=id?await db.from(t).update(obj).eq("id",id):t==="site_settings"?await db.from(t).upsert(obj,{onConflict:"key"}):await db.from(t).insert(obj);if(r.error)throw r.error;notice("Saved successfully.","success");await reload();render()}catch(e){notice(e.message,"error")}}
function catalog(){if(!db){drawCatalog();return}db.from("programs").select("*").in("status",["published","ongoing"]).limit(100).then(r=>{if(!r.error)D.programs=r.data||[];drawCatalog()}).catch(drawCatalog)}
function drawCatalog(){let arr=D.programs.filter(x=>["published","ongoing"].includes(x.status)&&(filter==="All"||x.mode===filter)&&String(x.title+" "+x.description).toLowerCase().includes(search.toLowerCase()));$("catalog").innerHTML=arr.length?arr.map((x,i)=>'<article class="course-card"><div class="course-art '+["","blue","green"][i%3]+'">✦</div><div class="course-body"><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||"Practical learning and project internship")+'</p><div class="course-meta"><span>◷ '+total(x)+' days</span><span>Starts '+date(x.start_date)+'</span><span>'+esc(x.mode)+'</span></div><div class="course-footer"><strong>'+money(x.fee_inr)+'</strong>'+click("View & enroll","enroll-public",x.id,"btn-primary")+"</div></div></article>").join(""):'<div class="catalog-empty"><div class="feature-icon">✧</div><h3>Programs launching soon</h3><p>New programs will appear here when published by HackSphere administration.</p><button class="btn btn-primary" data-action="demo">Preview the learning platform ↗</button></div>'}
function render(){if(!user)return;let roles=demo?["student","trainer","guide","admin"]:["student",...new Set(D.staff_roles.filter(x=>x.user_id===user.id).map(x=>x.role))];if(!roles.includes(role))role=roles.includes("admin")?"admin":roles.includes("trainer")?"trainer":roles.includes("guide")?"guide":"student";if(!menu[role].some(x=>x[0]===page))page="overview";$("role-switch").innerHTML=roles.map(x=>'<option '+(role===x?"selected":"")+' value="'+x+'">'+({student:"Student",trainer:"Trainer",guide:"Internship Guide",admin:"Administrator"})[x]+"</option>").join("");$("side-nav").innerHTML=menu[role].map(([v,i,l])=>'<button class="'+(page===v?"active":"")+'" data-action="navigate" data-view="'+v+'"><span>'+i+"</span>"+l+"</button>").join("");$("side-role").textContent=({student:"Student portal",trainer:"Trainer workspace",guide:"Internship guide",admin:"Administration"})[role];let label=menu[role].find(x=>x[0]===page)[2];$("section-label").textContent=label;$("crumb").textContent=label.toUpperCase();let name=user.user_metadata?.full_name||user.email?.split("@")[0]||"Learner";$("user-display").textContent=name;$("user-avatar").textContent=name.slice(0,2).toUpperCase();$("demo-pill").hidden=!demo;$("app-page").innerHTML=course?classroom():({overview:overview,courses:courses,programs:programAdmin,timeline:timeline,sessions:sessions,reviews:reviews,students:students,payments:payments,staff:staff,guides:guides,performance:performance,complete:complete,documents:documents,enrollment:enrollment,settings:settings}[page]||overview)()}
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
function programAdmin(){return title("Program management","Create independent programs with their own start dates, fees and learning schedules.")+'<div class="equal-col"><div>'+card("Create program",'<form data-kind="program">'+field("Program name","title","text","",true)+notes("Description","description")+'<div class="form-grid">'+field("Start date","start_date","date","",true)+field("Fee INR","fee_inr","number","0",true)+field("Training days","training_days","number","60",true)+field("Internship days","internship_days","number","30",true)+choose("Mode","mode",[["Hybrid","Live + Recorded"],["Live","Live only"],["Recorded","Recorded only"]])+choose("Status","status",[["draft","Draft"],["published","Published"]])+'</div><button class="btn btn-primary">Create program</button></form>')+'</div><div>'+card("Existing programs",D.programs.length?D.programs.map(x=>row("▦",x.title,x.training_days+" + "+x.internship_days+" days · "+money(x.fee_inr),click(x.status==="draft"?"Publish":"Unpublish","publish",x.id))).join(""):empty("No programs","Create a program to get started."))+"</div></div>"}
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
function payments(){return title("Payment approvals","Verify actual bank credit before approving UPI claims.")+'<div class="two-col"><div>'+card("Pending payments",D.payment_claims.filter(x=>x.status==="pending").map(x=>row("◫",who(x.student_id),money(x.amount_inr)+" • "+x.utr,click("View screenshot","proof",x.id)+click("Approve","approve-pay",x.id,"btn-primary")+click("Reject","reject-pay",x.id))).join("")||empty("No pending claims","Payment queue is clear."))+'</div><div>'+card("UPI payment setup",upiForm())+"</div></div>"}
function staff(){let trs=D.staff_roles.filter(x=>x.role==="trainer");return title("Staff management","Invite Google identities with Trainer and/or Internship Guide roles.")+'<div class="equal-col"><div>'+card("Invite staff",'<form data-kind="invite">'+field("Google email","email","email","",true)+'<label class="checkbox"><input type="checkbox" name="trainer"> Trainer</label><label class="checkbox"><input type="checkbox" name="guide"> Internship Guide</label><button class="btn btn-primary">Create invitation</button></form><div class="alert">Invited staff signs in using the exact Google account. Email delivery needs a verified sending domain.</div>')+'</div><div>'+card("Assign program Trainer",'<form data-kind="trainer">'+choose("Program","program_id",options(D.programs))+choose("Trainer","user_id",trs.map(x=>[x.user_id,who(x.user_id)]))+'<button class="btn btn-primary">Assign Trainer</button></form>')+"</div></div>"+card("Staff roles",D.staff_roles.map(x=>row("♙",who(x.user_id),x.role,tag("Assigned"))).join("")||empty("No staff yet","Invite your first trainer or guide."))}
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
function settings(){return title("Website settings","Manage official UPI instructions and integration status.")+card("Payment configuration",upiForm())+card("Google OAuth & Meet","Google Cloud OAuth client credentials are required for sign-in and automated Google Meet creation.")}
document.addEventListener("click",async e=>{let b=e.target.closest("[data-action]");if(!b)return;let a=b.dataset.action,id=b.dataset.id;if(a==="login")loginDialog();else if(a==="close-login")hideDialog();else if(a==="google-login")signIn();else if(a==="demo")demoOpen();else if(a==="toggle-public-menu")$("mobile-links").hidden=!$("mobile-links").hidden;else if(a==="open-drawer")$("app-shell").classList.add("drawer-open");else if(a==="close-drawer")$("app-shell").classList.remove("drawer-open");else if(a==="signout")signOut();else if(a==="home")publicPage();else if(a==="navigate"){page=b.dataset.view;course=null;$("app-shell").classList.remove("drawer-open");render()}else if(a==="open-course"){course=id;render()}else if(a==="close-course"){course=null;render()}else if(a==="lesson"){lesson=id;render()}else if(a==="enroll-public"){if(!user)loginDialog();else{page="enrollment";course=null;open()}}else if(a==="timeline-prev"){timelineOffset=Math.max(0,timelineOffset-1);render()}else if(a==="timeline-next"){timelineOffset=(timelineOffset+1)%Math.ceil(total(p(course||selectedPrograms()[0]?.id))/14);render()}else if(a==="secure-resource"){let event=D.timeline_events.find(x=>x.id===id);if(!event?.resource_url)return;let path=event.resource_url.replace("storage://hacksphere-course-files/","");if(demo){notice("Preview only — no private recording file is stored.");return}let r=await db.storage.from("hacksphere-course-files").createSignedUrl(path,600);if(r.error){notice(r.error.message,"error");return}if(/\.(mp4|webm)$/i.test(path)){let player=$("course-player");player.innerHTML='<video controls autoplay playsinline src="'+esc(r.data.signedUrl)+'"></video>';}else window.open(r.data.signedUrl,"_blank","noopener,noreferrer")}else if(a==="publish"){let x=p(id);await save("programs",{status:x.status==="draft"?"published":"draft"},id)}else if(a==="proof"){let claim=D.payment_claims.find(x=>x.id===id);if(!claim?.proof_path){notice("No screenshot attached.","error");return}if(demo){notice("Screenshot is not available in preview mode.");return}let r=await db.storage.from("hacksphere-payment-proofs").createSignedUrl(claim.proof_path,300);if(r.error)notice(r.error.message,"error");else window.open(r.data.signedUrl,"_blank","noopener,noreferrer")}else if(a==="approve-pay"||a==="reject-pay"){if(a==="approve-pay"&&!confirm("Have you personally verified the actual bank credit for this transaction?"))return;await save("payment_claims",{status:a==="approve-pay"?"approved":"rejected",reviewed_by:user.id,reviewed_at:new Date().toISOString()},id)}else if(a==="letter"){printCredential("offer_letter",id)}else if(a==="certificate-print"){printCredential("certificate",id)}else if(a==="check-code"){let code=prompt("Enter your HackSphere document ID");if(code)showVerification(code)}else if(a==="close-verify"){document.getElementById("verify-overlay")?.remove()}else if(a==="review-approve"||a==="review-changes"){await save("submissions",{status:a==="review-approve"?"approved":"changes_requested"},id)}else if(a==="certificate"){let x=D.completion_recommendations.find(x=>x.id===id);if(x&&x.recommendation==="recommended"&&confirm("Approve final certificate?"))await save("certificates",{student_id:x.student_id,program_id:x.program_id,approved_by:user.id})}else if(a==="join"){notice("Google Meet account authorization is pending.","error")}});
document.addEventListener("change",e=>{if(e.target.id==="role-switch"){role=e.target.value;page="overview";course=null;render()}});
document.addEventListener("input",e=>{if(e.target.id==="catalog-search"){search=e.target.value;drawCatalog()}});
document.addEventListener("click",e=>{let b=e.target.closest("[data-filter]");if(!b)return;filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x.dataset.filter===filter));drawCatalog()});
document.addEventListener("submit",async e=>{let form=e.target.closest("form[data-kind]");if(!form)return;e.preventDefault();let f=Object.fromEntries(new FormData(form).entries()),type=form.dataset.kind;
if(type==="program"){f.training_days=+f.training_days;f.internship_days=+f.internship_days;f.fee_inr=+f.fee_inr;f.created_by=user.id;await save("programs",f)}
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
async function init(){try{let r=await fetch("/api/config",{cache:"no-store"}),config=await r.json();if(config.supabaseUrl&&config.supabasePublishableKey&&window.supabase){db=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);let x=await db.auth.getUser();if(x.data.user){user=x.data.user;await reload();open()}else catalog();let verify=new URLSearchParams(location.search).get("verify");if(verify)showVerification(verify)}else drawCatalog()}catch(e){console.warn(e);drawCatalog()}}
init();
})();