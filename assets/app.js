(()=>{"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
const date=x=>x?new Date(String(x).slice(0,10)+"T00:00:00Z").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}):"—";
const day=(x,n)=>{let d=new Date(x+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const today=()=>new Date(Date.now()+19800000).toISOString().slice(0,10);
const programToday=program=>{try{const values=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:program?.timezone||"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(x=>[x.type,x.value]));return values.year+"-"+values.month+"-"+values.day}catch(e){return today()}};
const notice=(s,k="")=>{let x=document.createElement("div");x.className="toast "+k;x.textContent=s;$("toasts").append(x);setTimeout(()=>x.remove(),4500)};
const tag=s=>'<span class="pill">'+esc(s)+"</span>";
const empty=(t,d)=>'<div class="empty"><div class="empty-icon">✧</div><h3>'+esc(t)+'</h3><p>'+esc(d)+"</p></div>";
const card=(h,b)=>'<section class="panel"><div class="panel-head"><h3>'+esc(h)+'</h3></div>'+b+"</section>";
const row=(icon,t,d,r="")=>'<div class="list-row"><span class="row-icon">'+icon+'</span><div class="row-body"><strong>'+esc(t)+'</strong><small>'+esc(d)+'</small></div>'+r+"</div>";
const title=(h,d,actions="")=>'<div class="page-title"><div><h1>'+esc(h)+'</h1><p>'+esc(d)+'</p></div>'+(actions?'<div class="form-actions">'+actions+'</div>':"")+'</div>';
const field=(name,id,type="text",val="",required=false)=>'<label class="field"><span>'+esc(name)+'</span><input class="input" name="'+id+'" type="'+type+'" value="'+esc(val)+'" '+(required?"required":"")+"></label>";
const choose=(name,id,values,selected=null)=>'<label class="field"><span>'+esc(name)+'</span><select name="'+id+'" class="input">'+values.map(v=>'<option value="'+esc(v[0])+'" '+(selected===v[0]?"selected":"")+' >'+esc(v[1])+"</option>").join("")+"</select></label>";
const notes=(name,id,initial="")=>'<label class="field"><span>'+esc(name)+'</span><textarea class="input" name="'+id+'">'+esc(initial)+'</textarea></label>';
const click=(name,action,id="",kind="btn-light")=>'<button class="btn btn-small '+kind+'" data-action="'+action+'" data-id="'+esc(id)+'">'+esc(name)+"</button>";
const keys=["courses","purchases","videos","lesson_resources","programs","enrollments","payment_claims","timeline_events","live_sessions","staff_roles","staff_invitations","program_staff","guide_allocations","submissions","evaluations","completion_recommendations","certificates","profiles","site_settings","program_guides","quizzes","quiz_questions","quiz_attempts"];
let videoStorageReady=false;let db=null,user=null,demo=false,role="student",page="overview",course=null,lesson=null,filter="All",search="",upi={},timelineOffset=0,paymentSection="pending",studentTab="overview",studentQuery="",studentEnrollmentChoice=null,studentCalendarChoice=null;
let D={};const reset=()=>{D=Object.fromEntries(keys.map(k=>[k,[]]))};reset();
const p=id=>D.programs.find(x=>x.id===id);
const who=id=>{let x=D.profiles.find(x=>x.id===id);return x?.full_name||x?.email||String(id||"Student").slice(0,9)};
const total=x=>Number(x.training_days)+Number(x.internship_days);
const current=x=>Math.max(0,Math.min(total(x),Math.floor((new Date(programToday(x))-new Date(x.start_date))/86400000)+1));
const enrolled=x=>demo||D.enrollments.some(y=>y.program_id===x.id&&y.student_id===user?.id&&y.status==="active");
const selectedPrograms=()=>demo||role==="admin"?D.programs:role==="trainer"?D.programs.filter(x=>D.program_staff.some(y=>y.program_id===x.id&&y.user_id===user.id)):role==="guide"?D.programs.filter(x=>D.program_guides.some(y=>y.program_id===x.id&&y.user_id===user.id)||D.guide_allocations.some(y=>y.program_id===x.id&&y.guide_user_id===user.id)):D.programs.filter(enrolled);
const options=arr=>arr.map(x=>[x.id,x.title]);
const menu={student:[["overview","◈","Overview"],["courses","▦","My courses"],["explore","◉","Explore programs"],["timeline","▤","Daily timeline"],["sessions","▷","Live classes"],["submissions","▥","Assignments"],["enrollment","◫","Enrollment"],["performance","◎","My performance"],["documents","✧","Certificates & letters"],["profile","♧","My profile"]],trainer:[["overview","◈","Overview"],["courses","▦","My programs"],["timeline","▤","Training lessons"],["sessions","▷","Live classes"],["reviews","▥","Review submissions"],["performance","◎","Student scores"],["profile","♧","My profile"]],guide:[["overview","◈","Overview"],["courses","▦","My programs"],["timeline","▤","Internship timeline"],["reviews","▥","Project reviews"],["performance","◎","Internship scores"],["complete","✧","Completion reviews"],["profile","♧","My profile"]],admin:[["overview","◈","Overview"],["programs","▦","Programs"],["students","♧","Students"],["timeline","▤","Timeline manager"],["sessions","▷","Live classes"],["reviews","▥","Submissions"],["payments","◫","Payment approvals"],["staff","♙","Staff & roles"],["guides","◇","Guide allocation"],["performance","◎","Scores"],["complete","✧","Certificates"],["settings","⚙","Settings"],["profile","♧","My profile"]]};
function seed(){let a=day(today(),-27),b=day(today(),-69);D.programs=[{id:"demo-stack",title:"Full Stack Development",description:"Learn to build practical applications.",start_date:a,training_days:60,internship_days:30,fee_inr:2999,mode:"Hybrid",status:"ongoing"},{id:"demo-design",title:"UI/UX Design",description:"Product thinking and portfolio projects.",start_date:b,training_days:45,internship_days:30,fee_inr:1999,mode:"Hybrid",status:"ongoing"}];D.profiles=[{id:"demo-student",full_name:"Preview Learner",email:"student@example.com"},{id:"demo-trainer",full_name:"Sample Trainer",email:"trainer@example.com"},{id:"demo-guide",full_name:"Sample Guide",email:"guide@example.com"}];D.enrollments=[{id:"demo-enroll",program_id:"demo-stack",student_id:"demo-student",status:"active",offer_letter_code:"HS-OL-PREVIEW"},{id:"demo-enroll2",program_id:"demo-design",student_id:"demo-student",status:"active"}];D.program_staff=[{program_id:"demo-stack",user_id:"demo-trainer"}];D.staff_roles=[{user_id:"demo-trainer",role:"trainer"},{user_id:"demo-guide",role:"guide"}];D.guide_allocations=[{id:"demo-guide-link",program_id:"demo-design",student_id:"demo-student",guide_user_id:"demo-guide"}];for(let i=0;i<90;i+=3)D.timeline_events.push({id:"d"+i,program_id:"demo-stack",phase:i<60?"training":"internship",activity_type:i<60?"lecture":"project",scheduled_date:day(a,i),title:i<60?["HTML & CSS foundations","JavaScript essentials","React components","Developer workflow"][i/3%4]:"Internship project milestone "+(i-59),description:"Practice and submit your scheduled activity."});D.live_sessions=[{id:"demo-live",program_id:"demo-stack",title:"JavaScript Functions & Scope",session_date:today(),start_time:"19:00",status:"scheduled"}];D.payment_claims=[{id:"demo-pay",program_id:"demo-stack",student_id:"demo-student",amount_inr:2999,status:"approved",utr:"PREVIEW00001"}];D.evaluations=[{id:"demo-score",program_id:"demo-stack",student_id:"demo-student",phase:"training",activity_title:"HTML assignment",score:8,max_score:10,feedback:"Great progress!"}];upi={upi_id:"preview@upi",payee:"Preview only — do not pay"}}

const routePath=()=>"/"+(demo?"preview":"workspace")+"/"+role+"/"+(course&&page==="courses"?"classroom/"+encodeURIComponent(course):course&&["program-detail","program-edit","timeline","course-info"].includes(page)?page+"/"+encodeURIComponent(course):page);
function navigateTo(newPage,programId=null,replace=false){
 page=newPage;course=programId;lesson=null;timelineOffset=0;
 const path=routePath();
 if(location.pathname!==path)history[replace?"replaceState":"pushState"]({},'',path);
 $("app-shell").classList.remove("drawer-open");
 render();window.scrollTo({top:0,behavior:"instant"});
}
function readRoute(){
 let segments=location.pathname.split("/").filter(Boolean);
 if(!["preview","workspace"].includes(segments[0])||segments.length<3)return false; if(segments[0]==="preview"&&!demo)return false; if(segments[0]==="workspace"&&demo)return false;
 let allowedRoles=demo?["student","trainer","guide","admin"]:["student",...new Set(D.staff_roles.filter(x=>x.user_id===user?.id).map(x=>x.role))];
 if(allowedRoles.includes(segments[1]))role=segments[1];
 let requested=segments[2];
 if(requested==="classroom"){page="courses";course=segments[3]||null;}
 else if(["program-detail","program-edit","timeline","course-info"].includes(requested)){page=requested;course=segments[3]||null;}
 else {page=requested;course=null}
 return true;
}
window.addEventListener("popstate",()=>{if(!user){publicPage();return}readRoute();render()});

let previousFocus=null;
function loginDialog(){previousFocus=document.activeElement;$("login-modal").hidden=false;document.body.style.overflow="hidden";document.querySelector('#login-modal [data-action="google-login"]')?.focus()}
function hideDialog(){let wasOpen=!$("login-modal").hidden;$("login-modal").hidden=true;document.body.style.overflow="";if(wasOpen&&previousFocus&&document.contains(previousFocus))previousFocus.focus();previousFocus=null}
function publicPage(){ $("marketing").hidden=false;$("app-shell").hidden=true;$("skip-link").setAttribute("href","#main-content");history.replaceState({},"","/");window.scrollTo(0,0)}
function demoOpen(){demo=true;reset();seed();user={id:"demo-student",email:"student@example.com",user_metadata:{full_name:"Preview Learner"}};role="student";page="overview";course=null;hideDialog();navigateTo("overview",null);open();notice("Preview mode: all example data is isolated from live records.","success")}
function open(){hideDialog();$("marketing").hidden=true;$("app-shell").hidden=false;$("skip-link").setAttribute("href","#app-page");window.scrollTo(0,0);if(!readRoute())navigateTo("overview",null,true);else render()}
async function signIn(){if(!db){$("login-notice").textContent="Google Sign-In will be enabled when the website administrator configures the Google Cloud OAuth Client ID and Secret in Supabase. You can explore Dashboard Preview meanwhile.";return}let r=await db.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+"/",queryParams:{prompt:"select_account"}}});if(r.error)notice(r.error.message,"error")}
async function signOut(){if(db&&!demo)await db.auth.signOut();user=null;demo=false;reset();publicPage();catalog()}
async function reload(){if(!db||!user||demo)return;try{const status=await fetch('/api/videos/status',{cache:'no-store'});videoStorageReady=!!(await status.json()).r2Connected}catch(e){videoStorageReady=false}await Promise.all(keys.map(async k=>{try{let r=await db.from(k).select("*").limit(900);D[k]=r.error?[]:r.data||[]}catch(e){D[k]=[]}}));try{await db.rpc("accept_my_staff_invitation");let r=await db.from("staff_roles").select("*");if(!r.error)D.staff_roles=r.data||[]}catch(e){}try{let r=await db.rpc("get_payment_instructions");if(!r.error)upi=r.data||{}}catch(e){}}
async function save(t,obj,id){if(demo){if(id)D[t]=D[t].map(x=>x.id===id?{...x,...obj}:x);else D[t].unshift({id:"preview-"+Math.random().toString(36).slice(2),...obj});notice("Preview mode only — nothing saved to the live database.","success");render();return true}if(!db||!user){notice("Sign in first.","error");return false}try{let r=id?await db.from(t).update(obj).eq("id",id):t==="site_settings"?await db.from(t).upsert(obj,{onConflict:"key"}):await db.from(t).insert(obj);if(r.error)throw r.error;notice("Saved successfully.","success");await reload();render();return true}catch(e){notice("Save failed: "+e.message,"error");return false}}
function catalog(){if(!db){drawCatalog();return}db.from("programs").select("*").in("status",["published","ongoing"]).limit(100).then(r=>{if(!r.error)D.programs=r.data||[];drawCatalog()}).catch(drawCatalog)}
function drawCatalog(){let arr=D.programs.filter(x=>["published","ongoing"].includes(x.status)&&!x.is_test&&(filter==="All"||x.mode===filter)&&String(x.title+" "+x.description).toLowerCase().includes(search.toLowerCase()));$("catalog").innerHTML=arr.length?arr.map((x,i)=>'<article class="course-card"><div class="course-art '+["","blue","green"][i%3]+'">✦</div><div class="course-body"><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||"Practical learning and project internship")+'</p><div class="course-meta"><span>◷ '+total(x)+' days</span><span>Starts '+date(x.start_date)+'</span><span>'+esc(x.mode)+'</span></div><div class="course-footer"><strong>'+money(x.fee_inr)+'</strong>'+click("View & enroll","enroll-public",x.id,"btn-primary")+"</div></div></article>").join(""):'<div class="catalog-empty"><div class="feature-icon">✧</div><h3>Programs launching soon</h3><p>New programs will appear here when published by HackSphere administration.</p><button class="btn btn-primary" data-action="demo">Preview the learning platform ↗</button></div>'}
function render(){if(!user)return;$("app-shell").classList.toggle("hs-student",role==="student");let roles=demo?["student","trainer","guide","admin"]:["student",...new Set(D.staff_roles.filter(x=>x.user_id===user.id).map(x=>x.role))];if(!roles.includes(role))role=roles.includes("admin")?"admin":roles.includes("trainer")?"trainer":roles.includes("guide")?"guide":"student";let allowedExtra=role==="admin"?["program-new","program-detail","program-edit","staff-invite","payment-history","payment-settings","profile"]:role==="student"?["profile","submissions","course-info"]:["profile"];if(!menu[role].some(x=>x[0]===page)&&!allowedExtra.includes(page))page="overview";$("role-switch").hidden=(role==="student"&&roles.length===1);$("role-switch").innerHTML=roles.map(x=>'<option '+(role===x?"selected":"")+' value="'+x+'">'+({student:"Student",trainer:"Trainer",guide:"Internship Guide",admin:"Administrator"})[x]+"</option>").join("");const navGroups={
 admin:[["Workspace",["overview","programs","students"]],["Learning operations",["timeline","sessions","reviews","performance"]],["Finance & certification",["payments","complete"]],["Team & settings",["staff","guides","settings","profile"]]],
 student:[["My learning",["overview","courses","explore","timeline","sessions","submissions"]],["Account & outcomes",["enrollment","performance","documents","profile"]]],
 trainer:[["Teaching",["overview","courses","timeline","sessions","reviews"]],["Outcomes & account",["performance","profile"]]],
 guide:[["Internship workspace",["overview","courses","timeline","reviews"]],["Evaluation & account",["performance","complete","profile"]]]
};
$("side-nav").innerHTML=navGroups[role].map(([group,ids])=>'<div class="nav-group"><div class="nav-group-label">'+esc(group)+'</div>'+ids.map(id=>{let item=menu[role].find(x=>x[0]===id);if(!item)return "";let [v,i,l]=item;let active=page===v||(page==="course-info"&&v==="explore")||(page==="program-detail"&&v==="programs")||(page==="program-edit"&&v==="programs")||(page==="program-new"&&v==="programs")||(page==="payment-history"&&v==="payments")||(page==="payment-settings"&&v==="payments")||(page==="staff-invite"&&v==="staff");return '<button class="'+(active?"active":"")+'" data-action="navigate" data-view="'+v+'" aria-current="'+(active?"page":"false")+'"><span class="nav-icon">'+i+'</span><span>'+esc(l)+'</span></button>'}).join("")+'</div>').join("");$("side-role").textContent=({student:"Student portal",trainer:"Trainer workspace",guide:"Internship guide",admin:"Administration"})[role];let label=menu[role].find(x=>x[0]===page)?.[2]||({"program-new":"Create Program","program-detail":"Program Workspace","program-edit":"Edit Program","staff-invite":"Invite Staff","payment-history":"Payment History","payment-settings":"Payment Settings",profile:"My Profile",submissions:"Submissions"})[page]||"Workspace";$("section-label").textContent=label;$("crumb").textContent=label.toUpperCase();let name=D.profiles.find(x=>x.id===user.id)?.full_name||user.user_metadata?.full_name||user.email?.split("@")[0]||"Learner";$("user-display").textContent=name;$("user-avatar").textContent=name.slice(0,2).toUpperCase();$("demo-pill").hidden=!demo;
let mobile=$("student-bottom-nav");
if(!mobile){mobile=document.createElement("nav");mobile.id="student-bottom-nav";mobile.className="st-bottom-nav";mobile.setAttribute("aria-label","Student mobile navigation");document.querySelector("#app-shell .app-main").append(mobile)}
mobile.hidden=role!=="student";
if(role==="student"){
 const choices=[["overview","home","Home"],["courses","book","Courses"],["explore","compass","Explore"],["timeline","calendar","Calendar"],["profile","user","Profile"]];
 mobile.innerHTML=choices.map(([key,ico,label])=>'<button class="'+((page===key)||(key==="explore"&&page==="course-info")?'active':'')+'" data-action="navigate" data-view="'+key+'" aria-label="'+label+'">'+stIcon(ico,21)+'<span>'+label+'</span></button>').join("");
}
const view={overview:overview,courses:courses,programs:programAdmin,"program-new":programNew,"program-detail":programDetail,"program-edit":programEdit,timeline:timeline,sessions:sessions,reviews:reviews,students:students,payments:payments,"payment-history":paymentHistory,"payment-settings":paymentSettings,staff:staff,"staff-invite":staffInvite,guides:guides,performance:performance,complete:complete,documents:documents,enrollment:enrollment,settings:settings,profile:profilePage,submissions:mySubmissions};
const studentViews={overview:studentOverview,courses:studentCourses,explore:studentExplore,"course-info":studentProgramInfo,timeline:studentCalendar,enrollment:studentEnrollmentPage,sessions:studentSessions,submissions:studentAssignments,performance:studentPerformance,documents:studentDocuments,profile:studentProfile};
$("app-page").innerHTML=course&&page==="courses"?(role==="student"?studentClassroom():classroom()):
(role==="student"&&studentViews[page]?studentViews[page]():((view[page]||overview)()));
if(role==="student"&&page==="enrollment"&&studentEnrollmentChoice){
 const picker=$("app-page").querySelector('form[data-kind="payment"] select[name="program_id"]');
 if(picker&&Array.from(picker.options).some(o=>o.value===studentEnrollmentChoice))picker.value=studentEnrollmentChoice;
}
}
function overview(){
 const ps=selectedPrograms();
 const first=ps[0];
 const upcoming=D.live_sessions.filter(x=>x.session_date>=today()).sort((a,b)=>xDate(a).localeCompare(xDate(b)))[0];
 const pending=D.payment_claims.filter(x=>x.status==="pending");
 const selfReviews=D.evaluations.filter(x=>x.student_id===user.id);
 const assigned=D.guide_allocations.filter(x=>x.guide_user_id===user.id);
 const relatedTasks=D.submissions.filter(x=>x.status==="submitted");
 const guideStudentCount=new Set(assigned.map(x=>x.student_id)).size;
 const activePrograms=D.programs.filter(x=>["published","ongoing"].includes(x.status));
 let stats=[],heading="",subtitle="",bannerTitle="",bannerDesc="",bannerAction="";
 if(role==="admin"){
  heading="HackSphere control center";subtitle="Your entire learning platform, organized and under control.";
  stats=[["▦",activePrograms.length,"Active programs"],["◫",pending.length,"Pending payments"],["♙",new Set(D.staff_roles.map(x=>x.user_id)).size,"Team members"],["✧",D.completion_recommendations.filter(x=>x.recommendation==="recommended").length,"Completion requests"]];
  bannerTitle="Everything your academy needs.";bannerDesc="Create courses, manage payment approvals, invite teaching staff and oversee every internship in one place.";
  bannerAction='<button class="btn btn-white" data-action="program-new">+ Create program</button>';
 }else if(role==="trainer"){
  heading="Your teaching workspace";subtitle="Manage upcoming lessons, classes and student performance.";
  stats=[["▦",ps.length,"Assigned programs"],["▷",D.live_sessions.length,"Live sessions"],["▥",relatedTasks.length,"Submissions in queue"],["◎",D.evaluations.length,"Evaluations"]];
  bannerTitle="Teach with clarity. Track with confidence.";bannerDesc="A dedicated workspace for curriculum, live sessions and training feedback.";
  bannerAction='<button class="btn btn-white" data-action="navigate" data-view="timeline">Manage lessons ↗</button>';
 }else if(role==="guide"){
  heading="Internship guide workspace";subtitle="Keep your project teams moving forward.";
  stats=[["◇",guideStudentCount,"Assigned interns"],["▦",ps.length,"Programs"],["▥",relatedTasks.length,"Submitted work"],["✧",D.completion_recommendations.length,"Recommendations"]];
  bannerTitle="Make every project milestone count.";bannerDesc="Review real-world internship projects and give students actionable feedback.";
  bannerAction='<button class="btn btn-white" data-action="navigate" data-view="reviews">Review work ↗</button>';
 }else{
  heading="Your learning hub";subtitle="A clear view of what's happening across your programs.";
  stats=[["▦",ps.length,"Enrolled courses"],["▤",D.timeline_events.filter(x=>x.scheduled_date<=today()).length,"Released activities"],["◎",selfReviews.length,"Evaluations"],["▷",D.live_sessions.filter(x=>x.session_date>=today()).length,"Scheduled classes"]];
  bannerTitle="Keep your momentum going.";bannerDesc="Your classes and project milestones unlock according to the program schedule. Pick up where you left off.";
  bannerAction='<button class="btn btn-white" data-action="navigate" data-view="courses">Continue learning ↗</button>';
 }
 const banner='<div class="workspace-banner dashboard-banner"><div class="banner-icon">✦</div><div>'+
 '<span class="eyebrow">WELCOME TO YOUR WORKSPACE</span><h2>'+esc(bannerTitle)+'</h2><p>'+esc(bannerDesc)+'</p></div>'+bannerAction+'</div>';
 const tiles='<div class="stat-grid">'+stats.map(([ico,num,name])=>'<div class="stat"><span class="sicon">'+ico+'</span><b>'+num+'</b><small>'+esc(name)+'</small></div>').join("")+'</div>';
 const programsList=ps.length?ps.map(pr=>{
  const currentDay=current(pr),days=total(pr),progress=Math.round(currentDay/days*100);
  return '<div class="learning-program-row">'+
    '<div class="learning-icon">▦</div>'+
    '<div class="learning-program-body"><b>'+esc(pr.title)+'</b><small>Day '+currentDay+' / '+days+' · '+(currentDay<=pr.training_days?"Training":"Internship")+' phase</small>'+
    '<div class="progress" style="margin:8px 0 4px;max-width:350px"><i style="width:'+progress+'%"></i></div>'+
    '<div class="progress-caption">'+progress+'% of scheduled days reached</div></div>'+
    click(role==="admin"?"Manage":"Open","open-course",pr.id,"btn-primary")+'</div>';
 }).join(""):empty("No programs yet","Programs will appear after they're created and assigned to you.");
 let right="";
 if(role==="admin"){
  right=[
  '<div class="shortcut-list">',
  '<button data-action="navigate" data-view="payments"><span class="shortcut-icon">₹</span><b>Review payments</b><small>'+pending.length+' pending</small><i>↗</i></button>',
  '<button data-action="staff-invite"><span class="shortcut-icon">♙</span><b>Invite Trainer or Guide</b><small>Access management</small><i>↗</i></button>',
  '<button data-action="navigate" data-view="guides"><span class="shortcut-icon">◇</span><b>Allocate internship Guides</b><small>At internship start</small><i>↗</i></button>',
  '<button data-action="navigate" data-view="complete"><span class="shortcut-icon">✧</span><b>Certificate approvals</b><small>Guide recommendation first</small><i>↗</i></button>',
  '</div>'
  ].join("");
 }else{
  right=[
  '<div class="shortcut-list">',
  '<button data-action="navigate" data-view="timeline"><span class="shortcut-icon">▤</span><b>Daily timeline</b><small>Date-wise content</small><i>↗</i></button>',
  '<button data-action="navigate" data-view="'+(role==="student"?"sessions":role==="guide"?"reviews":"sessions")+'"><span class="shortcut-icon">▷</span><b>'+(role==="guide"?"Review projects":"Live classes")+'</b><small>Upcoming and scheduled</small><i>↗</i></button>',
  '<button data-action="navigate" data-view="performance"><span class="shortcut-icon">◎</span><b>Evaluation history</b><small>Scores and feedback</small><i>↗</i></button>',
  '</div>'
  ].join("");
 }
 return title(heading,subtitle)+banner+tiles+
 '<div class="two-col"><div>'+card(role==="student"?"Continue your learning":role==="admin"?"All managed programs":"Your active batches",programsList)+
 (upcoming&&role!=="admin"?card("Upcoming session",row("▷",upcoming.title,date(upcoming.session_date)+" · "+String(upcoming.start_time||"").slice(0,5)+" IST",click("Sessions","navigate","","btn-outline").replace('data-action="navigate"','data-action="navigate" data-view="sessions"'))):"")+
 '</div><div>'+card("Quick actions",right)+
 card("How HackSphere works",'<div class="alert"><b>Calendar-based releases.</b><br>Training and internship activities unlock on their scheduled dates, not based on earlier scores. Administrator approves final certificates.</div>')+
 '</div></div>';
}
function xDate(s){return String(s.session_date||"")+"T"+String(s.start_time||"")}
function courses(){let ps=selectedPrograms();return title("My learning programs","Select a program to open its classroom and daily curriculum.")+(ps.length?'<div class="grid">'+ps.map(x=>'<article class="course-card"><div class="course-art">▦</div><div class="course-body"><h3>'+esc(x.title)+'</h3><p>'+esc(x.description)+'</p><div class="course-meta">Day '+current(x)+" / "+total(x)+"</div><div class=\"course-footer\">"+(x.is_test?'<span class="pill orange">QA TEST</span>':tag(x.mode))+click("Open classroom","open-course",x.id,"btn-primary")+"</div></div></article>").join("")+"</div>":empty("No courses yet","Enroll in a published program or wait for your assignment."))}


// Student experience: all visible lessons and materials are derived from signed-in records.
const stIcon=(name,size=20)=>{
 const paths={
 home:'<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
 book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16.7 7.3-3 6.4-6.4 3 3-6.4z"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 back:'<path d="m15 18-6-6 6-6"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',
 play:'<path d="m8 5 12 7-12 7z"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
 video:'<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
 file:'<path d="M6 2h8l5 5v15H6zM14 2v6h5M9 13h7m-7 4h7"/>',
 task:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 3.5h6M8 11l2 2 4-4M8 17h8"/>',
 quiz:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h8M8 12h6M8 16h4"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 5 5"/>',
 layers:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
 external:'<path d="M13 4h7v7m0-7-9 9"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6"/>'
 };
 return '<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.book)+'</svg>';
};
const stAction=(label,action,id="",secondary=false)=>'<button class="st-btn'+(secondary?' st-btn-outline':'')+'" type="button" data-action="'+esc(action)+'"'+(id?' data-id="'+esc(id)+'"':'')+'>'+esc(label)+stIcon('arrow',17)+'</button>';
const stActualEvents=program=>D.timeline_events.filter(e=>e.program_id===program.id&&e.scheduled_date<=programToday(program)).sort((a,b)=>String(a.scheduled_date).localeCompare(String(b.scheduled_date))||String(a.created_at||'').localeCompare(String(b.created_at||'')));
const stPublishedResources=eventId=>(D.lesson_resources||[]).filter(r=>r.event_id===eventId&&r.published);
const stPageHeading=(name,desc,action="")=>'<header class="st-page-head"><div><h1>'+esc(name)+'</h1>'+(desc?'<p>'+esc(desc)+'</p>':'')+'</div>'+action+'</header>';
const stProgramProgress=program=>{
 const percentage=Math.round(current(program)/Math.max(1,total(program))*100);
 return '<div class="st-progress"><span style="width:'+percentage+'%"></span></div>';
};
const stProgramCard=(program,compact=false)=>{
 const published=stActualEvents(program).length;
 return '<article class="st-course-card'+(compact?' st-card-compact':'')+'">'+
  '<div class="st-course-cover"><span class="st-course-logo">'+stIcon('layers',29)+'</span><span class="st-course-cover-label">'+(program.is_test?'Test access':esc(program.mode))+'</span></div>'+
  '<div class="st-course-body"><h3>'+esc(program.title)+'</h3><p>'+esc(program.description||'Training and project-based internship')+'</p>'+
  '<div class="st-course-meta"><span>'+stIcon('calendar',15)+' Day '+current(program)+' of '+total(program)+'</span><span>'+stIcon('book',15)+' '+published+' released</span></div>'+
  stProgramProgress(program)+'<div class="st-course-bottom"><span>'+Math.round(current(program)/Math.max(total(program),1)*100)+'% of calendar released</span>'+
  '<button class="st-text-link" data-action="open-course" data-id="'+esc(program.id)+'">Continue '+stIcon('arrow',17)+'</button></div></div></article>';
};
function studentOverview(){
 const assigned=selectedPrograms();
 const first=assigned[0];
 const displayName=(D.profiles.find(p=>p.id===user.id)?.full_name||user.user_metadata?.full_name||'Learner').trim().split(/\s+/)[0];
 const actualToday=D.timeline_events.filter(e=>assigned.some(pr=>pr.id===e.program_id&&e.scheduled_date===programToday(pr))).slice(0,5);
 const upcoming=D.live_sessions.filter(l=>assigned.some(pr=>pr.id===l.program_id)&&l.session_date>=today()).sort((a,b)=>String(a.session_date+a.start_time).localeCompare(String(b.session_date+b.start_time)))[0];
 const courseContent=assigned.length?'<div class="st-courses-stack">'+assigned.slice(0,2).map(pr=>stProgramCard(pr,true)).join('')+'</div>':[
 '<div class="st-empty"><div class="st-empty-icon">'+stIcon('book',27)+'</div><h3>Start learning something new</h3>',
 '<p>Browse the available programs and choose the right next step.</p>',stAction('Explore programs','student-explore'),'</div>'
 ].join('');
 const lessons=actualToday.length?actualToday.map(ev=>'<button class="st-activity" data-action="student-open-lesson" data-id="'+esc(ev.id)+'"><span class="st-activity-icon">'+stIcon(ev.activity_type==='quiz'?'quiz':["assignment","project","milestone"].includes(ev.activity_type)?'task':'play',20)+'</span><span><b>'+esc(ev.title)+'</b><small>'+esc(p(ev.program_id)?.title||'Program')+' · '+esc(ev.activity_type)+'</small></span>'+stIcon('chevron',17)+'</button>').join(''):'<div class="st-empty-inline">No lessons scheduled for today.</div>';
 const live=upcoming?'<div class="st-upcoming"><span class="st-upcoming-icon">'+stIcon('video',20)+'</span><div><b>'+esc(upcoming.title)+'</b><small>'+date(upcoming.session_date)+' · '+esc(String(upcoming.start_time||'').slice(0,5))+'</small></div><button class="st-text-link" data-action="navigate" data-view="sessions">View schedule '+stIcon('arrow',16)+'</button></div>':'<div class="st-empty-inline">No upcoming live classes.</div>';
 return '<div class="st-view">'+stPageHeading('Hello, '+displayName,'Ready to learn something new today?')+
 '<div class="st-overview-grid"><div class="st-overview-main"><div class="st-block"><div class="st-block-heading"><h2>Continue learning</h2><button class="st-text-link" data-action="navigate" data-view="courses">View all '+stIcon('arrow',15)+'</button></div>'+courseContent+'</div>'+
 '<div class="st-block"><div class="st-block-heading"><h2>Today’s learning</h2></div><div class="st-white-panel">'+lessons+'</div></div></div>'+
 '<aside class="st-overview-side"><div class="st-explore-spot"><div class="st-explore-art">'+stIcon('compass',35)+'</div><h2>Build your next skill</h2><p>Discover expert-led training and practical projects.</p>'+stAction('Explore programs','student-explore')+'</div>'+
 '<div class="st-block"><div class="st-block-heading"><h2>Upcoming class</h2></div><div class="st-white-panel">'+live+'</div></div></aside></div></div>';
}
function studentCourses(){
 const programs=selectedPrograms();
 return '<div class="st-view">'+stPageHeading('My courses','Your enrolled learning programs.',stAction('Explore programs','student-explore',undefined,true))+
 (programs.length?'<div class="st-course-grid">'+programs.map(program=>stProgramCard(program)).join('')+'</div>':
 '<div class="st-white-panel">'+stAction('Find a program','student-explore')+'</div>')+'</div>';
}
const stPendingFor=programId=>D.payment_claims.some(c=>c.program_id===programId&&c.student_id===user.id&&c.status==='pending');
const stCatalog=()=>{
 const programs=D.programs.filter(pr=>['published','ongoing'].includes(pr.status)&&!pr.is_test&&(pr.title+' '+(pr.description||'')).toLowerCase().includes(studentQuery.toLowerCase()));
 return programs.length?programs.map(pr=>{
  const already=enrolled(pr);
  return '<article class="st-discover-card"><div class="st-discover-art">'+stIcon('book',32)+'</div><div class="st-discover-body"><div class="st-discover-top">'+esc(pr.mode)+' · '+total(pr)+' days</div><h3>'+esc(pr.title)+'</h3><p>'+esc(pr.description||'Structured technical learning with projects')+'</p><div class="st-discover-meta">'+stIcon('calendar',16)+' Starts '+date(pr.start_date)+'</div>'+
  '<div class="st-discover-footer"><strong>'+money(pr.fee_inr)+'</strong>'+(already?stAction('Continue','open-course',pr.id):stPendingFor(pr.id)?'<span class="st-pending">Verification pending</span>':stAction('View program','student-course-info',pr.id))+'</div></div></article>';
 }).join(''):'<div class="st-white-panel">'+empty("No programs found","Try another search or check later for new batches.")+'</div>';
};
function studentExplore(){
 return '<div class="st-view">'+stPageHeading('Explore programs','Find the right program for your next skill.')+
 '<label class="st-search">'+stIcon('search',19)+'<input type="search" id="student-program-search" placeholder="Search available programs" value="'+esc(studentQuery)+'" autocomplete="off" aria-label="Search programs"></label>'+
 '<div id="student-program-list" class="st-discover-grid">'+stCatalog()+'</div></div>';
}


function studentSessions(){
 const permitted=new Set(selectedPrograms().map(pr=>pr.id));
 const sessions=D.live_sessions.filter(l=>permitted.has(l.program_id)).slice().sort((a,b)=>String(a.session_date+a.start_time).localeCompare(String(b.session_date+b.start_time)));
 const upcoming=sessions.filter(l=>l.session_date>=today());
 const history=sessions.filter(l=>l.session_date<today()).reverse().slice(0,10);
 const cards=items=>items.map(l=>{
  const prog=p(l.program_id);
  const ready=l.meet_status==='ready'&&l.status==='scheduled';
  return '<article class="st-list-card"><span class="st-list-icon">'+stIcon('video',22)+'</span><div><h3>'+esc(l.title)+'</h3><p>'+esc(prog?.title||'Program')+'</p><small>'+date(l.session_date)+' · '+esc(String(l.start_time||'').slice(0,5))+' · '+Number(l.duration_minutes||60)+' min</small></div>'+
  '<div class="st-list-action">'+(ready&&l.session_date>=today()?'<button class="st-btn st-btn-outline" data-action="join" data-id="'+esc(l.id)+'">Join '+stIcon('arrow',16)+'</button>':'<span class="st-subdued">'+(ready?'Class finished':'Meeting link pending')+'</span>')+'</div></article>';
 }).join('');
 return '<div class="st-view">'+stPageHeading('Live classes','Your upcoming and previous sessions.')+
 '<div class="st-white-panel"><h2>Upcoming sessions</h2>'+(upcoming.length?cards(upcoming):'<div class="st-empty-inline">No upcoming classes scheduled.</div>')+'</div>'+
 (history.length?'<div class="st-white-panel st-section-gap"><h2>Previous sessions</h2>'+cards(history)+'</div>':'')+'</div>';
}
function studentAssignments(){
 const progs=selectedPrograms();
 const events=progs.flatMap(stActualEvents).filter(e=>['assignment','project','milestone'].includes(e.activity_type)).sort((a,b)=>String(b.scheduled_date).localeCompare(String(a.scheduled_date)));
 const records=D.submissions.filter(s=>s.student_id===user.id);
 const statuses=ev=>records.filter(s=>s.event_id===ev.id).sort((a,b)=>String(b.submitted_at).localeCompare(String(a.submitted_at)))[0];
 const pending=events.filter(e=>!statuses(e)||statuses(e).status==='changes_requested');
 const completed=events.filter(e=>statuses(e)&&statuses(e).status!=='changes_requested');
 const items=(arr,showStatus)=>arr.map(ev=>{
  const sub=statuses(ev);
  const status=sub?(sub.status==='approved'?'Approved':sub.status==='changes_requested'?'Changes requested':'Awaiting review'):'Ready to submit';
  return '<article class="st-list-card"><span class="st-list-icon">'+stIcon('task',21)+'</span><div><h3>'+esc(ev.title)+'</h3><p>'+esc(p(ev.program_id)?.title||'Course')+' · '+date(ev.scheduled_date)+'</p>'+
   (showStatus?'<small>'+status+'</small>':'')+'</div><div class="st-list-action"><button class="st-btn st-btn-outline" data-action="student-open-lesson" data-id="'+esc(ev.id)+'">'+(sub?'View':'Open')+' '+stIcon('arrow',16)+'</button></div></article>';
 }).join('');
 return '<div class="st-view">'+stPageHeading('Assignments','Your practice and project submissions.')+
 '<div class="st-white-panel"><h2>Available tasks</h2>'+(pending.length?items(pending,true):'<div class="st-empty-inline">No tasks waiting for submission.</div>')+'</div>'+
 '<div class="st-white-panel st-section-gap"><h2>Submitted work</h2>'+(completed.length?items(completed,true):'<div class="st-empty-inline">Your submitted work will appear here.</div>')+'</div></div>';
}
function studentPerformance(){
 const evaluations=D.evaluations.filter(x=>x.student_id===user.id);
 const quizAttempts=(D.quiz_attempts||[]).filter(x=>x.student_id===user.id);
 const scores=evaluations.map(e=>'<article class="st-list-card"><span class="st-list-icon">'+stIcon('check',21)+'</span>'+
 '<div><h3>'+esc(e.activity_title)+'</h3><p>'+esc(p(e.program_id)?.title||'Program')+' · '+esc(e.phase)+'</p>'+(e.feedback?'<small>'+esc(e.feedback)+'</small>':'')+'</div><div class="st-score">'+e.score+' / '+e.max_score+'</div></article>').join('');
 const attempts=quizAttempts.map(a=>{
  const quiz=D.quizzes.find(q=>q.id===a.quiz_id);
  return '<article class="st-list-card"><span class="st-list-icon">'+stIcon('quiz',21)+'</span><div><h3>'+esc(quiz?.title||'Quiz')+'</h3><p>'+date(a.submitted_at?.slice(0,10))+'</p></div><div class="st-score">'+a.score+' / '+a.max_score+'</div></article>';
 }).join('');
 return '<div class="st-view">'+stPageHeading('My performance','Scores and feedback from your learning activities.')+
 '<div class="st-white-panel"><h2>Trainer & Guide evaluations</h2>'+(scores||'<div class="st-empty-inline">No evaluations yet.</div>')+'</div>'+
 '<div class="st-white-panel st-section-gap"><h2>Quiz results</h2>'+(attempts||'<div class="st-empty-inline">No quiz attempts yet.</div>')+'</div></div>';
}
function studentDocuments(){
 const enrollments=D.enrollments.filter(e=>e.student_id===user.id&&!e.is_test&&['active','completed'].includes(e.status));
 const certificates=D.certificates.filter(c=>c.student_id===user.id&&c.status==='approved'&&!p(c.program_id)?.is_test);
 const letters=enrollments.map(e=>'<article class="st-list-card"><span class="st-list-icon">'+stIcon('file',21)+'</span><div><h3>'+esc(p(e.program_id)?.title||'Program')+'</h3><p>Offer letter · '+esc(e.offer_letter_code||'Pending')+'</p></div><div class="st-list-action">'+
 (e.offer_letter_code?'<button class="st-btn st-btn-outline" data-action="letter" data-id="'+esc(e.id)+'">View '+stIcon('external',16)+'</button>':'<span class="st-subdued">Pending</span>')+'</div></article>').join('');
 const certs=certificates.map(c=>'<article class="st-list-card"><span class="st-list-icon">'+stIcon('file',21)+'</span><div><h3>'+esc(p(c.program_id)?.title||'Program')+'</h3><p>Certificate · '+esc(c.code||'Pending')+'</p></div><div class="st-list-action"><button class="st-btn st-btn-outline" data-action="certificate-print" data-id="'+esc(c.id)+'">View '+stIcon('external',16)+'</button></div></article>').join('');
 return '<div class="st-view">'+stPageHeading('My documents','Your verified program letters and certificates.')+
 '<div class="st-white-panel"><h2>Offer letters</h2>'+(letters||'<div class="st-empty-inline">No verified offer letters yet.</div>')+'</div>'+
 '<div class="st-white-panel st-section-gap"><h2>Certificates</h2>'+(certs||'<div class="st-empty-inline">Certificates appear after final approval.</div>')+'</div></div>';
}
function studentProfile(){
 const name=D.profiles.find(x=>x.id===user.id)?.full_name||user.user_metadata?.full_name||'Learner';
 return '<div class="st-view">'+stPageHeading('My profile','Account and display preferences.')+
 '<div class="st-profile-card"><span class="st-profile-avatar">'+esc(name.slice(0,2).toUpperCase())+'</span><div><h2>'+esc(name)+'</h2><p>'+esc(user.email||'Google account')+'</p></div></div>'+
 '<div class="st-white-panel st-profile-edit"><h2>Display name</h2><form data-kind="profile">'+field("Name","full_name","text",name,true)+
 '<button class="st-btn" type="submit">Save changes '+stIcon('arrow',17)+'</button></form></div></div>';
}

function studentCalendar(){
 const assigned=selectedPrograms(),program=assigned.find(pr=>pr.id===studentCalendarChoice)||assigned[0];
 if(!program)return '<div class="st-view">'+stPageHeading('Learning calendar','Your program schedule.')+
 '<div class="st-white-panel"><div class="st-empty"><h3>No courses enrolled</h3><p>Explore published programs to begin.</p>'+stAction('Explore programs','student-explore')+'</div></div></div>';
 studentCalendarChoice=program.id;
 const perPage=14,days=total(program),pages=Math.max(1,Math.ceil(days/perPage));
 timelineOffset=Math.min(timelineOffset,pages-1);
 const start=timelineOffset*perPage+1,end=Math.min(days,start+perPage-1);
 const calendar=Array.from({length:end-start+1},(_,i)=>{
  const number=start+i,scheduled=day(program.start_date,number-1);
  const released=scheduled<=programToday(program);
  const items=released?stActualEvents(program).filter(e=>e.scheduled_date===scheduled):[];
  return '<article class="st-day-card'+(released?'':' locked')+'"><div class="st-day-top"><b>Day '+number+'</b><small>'+date(scheduled)+'</small>'+
   '<span>'+stIcon(released?'check':'lock',17)+'</span></div>'+
   '<div class="st-day-content">'+(released?(items.length?items.map(e=>'<button data-action="student-open-lesson" data-id="'+esc(e.id)+'">'+stIcon(e.activity_type==='quiz'?'quiz':'book',16)+'<span>'+esc(e.title)+'</span>'+stIcon('arrow',15)+'</button>').join(''):'<small>No lesson scheduled for this date.</small>'):'<small>Unlocks on scheduled date</small>')+'</div></article>';
 }).join('');
 return '<div class="st-view">'+stPageHeading('Learning calendar','Every day follows your program schedule.')+
 '<div class="st-calendar-head"><label>Program<select class="input" id="student-calendar-select">'+assigned.map(pr=>'<option value="'+esc(pr.id)+'"'+(pr.id===program.id?' selected':'')+'>'+esc(pr.title)+'</option>').join('')+'</select></label>'+
 '<div class="st-calendar-pager"><button data-action="student-calendar-prev"'+(timelineOffset===0?' disabled':'')+'>'+stIcon('back',18)+'</button><b>Days '+start+'–'+end+' of '+days+'</b><button data-action="student-calendar-next"'+(timelineOffset+1>=pages?' disabled':'')+'>'+stIcon('chevron',18)+'</button></div></div>'+
 '<div class="st-day-grid">'+calendar+'</div></div>';
}
function studentEnrollmentPage(){
 const available=D.programs.filter(pr=>['published','ongoing'].includes(pr.status)&&!pr.is_test);
 const eligible=available.filter(pr=>!enrolled(pr));
 const selected=eligible.find(pr=>pr.id===studentEnrollmentChoice)||eligible[0];
 if(selected)studentEnrollmentChoice=selected.id;
 const pending=selected&&stPendingFor(selected.id);
 const my=D.enrollments.filter(e=>e.student_id===user.id);
 const claims=D.payment_claims.filter(e=>e.student_id===user.id&&e.status==='pending');
 const selectHtml=eligible.length?'<label class="st-payment-field">Choose a program<select class="input" id="student-enroll-program">'+eligible.map(pr=>'<option value="'+esc(pr.id)+'"'+(selected?.id===pr.id?' selected':'')+'>'+esc(pr.title)+'</option>').join('')+'</select></label>':'';
 const paymentInfo=upi.upi_id?'<div class="st-upi-details"><div><span>Payee</span><b>'+esc(upi.payee||'HackSphere')+'</b></div><div><span>UPI ID</span><b>'+esc(upi.upi_id)+'</b></div></div>'+
 (upi.qr_url&&/^https:\/\//.test(upi.qr_url)?'<img class="st-upi-qr" src="'+esc(upi.qr_url)+'" alt="Official HackSphere UPI payment QR code">':''):'<div class="st-inline-alert">Enrollment payments are not open yet.</div>';
 let paymentForm='';
 if(selected&&upi.upi_id&&!pending){
  paymentForm='<form class="st-payment-form" data-kind="payment">'+
  '<input type="hidden" name="program_id" value="'+esc(selected.id)+'">'+
  '<label class="st-payment-field">Transaction UTR<input class="input" name="utr" type="text" minlength="6" placeholder="UPI reference number" required></label>'+
  '<label class="st-payment-field">Payment screenshot<input class="input" type="file" name="proof_file" accept="image/png,image/jpeg,image/webp" required></label>'+
  '<p>Enrollment activates after the payment is verified against the actual bank credit.</p>'+
  '<button class="st-btn" type="submit">Submit for verification '+stIcon('arrow',17)+'</button></form>';
 }else if(pending)paymentForm='<div class="st-pending-panel">'+stIcon('clock',22)+'<div><b>Verification pending</b><p>Your payment reference is awaiting review.</p></div></div>';
 const summary=selected?'<div class="st-payment-summary"><h3>'+esc(selected.title)+'</h3>'+
 '<div><span>Training</span><b>'+selected.training_days+' days</b></div>'+
 '<div><span>Internship</span><b>'+selected.internship_days+' days</b></div>'+
 '<div><span>Start date</span><b>'+date(selected.start_date)+'</b></div>'+
 '<div class="st-payment-total"><span>Program fee</span><strong>'+money(selected.fee_inr)+'</strong></div></div>':
 '<div class="st-empty"><h3>No open enrollments</h3><p>New programs will appear here when admissions open.</p></div>';
 return '<div class="st-view">'+stPageHeading('Program enrollment','Enroll in another learning program.',stAction('Explore programs','student-explore',undefined,true))+
 '<div class="st-enrollment-grid"><section class="st-white-panel"><h2>Choose your program</h2>'+selectHtml+summary+
 '<div class="st-payment-guidance"><h3>Official payment details</h3>'+paymentInfo+'</div>'+paymentForm+'</section>'+
 '<aside class="st-white-panel"><h2>My enrollments</h2>'+
 (my.length?my.map(e=>'<div class="st-enrollment-row">'+stIcon('book',21)+'<div><b>'+esc(p(e.program_id)?.title||'Program')+'</b><small>'+(e.is_test?'Test access':esc(e.status))+'</small></div></div>').join(''):'<div class="st-empty-inline">No active enrollments yet.</div>')+
 (claims.length?'<h2 style="margin-top:24px">Pending requests</h2>'+claims.map(c=>'<div class="st-enrollment-row">'+stIcon('clock',19)+'<div><b>'+esc(p(c.program_id)?.title||'Program')+'</b><small>Awaiting verification</small></div></div>').join(''):'')+
 '</aside></div></div>';
}

function studentProgramInfo(){
 const pr=p(course);
 if(!pr||pr.is_test||!['published','ongoing'].includes(pr.status))return '<div class="st-view">'+stPageHeading('Program unavailable','This program is not currently accepting enrollment.')+'</div>';
 const already=enrolled(pr),pending=stPendingFor(pr.id);
 const enroll=already?stAction('Continue learning','open-course',pr.id):pending?'<span class="st-pending">Payment verification pending</span>':stAction('Enroll now','student-enroll',pr.id);
 return '<div class="st-view"><button class="st-back" data-action="student-explore">'+stIcon('back',17)+' Explore programs</button>'+
 '<div class="st-program-hero"><div><span class="st-program-kicker">'+esc(pr.mode)+' LEARNING</span><h1>'+esc(pr.title)+'</h1><p>'+esc(pr.description||'Trainer-led learning with practical project experience.')+'</p><div class="st-program-meta"><span>'+stIcon('calendar',18)+' Starts '+date(pr.start_date)+'</span><span>'+stIcon('clock',18)+' '+total(pr)+' days</span></div></div><div class="st-program-price"><span>Program fee</span><strong>'+money(pr.fee_inr)+'</strong>'+enroll+'</div></div>'+
 '<div class="st-program-info-grid"><section class="st-white-panel"><h2>Program structure</h2><div class="st-phase-row"><span class="st-phase-symbol">'+stIcon('book',22)+'</span><span><b>Training</b><small>Day 1–'+pr.training_days+'</small></span><strong>'+pr.training_days+' days</strong></div>'+
 '<div class="st-phase-row"><span class="st-phase-symbol">'+stIcon('briefcase',22)+'</span><span><b>Project internship</b><small>Day '+(pr.training_days+1)+'–'+total(pr)+'</small></span><strong>'+pr.internship_days+' days</strong></div></section>'+
 '<section class="st-white-panel"><h2>Learning format</h2><p>Instructor-scheduled lessons, course materials, assignments and project milestones are released on their calendar dates. Exact class sessions and lesson resources are managed by the teaching team.</p></section></div></div>';
}
const stMediaFor=ev=>{
 const r2=(D.videos||[]).find(v=>v.lesson_event_id===ev?.id&&v.status==='ready'&&v.published);
 if(r2)return {kind:'r2',value:r2.id,title:r2.title};
 const resources=stPublishedResources(ev?.id);
 let video=resources.find(r=>r.kind==='video');
 if(video)return {kind:'resource',value:video.id,title:video.title};
 if(ev?.resource_url?.startsWith('storage://hacksphere-course-files/')&&/\.(mp4|webm)(\?.*)?$/i.test(ev.resource_url))return{kind:'legacy',value:ev.id,title:ev.title};
 if(/^https:\/\/[^ ]+\.(mp4|webm)(\?.*)?$/i.test(ev?.resource_url||''))return{kind:'external',value:ev.id,title:ev.title};
 return null;
};
function studentClassroom(){
 const program=p(course);
 if(!program||!enrolled(program))return '<div class="st-view">'+stPageHeading('Course unavailable','Your enrollment must be active before accessing the classroom.')+'<button type="button" class="st-btn" data-action="navigate" data-view="courses">My courses</button></div>';
 const events=stActualEvents(program);
 const active=events.find(e=>e.id===lesson)||events[events.length-1];
 lesson=active?.id||null;
 const progress=Math.round(current(program)/Math.max(total(program),1)*100);
 const dayNumber=active?Math.max(1,Math.round((new Date(active.scheduled_date)-new Date(program.start_date))/86400000)+1):null;
 const playerMedia=stMediaFor(active);
 const player=playerMedia?'<div class="st-player-empty" id="st-player-placeholder">'+
  '<button type="button" class="st-player-play" data-action="student-play" data-id="'+esc(playerMedia.value)+'" data-source="'+esc(playerMedia.kind)+'" aria-label="Play recording">'+stIcon('play',29)+'</button>'+
  '<strong>'+esc(playerMedia.title)+'</strong><span>Recording available</span></div>':
 '<div class="st-player-empty"><span class="st-player-symbol">'+stIcon('video',38)+'</span><strong>No recording available</strong><span>Video appears here when published by your Trainer or Guide.</span></div>';

 return '<div class="st-view st-classroom"><button class="st-back" data-action="navigate" data-view="courses">'+stIcon('back',17)+' My courses</button>'+
 '<header class="st-classroom-head"><div><h1>'+esc(program.title)+'</h1><p>'+program.training_days+' days training · '+program.internship_days+' days internship'+(program.is_test?' · Test access':'')+'</p></div>'+
 '<div class="st-day-count"><b>Day '+current(program)+' / '+total(program)+'</b><small>Calendar progress</small></div></header>'+
 '<div class="st-classroom-progress">'+stProgramProgress(program)+'<span>'+progress+'%</span></div>'+
 '<div class="st-classroom-grid"><div class="st-classroom-main"><div class="st-player" id="student-player">'+player+'</div>'+
 '<div class="st-lesson-heading"><div><small>'+(active?'DAY '+dayNumber+' · '+(active.phase==='training'?'TRAINING':'INTERNSHIP'):'YOUR CLASSROOM')+'</small>'+
 '<h2>'+esc(active?.title||'Your lessons will appear here')+'</h2></div></div>'+
 '<section class="st-learning-details"><div class="st-tabs" role="tablist" aria-label="Lesson sections">'+
 [['overview','Overview'],['notes','Notes'],['tasks','Tasks'],['quiz','Quiz']].map(([id,name])=>'<button type="button" class="st-tab'+(studentTab===id?' active':'')+'" role="tab" aria-selected="'+(studentTab===id)+'" data-action="student-tab" data-tab="'+id+'">'+name+'</button>').join('')+'</div>'+
 '<div id="student-lesson-panel" class="st-tab-panel" role="tabpanel">'+studentTabHtml(program,active)+'</div></section></div>'+
 '<aside class="st-curriculum"><div class="st-curriculum-top"><h2>Course content</h2><span>'+events.length+' available</span></div>'+
 '<div class="st-curriculum-section"><div class="st-curriculum-label">'+stIcon('book',17)+' Training <span>Day 1–'+program.training_days+'</span></div>'+
 '<div class="st-lesson-list">'+events.filter(e=>e.phase==='training').map(e=>lessonListFor(e,active,program)).join('')+'</div></div>'+
 '<div class="st-curriculum-section"><div class="st-curriculum-label">'+stIcon('briefcase',17)+' Internship <span>Day '+(program.training_days+1)+'–'+total(program)+'</span></div>'+
 '<div class="st-lesson-list">'+events.filter(e=>e.phase==='internship').map(e=>lessonListFor(e,active,program)).join('')+'</div></div>'+
 (!events.length?'<div class="st-lesson-empty">No lessons have been released for this course.</div>':'')+
 '<div class="st-future"><span>'+stIcon('lock',17)+'</span> Future lessons unlock on their scheduled dates.</div></aside></div></div>';
}
function lessonListFor(ev,active,program){
 const d=Math.max(1,Math.round((new Date(ev.scheduled_date)-new Date(program.start_date))/86400000)+1);
 return '<button class="st-lesson'+(ev.id===active?.id?' active':'')+'" data-action="student-lesson" data-id="'+esc(ev.id)+'" aria-current="'+(ev.id===active?.id?'true':'false')+'">'+
 '<span class="st-lesson-icon">'+stIcon(ev.activity_type==='quiz'?'quiz':['assignment','project','milestone'].includes(ev.activity_type)?'task':'play',19)+'</span>'+
 '<span class="st-lesson-name"><b>'+esc(ev.title)+'</b><small>Day '+d+' · '+esc(ev.activity_type)+'</small></span>'+stIcon('chevron',16)+'</button>';
}
function studentTabHtml(program,ev){
 if(!ev)return '<div class="st-tab-empty">'+stIcon('book',27)+'<h3>No lesson available yet</h3><p>Your assigned teaching team publishes lessons according to the program schedule.</p></div>';
 const resources=stPublishedResources(ev.id);
 if(studentTab==='overview')return '<h3>'+esc(ev.title)+'</h3><p>'+esc(ev.description||'No lesson overview has been added yet.')+'</p>'+
 '<div class="st-lesson-meta">'+stIcon('calendar',17)+' '+date(ev.scheduled_date)+' <span>·</span> '+esc(ev.phase==='training'?'Training':'Internship')+'</div>';
 if(studentTab==='notes'){
  const notesList=resources.filter(r=>['notes','file','link'].includes(r.kind));
  let items=notesList.map(r=>'<article class="st-resource">'+
   '<span class="st-resource-icon">'+stIcon('file',20)+'</span><div><b>'+esc(r.title)+'</b>'+(r.note_text?'<p>'+esc(r.note_text)+'</p>':'')+'</div>'+
   ((r.storage_path||r.external_url)?'<button type="button" class="st-resource-open" data-action="student-resource" data-id="'+esc(r.id)+'" aria-label="Open '+esc(r.title)+'">'+stIcon('download',18)+'</button>':'')+'</article>').join('');
  if(ev.resource_url&&!stMediaFor(ev)&&/^https:\/\//.test(ev.resource_url))items+='<article class="st-resource"><span class="st-resource-icon">'+stIcon('external',20)+'</span><div><b>Lesson resource</b></div><button class="st-resource-open" data-action="student-legacy-link" data-id="'+esc(ev.id)+'">'+stIcon('external',18)+'</button></article>';
  if(ev.resource_url?.startsWith("storage://hacksphere-course-files/")&&!stMediaFor(ev))items+='<article class="st-resource"><span class="st-resource-icon">'+stIcon('file',20)+'</span><div><b>Lesson attachment</b></div><button class="st-resource-open" data-action="student-legacy-file" data-id="'+esc(ev.id)+'" aria-label="Open lesson attachment">'+stIcon('download',18)+'</button></article>';
  return items||'<div class="st-tab-empty">'+stIcon('file',25)+'<h3>No notes published</h3><p>Notes and reference files will appear when your Trainer or Guide adds them.</p></div>';
 }
 if(studentTab==='tasks'){
  if(!['assignment','project','milestone'].includes(ev.activity_type)){
   const tasks=stActualEvents(program).filter(e=>['assignment','project','milestone'].includes(e.activity_type));
   return tasks.length?'<h3>Available assignments</h3>'+tasks.map(e=>'<button class="st-related-lesson" data-action="student-lesson" data-id="'+esc(e.id)+'">'+stIcon('task',20)+'<span>'+esc(e.title)+'</span>'+stIcon('arrow',17)+'</button>').join(''):
    '<div class="st-tab-empty">'+stIcon('task',25)+'<h3>No assignments released</h3><p>Tasks appear when added by your Trainer or Guide.</p></div>';
  }
  const previous=D.submissions.filter(x=>x.student_id===user.id&&x.event_id===ev.id).sort((a,b)=>String(b.submitted_at).localeCompare(String(a.submitted_at)))[0];
  if(previous&&previous.status!=='changes_requested')return '<div class="st-task-status">'+stIcon('check',21)+'<div><h3>Assignment submitted</h3><p>'+esc(previous.status==='approved'?'Approved by reviewer':'Awaiting review')+'</p>'+
   (previous.submission_url?'<a href="'+esc(previous.submission_url)+'" target="_blank" rel="noopener noreferrer">View submitted work ↗</a>':'')+'</div></div>';
  return '<h3>'+esc(ev.title)+'</h3><p>'+esc(ev.description||'Submit your completed work for review.')+'</p>'+
  (previous?'<div class="st-status-note">Changes requested — submit an updated version.</div>':'')+
  '<form class="st-task-form" data-kind="submission" data-event="'+esc(ev.id)+'">'+
  '<label>Project or GitHub URL<input name="submission_url" type="url" class="input" placeholder="https://github.com/..." required></label>'+
  '<label>Submission notes<textarea name="content" class="input" rows="3" placeholder="What did you build?"></textarea></label>'+
  '<button class="st-btn" type="submit">Submit assignment '+stIcon('arrow',17)+'</button></form>';
 }
 const qs=stActualEvents(program).filter(e=>e.activity_type==='quiz'&&D.quizzes.some(q=>q.timeline_event_id===e.id&&q.published));
 if(ev.activity_type==='quiz')return quizPanel(ev);
 return qs.length?'<h3>Available quizzes</h3>'+qs.map(e=>'<button class="st-related-lesson" data-action="student-lesson" data-id="'+esc(e.id)+'">'+stIcon('quiz',20)+'<span>'+esc(e.title)+'</span>'+stIcon('arrow',17)+'</button>').join(''):
 '<div class="st-tab-empty">'+stIcon('quiz',25)+'<h3>No quizzes released</h3><p>Published quizzes will appear here on their scheduled dates.</p></div>';
}


async function studentSignedUrl(path){
 if(demo||!db){notice("This preview has no uploaded media.","error");return null}
 const r=await db.storage.from("hacksphere-course-files").createSignedUrl(path,3600);
 if(r.error){notice("Could not open the file: "+r.error.message,"error");return null}
 return r.data?.signedUrl||null;
}
async function studentPlayRecording(id,source){
 const selected=D.timeline_events.find(ev=>ev.id===lesson&&ev.program_id===course);
 if(!selected||selected.scheduled_date>programToday(p(course))){notice("Lesson not released.","error");return}
 let src=null,resource=null;
 if(source==="r2"){
  const video=(D.videos||[]).find(v=>v.id===id&&v.lesson_event_id===selected.id&&v.status==="ready"&&v.published);
  if(!video||demo){notice("This preview does not contain a real MP4 recording.","error");return}
  const currentSession=await db.auth.getSession(),jwt=currentSession.data?.session?.access_token;
  if(!jwt){notice("Your Google session expired. Sign in again.","error");return}
  let response,data;
  try{response=await fetch("/api/videos/"+encodeURIComponent(video.id)+"/session",{method:"POST",
   headers:{"authorization":"Bearer "+jwt},credentials:"same-origin"});
   data=await response.json()}catch(e){notice("Cannot connect to private video streaming.","error");return}
  if(!response.ok||!data?.streamUrl){notice(data?.error||"Video unavailable.","error");return}
  src=data.streamUrl;
 }else if(source==="resource"){
   resource=stPublishedResources(selected.id).find(x=>x.id===id&&x.kind==="video");
   if(!resource)return;
   if(resource.storage_path)src=await studentSignedUrl(resource.storage_path);
   else if(resource.external_url&&/^https:\/\//.test(resource.external_url))src=resource.external_url;
 }else if(source==="legacy"&&id===selected.id&&selected.resource_url?.startsWith("storage://hacksphere-course-files/")){
   src=await studentSignedUrl(selected.resource_url.replace("storage://hacksphere-course-files/",""));
 }else if(source==="external"&&id===selected.id&&/^https:\/\//.test(selected.resource_url||"")){
   src=selected.resource_url;
 }
 if(!src)return;
 const holder=document.getElementById("student-player");if(!holder)return;
 holder.replaceChildren();
 const video=document.createElement("video");video.controls=true;video.playsInline=true;
 video.preload="metadata";video.setAttribute("controlsList","nodownload");
 video.setAttribute("aria-label",selected.title+" recording");video.src=src;
 holder.append(video);try{await video.play()}catch(e){}
}
async function studentOpenResource(id){
 const selected=D.timeline_events.find(ev=>ev.id===lesson&&ev.program_id===course);
 if(!selected||selected.scheduled_date>programToday(p(course)))return;
 const resource=stPublishedResources(selected.id).find(r=>r.id===id);
 if(!resource)return;
 let win=window.open("","_blank");
 let destination=null;
 if(resource.storage_path)destination=await studentSignedUrl(resource.storage_path);
 else if(resource.external_url&&/^https:\/\//.test(resource.external_url))destination=resource.external_url;
 if(!destination){if(win)win.close();return}
 if(win){win.opener=null;win.location.replace(destination)}
 else notice("Enable popups to open your course resource.","error");
}

function quizPanel(ev){
 if(ev?.activity_type!=="quiz")return "";
 const q=D.quizzes.find(x=>x.timeline_event_id===ev.id);
 if(!q&&role==="student")return card("Quiz not available",'<div class="alert">The Trainer has not published questions for this lesson.</div>');
 if(!q){
  return card("Create a quiz",'<form data-kind="quiz-create" data-event="'+esc(ev.id)+'">'+field("Quiz title","title","text",ev.title,true)+field("Time limit (minutes)","time_limit_minutes","number","20",true)+field("Max attempts","max_attempts","number","2",true)+'<button class="btn btn-primary">Create quiz</button></form>');
 }
 const qs=D.quiz_questions.filter(x=>x.quiz_id===q.id).sort((a,b)=>a.position-b.position);
 if(role==="student"){
  if(!q.published)return card("Quiz not published","Your Trainer will publish this quiz when ready.");
  const attempts=D.quiz_attempts.filter(a=>a.quiz_id===q.id&&a.student_id===user.id);
  let stats=attempts.length?'<div class="alert success">'+attempts.map(a=>"Attempt: "+a.score+" / "+a.max_score).join(" • ")+"</div>":"";
  if(attempts.length>=q.max_attempts)return card(q.title,stats+empty("Maximum attempts used","Ask your Trainer for feedback."));
  if(!qs.length)return card(q.title,empty("No questions yet","The Trainer is preparing this assessment."));
  const questionCards=qs.map((question,i)=>[
    '<fieldset class="quiz-question" data-question="'+esc(question.id)+'">',
    '<legend><span class="quiz-number">'+(i+1)+'</span>'+esc(question.prompt)+'</legend>',
    ...question.options.map((answer,idx)=>'<label class="quiz-option"><input type="radio" name="q_'+esc(question.id)+'" value="'+idx+'" required><span>'+esc(answer)+'</span></label>'),
    '</fieldset>'
  ].join("")).join("");
  return card("Knowledge check — "+q.title,
   '<div class="quiz-intro">Attempt '+(attempts.length+1)+' of '+q.max_attempts+' · '+qs.length+' questions · '+q.time_limit_minutes+' min recommended</div>'+
   stats+'<form data-kind="quiz-attempt" data-quiz="'+esc(q.id)+'">'+questionCards+'<button class="btn btn-primary">Submit quiz answers</button></form>');
 }
 const summary=qs.length?'<div class="quiz-summary">'+qs.map((x,i)=>'<div class="quiz-summary-row"><b>'+(i+1)+'. '+esc(x.prompt)+'</b><small>'+x.options.map(esc).join(" / ")+'</small></div>').join("")+'</div>':
 '<div class="alert warning">This quiz has no questions yet.</div>';
 const createQuestion=[
  '<form data-kind="quiz-question" data-quiz="'+esc(q.id)+'">',
  field("Question","prompt","text","",true),
  '<div class="form-grid">',
  field("Option A","option_a","text","",true),
  field("Option B","option_b","text","",true),
  field("Option C","option_c","text","",true),
  field("Option D","option_d","text","",true),
  '</div>',
  choose("Correct answer","correct_index",[["0","A"],["1","B"],["2","C"],["3","D"]]),
  '<button class="btn btn-primary">Add question</button></form>'
 ].join("");
 return card("Quiz builder — "+q.title,
  '<div class="quiz-intro">'+qs.length+' questions · '+(q.published?"Published":"Unpublished")+'</div>'+
  summary+createQuestion+(!q.published?click("Publish quiz","quiz-publish",q.id,"btn-primary"):""));
}

function classroom(){
 let program=p(course);
 if(!program)return empty("Program not found","Return to your enrolled courses.");
 let events=D.timeline_events.filter(x=>x.program_id===program.id&&(role!=="student"||x.scheduled_date<=programToday(program))).sort((a,b)=>a.scheduled_date.localeCompare(b.scheduled_date));
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
 if(selected?.activity_type==="quiz")actions.push(quizPanel(selected));
 if(role!=="student"&&selected){
 const sessionHosts=D.live_sessions.filter(ls=>ls.timeline_event_id===selected.id&&ls.status!=="cancelled");
 const teamRole=(selected.phase==="training"&&role==="trainer"&&D.program_staff.some(ps=>ps.program_id===program.id&&ps.user_id===user.id&&ps.role==="trainer"))||
  (selected.phase==="internship"&&role==="guide"&&D.program_guides.some(pg=>pg.program_id===program.id&&pg.user_id===user.id));
 const hosted=sessionHosts.length===0||sessionHosts.some(ls=>ls.trainer_user_id===user.id&&ls.session_date<=programToday(program));
 if(teamRole&&hosted){
  actions.push([
  '<section class="teaching-video-box"><h3>Class recording</h3>',
  (videoStorageReady?
   '<form data-kind="lesson-video-upload" data-event="'+esc(selected.id)+'">'+
   '<label class="field"><span>Recording title</span><input class="input" type="text" name="title" value="'+esc(selected.title)+'" maxlength="180" required></label>'+
   '<label class="field"><span>MP4 recording (up to 512 MiB)</span><input class="input" name="video_file" type="file" accept="video/mp4,.mp4" required></label>'+
   '<button class="btn btn-primary" type="submit">Upload recording</button><p class="teaching-video-muted" role="status" aria-live="polite" data-video-progress></p></form>':
   '<p class="teaching-video-muted">Video upload is unavailable until private R2 storage is enabled.</p>'),
  (D.videos||[]).filter(v=>v.lesson_event_id===selected.id&&v.status==="ready").map(v=>
     '<div class="teaching-video-row"><strong>'+esc(v.title)+'</strong>'+
     (v.uploaded_by===user.id?'<button class="btn btn-small btn-outline" data-action="video-publish-toggle" data-id="'+esc(v.id)+'">'+(v.published?'Hide':'Publish')+'</button>':tag(v.published?'Published':'Hidden'))+
     '</div>').join(''),
  '</section>'
  ].join(""));
 }

  actions.push([
   '<form data-kind="lesson-resource" data-event="'+esc(selected.id)+'" data-program="'+esc(program.id)+'">',
   '<h3 style="font-size:15px">Add a lesson resource</h3>',
   '<label class="field"><span>Resource type</span><select class="input" name="kind"><option value="notes">Notes / PDF</option><option value="file">Study material</option><option value="link">External link</option></select></label>',
   field("Resource title","title","text","",true),
   '<label class="field"><span>Upload PDF or image (max 50 MB)</span><input class="input" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg"></label>',
   field("External HTTPS URL (instead of a file)","external_url","url"),
   notes("Written notes (for text-only notes)","note_text"),
   '<button class="btn btn-primary" type="submit">Publish resource</button></form>',
   '<div class="lesson-resource-heading"><b>Published materials</b></div>',
   ((D.lesson_resources||[]).filter(r=>r.event_id===selected.id).map(r=>row(r.kind==="video"?"▷":"▤",r.title,r.kind+" · "+(r.published?"Visible to students when released":"Hidden"),
    click(r.published?"Hide":"Publish","resource-toggle",r.id,"btn-outline"))).join("")||'<p style="color:var(--muted);font-size:12px">No materials uploaded yet.</p>'),

  ].join(""));
 }
 let lessons=events.length?events.map(x=>[
  '<button class="lesson '+(x.id===lesson?'active':'')+'" data-action="lesson" data-id="'+esc(x.id)+'">',
  '<span>'+(['lecture','recording'].includes(x.activity_type)?'▷':'▤')+'</span>',
  '<div><b>'+esc(x.title)+'</b><small>'+date(x.scheduled_date)+' · '+esc(x.phase)+'</small></div>',
  '</button>'
 ].join("")).join(""):empty("No lessons released","Classes and assignments will appear according to the program schedule.");
 return [
  title(program.title+(program.is_test?" · QA TEST":""),"Day "+current(program)+" / "+total(program)+" · "+program.training_days+" training days + "+program.internship_days+" internship days"),
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
 return title("Programs & batches","Create and manage independent training and internship cohorts.",action)+
 counts+card("All programs",items.length?'<div class="manage-program-list">'+rows+'</div>':empty("No programs yet","Create your first batch. You can prepare the schedule while it remains a private draft."))+
 '<div class="help-hint">Create program with Trainer & Guide → Add or import dated lessons → Publish → Verify payment → Allocate student Guide at internship start.</div>'
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
 choose("Program timezone","timezone",[["Asia/Kolkata","India • IST (Asia/Kolkata)"],["Etc/UTC","UTC"],["Asia/Dubai","UAE (Dubai)"],["Europe/London","UK (London)"],["America/New_York","US (New York)"]]),
 field("Training days","training_days","number","60",true),
 field("Internship days","internship_days","number","30",true),
 '</div>',
 '<div class="form-section-label"><span>03</span><div><b>Enrollment</b><small>Fee is verified manually via official UPI</small></div></div>',
 '<div class="form-grid">',
 field("Fee in INR","fee_inr","number","0",true),
 choose("Initial visibility","status",[["draft","Save as draft"],["published","Publish immediately"]]),
 '</div>',
 '<div class="form-section-label"><span>04</span><div><b>Teaching team</b><small>Select both staff at program creation</small></div></div>',
 '<div class="form-grid">',
 choose("Program Trainer","trainer_id",D.staff_roles.filter(x=>x.role==="trainer").map(x=>[x.user_id,who(x.user_id)])),
 choose("Designated Internship Guide","guide_id",D.staff_roles.filter(x=>x.role==="guide").map(x=>[x.user_id,who(x.user_id)])),
 '</div>',
 '<div class="alert">Trainer and Guide are designated now; student-specific Guide allocation happens only when the internship starts.</div>',
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
 if(role!=="admin")return empty("Administrator access required","This program-management screen is reserved for Admin.");if(!x)return title("Program workspace","Manage one batch at a time.")+empty("Program not found","Go back to the program list.");
 let en=D.enrollments.filter(e=>e.program_id===x.id),ts=D.program_staff.filter(e=>e.program_id===x.id),ga=D.guide_allocations.filter(e=>e.program_id===x.id),ev=D.timeline_events.filter(e=>e.program_id===x.id);
 const openIn=day(x.start_date,x.training_days),ended=day(x.start_date,total(x)-1);
 const isTestBanner=x.is_test?'<div class="alert warning"><b>QA test cohort</b> — this batch is hidden from the public catalog. Student access is an authorized test seat; no actual UPI payment has been approved.</div>':"";
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
 const students=en.length?en.map(e=>row('♙',who(e.student_id),e.status+(e.is_test?" · QA TEST ACCESS (no payment)":" · Offer letter: "+(e.offer_letter_code||"Pending")))).join(""):empty("No enrolled students","Only verified UPI payments activate enrollment.");
 const trainers=ts.length?ts.map(t=>row("♙",who(t.user_id),"Assigned training instructor")).join(""):empty("Trainer not assigned","Assign a trainer from the Staff directory.");
 const designated=D.program_guides.filter(g=>g.program_id===x.id).map(g=>row("◇",who(g.user_id),"Nominated at program creation")).join("")||empty("Guide designation missing","Assign a Guide in the program team.");
 const guides=ga.length?ga.map(a=>row("◇",who(a.student_id),who(a.guide_user_id)+" · Assigned Guide")).join(""):empty("No Guide yet","Admin allocates Guides only after "+date(openIn)+".");
 return title(x.title,"Manage timeline, enrollment, Trainers and Guides for this batch.",actions)+
 '<div class="editor-breadcrumb"><button data-action="navigate" data-view="programs">All programs</button><span>/</span><b>'+esc(x.title)+'</b></div>'+
 cover+isTestBanner+statSet+'<div class="two-col"><div>'+card("Program structure",manage)+card("Enrolled students",students)+'</div><div>'+
 card("Training team",trainers+click("Assign a Trainer","navigate","","btn-light").replace('data-action="navigate"','data-action="navigate" data-view="staff"'))+
 card("Designated Internship Guide",designated)+card("Student Guide allocations",guides)+
 card("Operations",'<div class="quick-links">'+click("Timeline","program-timeline",x.id)+click("Payment approvals","navigate","","btn-outline").replace('data-action="navigate"','data-action="navigate" data-view="payments"')+'</div>')+
 card("Import CSV learning schedule",
 '<form data-kind="csv-schedule" data-program="'+esc(x.id)+'">'+
 '<label class="field"><span>CSV file (day, phase, activity_type, title, description, live, start_time, duration_minutes)</span>'+
 '<input class="input" type="file" name="schedule_file" accept=".csv,text/csv" required></label>'+
 '<p style="font-size:12px;color:var(--muted)">One row per day or additional activity. Duplicate dated titles will be skipped. Live sessions are scheduled; Meet links need trainer OAuth.</p>'+
 '<div class="form-actions"><button class="btn btn-primary">Import schedule</button>'+
 '<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="https://github.com/ankit-sde-aiml/HackSphere/blob/main/examples/python_90_day_schedule.csv">View sample CSV ↗</a></div></form>')+
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
 choose("Program timezone","timezone",[["Asia/Kolkata","India • IST (Asia/Kolkata)"],["Etc/UTC","UTC"],["Asia/Dubai","UAE (Dubai)"],["Europe/London","UK (London)"],["America/New_York","US (New York)"]],x.timezone||"Asia/Kolkata")+
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
    let unlocked=d<=programToday(program);
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
function sessions(){let ps=selectedPrograms(),listings=D.live_sessions.filter(s=>ps.some(x=>x.id===s.program_id));let pending=listings.filter(x=>x.status==="scheduled"&&x.meet_status!=="ready").length;let meetTools=role==="student"?"":'<div class="alert warning" style="margin-bottom:16px"><b>Google Meet authorization</b><br>'+pending+' class(es) await meeting-space creation. Grant Google Meet permission using your Trainer Google account, then HackSphere generates each pending class link in a batch. Google Meet API must be enabled in Google Cloud.</div><div class="form-actions" style="margin-bottom:16px"><button class="btn btn-primary" data-action="meet-consent">Connect Google Meet & generate links ↗</button></div>';return title("Live sessions","Classes follow each program calendar. Access to meeting links is enrollment-checked and time-limited.")+meetTools+'<div class="two-col"><div>'+card("Class calendar",listings.length?listings.map(s=>row("▷",s.title,date(s.session_date)+" • "+String(s.start_time).slice(0,5)+" IST",role==="student"?(s.meet_status==="ready"?click("Join Live Class","join",s.id,"btn-primary"):'<span class="pill orange">Meet authorization pending</span>'):tag(s.meet_status==="ready"?"Meet ready":"Meeting not connected"))).join(""):empty("No scheduled classes","Trainers will schedule live sessions."))+'</div><div>'+(role==="student"?card("Secure access","You can join only as an active enrolled student during the class time window. Meet controls final admission."):card("Schedule a class",'<div class="alert warning">Google Meet auto-creation is pending trainer OAuth configuration. This calendar saves a session only.</div><form data-kind="session">'+choose("Program","program_id",options(ps))+field("Lecture topic","title","text","",true)+field("Class date","session_date","date","",true)+field("Start time IST","start_time","time","19:00",true)+field("Duration minutes","duration_minutes","number","60",true)+'<button class="btn btn-primary">Schedule</button></form>'))+"</div></div>"}
function eligibleStudents(programId,roleFilter=role){
 let assigned=D.enrollments.filter(e=>e.program_id===programId&&e.status!=="suspended");
 if(roleFilter==="guide")assigned=assigned.filter(e=>D.guide_allocations.some(g=>g.program_id===programId&&g.student_id===e.student_id&&g.guide_user_id===user.id));
 return assigned.map(e=>[e.student_id,who(e.student_id)]);
}
function students(){
 let en=D.enrollments;
 let entries=en.map(e=>row("♧",who(e.student_id),[p(e.program_id)?.title||"Program",e.status,e.is_test?"QA TEST SEAT":"Offer Letter: "+(e.offer_letter_code||"Pending")].join(" · "),tag(e.is_test?"Test":e.status)));
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
function enrollment(){let ps=D.programs.filter(x=>["published","ongoing"].includes(x.status)&&!x.is_test),mine=D.enrollments.filter(x=>x.student_id===user.id);return title("My enrollments","Enrollment activates after manual verification of actual bank credit.")+'<div class="two-col"><div>'+card("UPI enrollment",paymentInstructions()+(upi.upi_id?'<form data-kind="payment">'+choose("Program","program_id",options(ps))+field("Transaction UTR","utr","text","",true)+'<label class="field"><span>Payment screenshot (PNG / JPG / WebP, max 5 MB)</span><input class="input" type="file" name="proof_file" accept="image/png,image/jpeg,image/webp" required></label><div class="alert warning">Your UTR and screenshot are submitted for verification. Only a matching actual bank credit activates enrollment.</div><button class="btn btn-primary">Submit for bank verification</button></form>':""))+'</div><div>'+card("Enrolled programs",mine.length?mine.map(x=>row("▦",p(x.program_id)?.title||"Program",x.is_test?"QA TEST ACCESS — NO PAYMENT":x.offer_letter_code||"Offer letter pending",tag(x.is_test?"Test only":x.status))).join(""):empty("No enrollments","Purchase verification is required."))+"</div></div>"}
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
 let eligible=D.programs.filter(pr=>day(pr.start_date,pr.training_days)<=programToday(pr));
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
 x.is_test?"QA seat — no bank payment":x.offer_letter_code||"Pending",
 x.is_test?tag("Not a real document"):click("Print / Save PDF","letter",x.id,"btn-primary"))).join(""):empty("No offer letters","Offer letters are available after verified UPI enrollment.");
 const certificates=certs.length?certs.map(x=>row("✧",p(x.program_id)?.title||"Program",x.code,
 click("Print / Save PDF","certificate-print",x.id,"btn-primary"))).join(""):empty("No certificates yet","Guide recommendation and admin approval are required.");
 return title("My documents","Verifiable offer letters and completion certificates, with a unique document ID.")
   +card("Offer letters",letters)+card("Completion certificates",certificates);
}
function printCredential(kind,id){
 let item=kind==="certificate"?D.certificates.find(x=>x.id===id):D.enrollments.find(x=>x.id===id);
 if(!item){notice("Document not found.","error");return}
 const program=p(item.program_id);
 if(item.is_test||program?.is_test){notice("QA test enrollments do not issue verified documents.","error");return}
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
 ["assignment","project","milestone"].includes(x.activity_type)&&x.scheduled_date<=programToday(p(x.program_id)));
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
 let name=D.profiles.find(x=>x.id===user.id)?.full_name||user.user_metadata?.full_name||'HackSphere member';
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

function merchantForm(){
 const v=D.site_settings.find(x=>x.key==="legal_business")?.value||{};
 const ready=Boolean(v.business_name&&v.support_email&&v.address&&v.refund_policy);
 return '<div class="alert '+(ready?'success':'warning')+'">'+(ready?'Merchant policy fields are filled. Verify their accuracy before payment-gateway review.':'Merchant policy fields are incomplete. Real business contact, address and refund rules are required before gateway review.')+'</div>'+
 '<form data-kind="merchant">'+
 field("Legal business / operating name","business_name","text",v.business_name||"",true)+
 choose("Entity type","legal_entity_type",[["","Choose type"],["Individual / unregistered business","Individual / unregistered business"],["Sole proprietorship","Sole proprietorship"],["Partnership","Partnership"],["LLP","LLP"],["Private limited company","Private limited company"]],v.legal_entity_type||"")+
 '<div class="form-grid">'+field("Customer support email","support_email","email",v.support_email||"",true)+field("Support phone","support_phone","tel",v.support_phone||"")+'</div>'+
 notes("Physical business address","address",v.address||"")+
 field("Support availability","support_hours","text",v.support_hours||"")+
 notes("Approved refund & cancellation policy (include eligibility, process and timeline)","refund_policy",v.refund_policy||"")+
 field("Privacy requests email (optional)","privacy_contact","email",v.privacy_contact||"")+
 '<button class="btn btn-primary">Publish verified merchant details</button></form>'+
 '<div class="form-actions" style="margin-top:14px"><a class="btn btn-outline" href="/contact" target="_blank">View contact page ↗</a><a class="btn btn-outline" href="/refunds" target="_blank">View refund policy ↗</a></div>';
}

function settings(){return title("Website settings","Manage verified payment information and connected services.")+card("Official UPI payment configuration",upiForm())+card("Merchant information & public policies",merchantForm())+card("Authentication & live classes",'<div class="alert success"><b>Google Sign-In is active.</b><br>HackSphere authentication is connected to Supabase. Your first Administrator account is authorized.</div><div class="alert warning" style="margin-top:10px"><b>Google Meet automatic creation not connected.</b><br>Trainer-specific OAuth and secure server-side Meet API setup are still required.</div>')}

async function connectMeetConsent(){
 if(demo){notice("Preview mode cannot authorize Google Meet.");return}
 if(!db||!user){notice("Google Login required.","error");return}
 try{
  sessionStorage.setItem("hacksphere_meet_sync","1");
  const r=await db.auth.signInWithOAuth({provider:"google",options:{
    redirectTo:location.origin+"/",
    scopes:"https://www.googleapis.com/auth/meetings.space.created",
    queryParams:{access_type:"offline",prompt:"consent select_account"}
  }});
  if(r.error){sessionStorage.removeItem("hacksphere_meet_sync");notice("Meet consent failed: "+r.error.message,"error")}
 }catch(e){notice(e.message,"error")}
}
let meetSyncRunning=false;
async function syncPendingMeet(){
 if(meetSyncRunning||demo||!db||!user)return;
 meetSyncRunning=true;
 try{
  const r=await db.auth.getSession();
  const session=r.data?.session;
  if(!session?.access_token||!session?.provider_token){notice("Google Meet permission was not returned. Reconnect from Live classes.","error");return}
  const assigned=D.program_staff.filter(x=>x.user_id===user.id).map(x=>x.program_id);
  const guided=D.program_guides.filter(x=>x.user_id===user.id).map(x=>x.program_id);
  const permitted=new Set([...assigned,...guided]);
  const pending=D.live_sessions.filter(x=>x.status==="scheduled"&&x.meet_status!=="ready"&&(permitted.has(x.program_id)||role==="admin")).slice(0,100);
  if(!pending.length){notice("No pending Meet sessions for your assigned programs.","success");return}
  let passed=0,failed=[];
  for(const cls of pending){
   let response;
   try{
    response=await fetch("/api/meet/create",{method:"POST",
     headers:{"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},
     body:JSON.stringify({session_id:cls.id,google_token:session.provider_token})});
    const payload=await response.json();
    if(response.ok&&payload.success)passed++;
    else failed.push((cls.title||cls.id)+": "+(payload.error||response.status));
   }catch(error){failed.push((cls.title||cls.id)+": "+error.message)}
  }
  await reload();render();
  if(passed)notice("Created "+passed+" restricted Google Meet links.","success");
  if(failed.length)notice(failed.length+" Meet links failed. "+failed[0],"error");
 }finally{meetSyncRunning=false}
}

function parseCsv(text){
 if(text.length>2000000)throw Error("CSV exceeds 2 MB limit");
 const result=[];let current=[],cell="",inside=false;
 text=text.replace(/^\uFEFF/,"").replace(/\r\n/g,"\n");
 for(let i=0;i<text.length;i++){
  let c=text[i];
  if(c==='"'){
   if(inside&&text[i+1]==='"'){cell+='"';i++}else inside=!inside;
  }else if(c===','&&!inside){current.push(cell.trim());cell=""}
  else if(c==='\n'&&!inside){current.push(cell.trim());if(current.some(Boolean))result.push(current);current=[];cell=""}
  else cell+=c;
 }
 if(inside)throw Error("Unclosed CSV quote");
 current.push(cell.trim());if(current.some(Boolean))result.push(current);
 if(result.length<2)throw Error("CSV has no data rows");
 const header=result.shift().map(x=>x.trim().toLowerCase());
 const fields=["day","phase","activity_type","title","description","live","start_time","duration_minutes"];
 for(let k of ["day","phase","activity_type","title"])if(!header.includes(k))throw Error("Missing column: "+k);
 const data=result.map((cells,idx)=>{
  if(cells.length>header.length)throw Error("Extra column at CSV row "+(idx+2));
  let obj={};header.forEach((h,j)=>obj[h]=cells[j]||"");
  let row={};fields.forEach(k=>row[k]=obj[k]||"");row.day=String(row.day).trim();return row;
 });
 return data;
}
async function importCsvSchedule(form){
 const file=form.querySelector('input[name="schedule_file"]')?.files?.[0];
 if(!file||file.size>2000000){notice("Choose a CSV file under 2 MB.","error");return}
 const programId=form.dataset.program,pr=p(programId);if(!pr){notice("Program not found.","error");return}
 let entries;
 try{entries=parseCsv(await file.text());for(let i=0;i<entries.length;i++){const x=entries[i],n=Number(x.day);
   if(!Number.isInteger(n)||n<1||n>total(pr))throw Error("Row "+(i+2)+": day must be between 1 and "+total(pr));
   if((n<=pr.training_days?"training":"internship")!==x.phase)throw Error("Row "+(i+2)+": phase does not match date");
   if(!["lecture","recording","assignment","quiz","project","milestone","resource"].includes(x.activity_type))throw Error("Row "+(i+2)+": invalid activity");
   if(x.title.length<3||x.title.length>160)throw Error("Row "+(i+2)+": title length invalid");
   if(["yes","true","1"].includes(x.live.toLowerCase())&&(!/^\d{2}:\d{2}$/.test(x.start_time)||!["lecture","project","milestone"].includes(x.activity_type)))throw Error("Row "+(i+2)+": invalid live class time/type");
 }}catch(err){notice("CSV error: "+err.message,"error");return}
 const live=entries.filter(r=>["yes","true","1"].includes(r.live.toLowerCase())).length;
 if(!confirm("Import "+entries.length+" activities and schedule "+live+" live classes for "+pr.title+"? Existing identical dated titles will be skipped. Google Meet links will remain pending OAuth."))return;
 if(demo){
   for(const x of entries){if(D.timeline_events.some(e=>e.program_id===programId&&e.scheduled_date===day(pr.start_date,Number(x.day)-1)&&e.title===x.title))continue;
    const id="demo-import-"+Math.random().toString(36).slice(2),scheduled_date=day(pr.start_date,Number(x.day)-1);
    D.timeline_events.push({id,program_id:programId,phase:x.phase,activity_type:x.activity_type,scheduled_date,title:x.title,description:x.description});
    if(["yes","true","1"].includes(x.live.toLowerCase()))D.live_sessions.push({id:"demo-live-"+id,program_id:programId,timeline_event_id:id,title:"Live: "+x.title,session_date:scheduled_date,start_time:x.start_time,meet_status:"pending_authorization",status:"scheduled"});
   }
   notice("Imported into preview only.","success");render();return;
 }
 const result=await db.rpc("import_program_schedule",{_program_id:programId,_rows:entries});
 if(result.error){notice("Import failed: "+result.error.message,"error");return}
 await reload();render();
 notice(result.data.inserted+" activities imported; "+result.data.duplicates_skipped+" duplicates skipped; "+result.data.live_classes_scheduled+" Meet authorizations pending.","success");
}

document.addEventListener("click",async e=>{let b=e.target.closest("[data-action]");if(!b)return;e.preventDefault();let a=b.dataset.action,id=b.dataset.id;if(a==="student-explore"){studentQuery="";navigateTo("explore")}
else if(a==="student-course-info"){navigateTo("course-info",id)}
else if(a==="student-calendar-prev"){timelineOffset=Math.max(0,timelineOffset-1);render()}
else if(a==="student-calendar-next"){timelineOffset++;render()}
else if(a==="student-enroll"){studentEnrollmentChoice=id;navigateTo("enrollment")}
else if(a==="student-lesson"){lesson=id;studentTab="overview";render()}
else if(a==="student-open-lesson"){const ev=D.timeline_events.find(x=>x.id===id);if(!ev)return;navigateTo("courses",ev.program_id);lesson=id;studentTab="overview";render()}
else if(a==="student-tab"){
 studentTab=b.dataset.tab||"overview";
 document.querySelectorAll(".st-tab").forEach(btn=>{const active=btn.dataset.tab===studentTab;btn.classList.toggle("active",active);btn.setAttribute("aria-selected",String(active))});
 const panel=document.getElementById("student-lesson-panel");if(panel)panel.innerHTML=studentTabHtml(p(course),D.timeline_events.find(x=>x.id===lesson));
}else if(a==="student-play"){await studentPlayRecording(id,b.dataset.source)}
else if(a==="student-resource"){await studentOpenResource(id)}
else if(a==="student-legacy-file"){const ev=D.timeline_events.find(x=>x.id===id&&x.program_id===course);if(!ev?.resource_url?.startsWith("storage://hacksphere-course-files/"))return;const win=window.open("","_blank");const signed=await studentSignedUrl(ev.resource_url.replace("storage://hacksphere-course-files/",""));if(!signed){if(win)win.close();return}if(win){win.opener=null;win.location.replace(signed)}else notice("Allow popups to open the attachment.","error")}
else if(a==="student-legacy-link"){const ev=D.timeline_events.find(x=>x.id===id);if(ev?.resource_url&&/^https:\/\//.test(ev.resource_url))window.open(ev.resource_url,"_blank","noopener,noreferrer")}
else if(a==="login")loginDialog();else if(a==="close-login")hideDialog();else if(a==="google-login")signIn();else if(a==="demo")demoOpen();else if(a==="toggle-public-menu"){const menu=$("mobile-links");menu.hidden=!menu.hidden;b.setAttribute("aria-expanded",String(!menu.hidden));b.setAttribute("aria-label",menu.hidden?"Open menu":"Close menu")}else if(a==="open-drawer")$("app-shell").classList.add("drawer-open");else if(a==="close-drawer")$("app-shell").classList.remove("drawer-open");else if(a==="signout")signOut();else if(a==="home")publicPage();else if(a==="navigate"){navigateTo(b.dataset.view)}else if(a==="open-course"){studentTab="overview";navigateTo("courses",id)}else if(a==="close-course"){navigateTo("courses")}else if(a==="lesson"){lesson=id;render()}else if(a==="enroll-public"){if(!user)loginDialog();else{navigateTo("enrollment");open()}}else if(a==="timeline-prev"){timelineOffset=Math.max(0,timelineOffset-1);render()}else if(a==="timeline-next"){timelineOffset=(timelineOffset+1)%Math.ceil(total(p(course||selectedPrograms()[0]?.id))/14);render()}else if(a==="secure-resource"){let event=D.timeline_events.find(x=>x.id===id);if(!event?.resource_url)return;let path=event.resource_url.replace("storage://hacksphere-course-files/","");if(demo){notice("Preview only — no private recording file is stored.");return}let r=await db.storage.from("hacksphere-course-files").createSignedUrl(path,600);if(r.error){notice(r.error.message,"error");return}if(/\.(mp4|webm)$/i.test(path)){let player=$("course-player");player.innerHTML='<video controls autoplay playsinline src="'+esc(r.data.signedUrl)+'"></video>';}else window.open(r.data.signedUrl,"_blank","noopener,noreferrer")}else if(a==="program-new"){navigateTo("program-new")}
else if(a==="program-detail"){navigateTo("program-detail",id)}else if(a==="program-edit"){navigateTo("program-edit",id)}
else if(a==="program-timeline"){navigateTo("timeline",id)}
else if(a==="staff-invite"){navigateTo("staff-invite")}
else if(a==="payment-history"){navigateTo("payment-history")}
else if(a==="payment-settings"){navigateTo("payment-settings")}
else if(a==="profile"){navigateTo("profile")}
else if(a==="video-publish-toggle"){const v=(D.videos||[]).find(x=>x.id===id);
 if(!v||demo||v.uploaded_by!==user.id)return;
 const result=await db.rpc("set_video_published",{_video_id:v.id,_published:!v.published});
 if(result.error){notice(result.error.message,"error");return}
 await reload();render();notice(v.published?"Recording hidden.":"Recording published.","success");
 }else if(a==="resource-toggle"){let item=(D.lesson_resources||[]).find(x=>x.id===id);if(item)await save("lesson_resources",{published:!item.published},id)}else if(a==="quiz-publish"){await save("quizzes",{published:true},id)}else if(a==="publish"){let x=p(id);await save("programs",{status:x.status==="draft"?"published":"draft"},id)}else if(a==="proof"){let claim=D.payment_claims.find(x=>x.id===id);if(!claim?.proof_path){notice("No screenshot attached.","error");return}if(demo){notice("Screenshot is not available in preview mode.");return}let r=await db.storage.from("hacksphere-payment-proofs").createSignedUrl(claim.proof_path,300);if(r.error)notice(r.error.message,"error");else window.open(r.data.signedUrl,"_blank","noopener,noreferrer")}else if(a==="approve-pay"||a==="reject-pay"){if(a==="approve-pay"&&!confirm("Have you personally verified the actual bank credit for this transaction?"))return;await save("payment_claims",{status:a==="approve-pay"?"approved":"rejected",reviewed_by:user.id,reviewed_at:new Date().toISOString()},id)}else if(a==="letter"){printCredential("offer_letter",id)}else if(a==="certificate-print"){printCredential("certificate",id)}else if(a==="check-code"){let code=prompt("Enter your HackSphere document ID");if(code)showVerification(code)}else if(a==="close-verify"){document.getElementById("verify-overlay")?.remove()}else if(a==="review-approve"||a==="review-changes"){await save("submissions",{status:a==="review-approve"?"approved":"changes_requested"},id)}else if(a==="certificate"){let x=D.completion_recommendations.find(x=>x.id===id);if(x&&x.recommendation==="recommended"&&confirm("Approve final certificate?"))await save("certificates",{student_id:x.student_id,program_id:x.program_id,approved_by:user.id})}else if(a==="meet-consent"){await connectMeetConsent()}else if(a==="join"){
 if(demo){notice("Preview mode cannot join real Google Meet.");return}
 const win=window.open("","_blank");
 const r=await db.rpc("get_my_session_join_uri",{_session_id:id});
 if(r.error){if(win)win.close();notice("Join unavailable: "+r.error.message,"error");return}
 if(win){win.opener=null;win.location.href=r.data}else notice("Please allow popups to join the class.","error");
}});
document.addEventListener("change",e=>{
 if(e.target.id==="role-switch"){role=e.target.value;navigateTo("overview");return}
 if(e.target.id==="student-calendar-select"){studentCalendarChoice=e.target.value;timelineOffset=0;render();return}
 if(e.target.id==="student-enroll-program"){studentEnrollmentChoice=e.target.value;render();return}
 const f=e.target.closest("form[data-kind]");
 if(e.target.name==="program_id"&&f&&["guide","score"].includes(f.dataset.kind)){
  const value=e.target.value,select=f.querySelector('[name="student_id"]');
  if(select){let people=D.enrollments.filter(x=>x.program_id===value&&x.status==="active");
   if(f.dataset.kind==="score"&&role==="guide")people=people.filter(x=>D.guide_allocations.some(g=>g.student_id===x.student_id&&g.program_id===value&&g.guide_user_id===user.id));
   select.innerHTML=people.map(x=>'<option value="'+esc(x.student_id)+'">'+esc(who(x.student_id))+'</option>').join("");
  }
 }
});
document.addEventListener("input",e=>{if(e.target.closest('form[data-kind="program"]'))refreshProgramPreview(e.target.closest('form[data-kind="program"]'));if(e.target.id==="catalog-search"){search=e.target.value;drawCatalog()}else if(e.target.id==="student-program-search"){studentQuery=e.target.value;const result=document.getElementById("student-program-list");if(result)result.innerHTML=stCatalog()}});
document.addEventListener("click",e=>{let b=e.target.closest("[data-filter]");if(!b)return;filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x.dataset.filter===filter));drawCatalog()});
document.addEventListener("submit",async e=>{let form=e.target.closest("form[data-kind]");if(!form)return;e.preventDefault();
if(form.dataset.busy==="true")return;
form.dataset.busy="true";form.setAttribute("aria-busy","true");
const submitButton=form.querySelector('[type="submit"]')||form.querySelector('button:not([type="button"])');
const savedButton=submitButton?.innerHTML;if(submitButton){submitButton.disabled=true;submitButton.textContent="Saving…"}
let f=Object.fromEntries(new FormData(form).entries()),type=form.dataset.kind;
try{
if(type==="csv-schedule"){await importCsvSchedule(form)}
else if(type==="program"){
 f.training_days=+f.training_days;f.internship_days=+f.internship_days;f.fee_inr=+f.fee_inr;
 if(!f.trainer_id||!f.guide_id){notice("Choose an assigned Trainer and Internship Guide first.","error");return}
 if(demo){
  let id="preview-"+Math.random().toString(36).slice(2);
  D.programs.unshift({...f,id,created_by:user.id,is_test:false});
  D.program_staff.push({program_id:id,user_id:f.trainer_id,role:"trainer"});
  D.program_guides.push({program_id:id,user_id:f.guide_id});
  navigateTo("program-detail",id);return;
 }
 const args={_title:f.title,_description:f.description||"",_start_date:f.start_date,
 _training_days:f.training_days,_internship_days:f.internship_days,_fee_inr:f.fee_inr,
 _mode:f.mode,_status:f.status,_timezone:f.timezone||"Asia/Kolkata",
 _trainer_id:f.trainer_id,_guide_id:f.guide_id,_is_test:false};
 const r=await db.rpc("create_program_with_team",args);
 if(r.error){notice("Program could not be created: "+r.error.message,"error");return}
 await reload();navigateTo("program-detail",r.data);notice("Program, Trainer and Guide created together.","success");
}
else if(type==="program-edit"){f.training_days=+f.training_days;f.internship_days=+f.internship_days;f.fee_inr=+f.fee_inr;let id=form.dataset.program;if(id){if(await save("programs",f,id))navigateTo("program-detail",id)}}
else if(type==="profile"){await save("profiles",{full_name:f.full_name},user.id)}
else if(type==="activity"){f.created_by=user.id;await save("timeline_events",f)}
else if(type==="session"){f.duration_minutes=+f.duration_minutes;f.trainer_user_id=user.id;await save("live_sessions",f)}
else if(type==="submission"){f.student_id=user.id;f.event_id=form.dataset.event;let prior=D.submissions.find(x=>x.student_id===user.id&&x.event_id===f.event_id&&x.status==="changes_requested");if(prior)await save("submissions",{content:f.content||"",submission_url:f.submission_url,status:"submitted"},prior.id);else await save("submissions",f)}
else if(type==="lesson-video-upload"){
 const eventId=form.dataset.event,videoFile=form.querySelector('input[name="video_file"]')?.files?.[0];
 const progress=form.querySelector("[data-video-progress]");
 if(!videoFile||!videoFile.name.toLowerCase().endsWith(".mp4")||
  (videoFile.type&&videoFile.type!=="video/mp4")||
  videoFile.size<1||videoFile.size>536870912){
    notice("Choose an MP4 recording under 512 MiB.","error");return;
 }
 if(demo){notice("Preview doesn't contain real video storage.","error");return}
 if(!videoStorageReady){notice("Private R2 storage must be enabled before uploading.","error");return}
 const session=await db.auth.getSession(),jwt=session.data?.session?.access_token;
 if(!jwt){notice("Google Sign-In expired. Please sign in again.","error");return}
 const authorization={Authorization:"Bearer "+jwt};
 const report=text=>{if(progress)progress.textContent=text};
 let prepared;
 try{
   report("Preparing secure recording upload…");
   const resp=await fetch("/api/videos/prepare",{method:"POST",
     headers:{...authorization,"content-type":"application/json"},
     body:JSON.stringify({event_id:eventId,title:String(f.title||videoFile.name),size_bytes:videoFile.size})});
   const payload=await resp.json();
   if(!resp.ok||!payload?.id)throw new Error(payload.error||"Upload preparation rejected");
   prepared=payload;
   const id=encodeURIComponent(prepared.id);
   if(prepared.multipart){
     const size=prepared.chunkBytes||8388608;
     const count=Math.ceil(videoFile.size/size),parts=[];
     for(let part=1;part<=count;part++){
       const chunk=videoFile.slice((part-1)*size,Math.min(part*size,videoFile.size),"video/mp4");
       let data=null;
       for(let attempt=0;attempt<2;attempt++){
         try{
          const uploaded=await fetch("/api/videos/"+id+"/parts/"+part,{
            method:"PUT",headers:{...authorization,"content-type":"video/mp4","x-upload-size":String(chunk.size)},
            body:chunk});
          data=await uploaded.json();
          if(!uploaded.ok||!data?.etag)throw new Error(data.error||"Chunk upload failed");
          break;
         }catch(err){
           if(attempt===1)throw err;
         }
       }
       parts.push({partNumber:data.partNumber,etag:data.etag});
       report("Uploading recording · "+Math.round(part/count*100)+"%");
     }
     report("Finalizing your MP4…");
     const done=await fetch("/api/videos/"+id+"/complete",{method:"POST",
       headers:{...authorization,"content-type":"application/json"},
       body:JSON.stringify({parts})});
     const finalized=await done.json();
     if(!done.ok||!finalized.success)throw new Error(finalized.error||"Could not complete recording");
   }else{
     report("Uploading recording securely…");
     const uploaded=await fetch("/api/videos/"+id+"/upload",{method:"PUT",
       headers:{...authorization,"content-type":"video/mp4","x-upload-size":String(videoFile.size)},
       body:videoFile});
     const result=await uploaded.json();
     if(!uploaded.ok||!result.success)throw new Error(result.error||"Could not upload recording");
   }
   report("Recording published.");
   await reload();render();notice("Recording uploaded successfully.","success");
 }catch(error){
   report("Upload failed. "+error.message);
   notice(error.message,"error");
 }
}
else if(type==="lesson-resource"){
 const eventId=form.dataset.event,programId=form.dataset.program,file=form.querySelector('input[name="file"]')?.files?.[0];
 const allowed={"video/mp4":"mp4","video/webm":"webm","application/pdf":"pdf","image/png":"png","image/jpeg":"jpg"};
 const name=String(f.title||"").trim();
 if(name.length<2){notice("Give the resource a title.","error");return}
 const obj={event_id:eventId,kind:f.kind,title:name,published:true,created_by:user.id};
 if(file){
  if(!["application/pdf","image/png","image/jpeg"].includes(file.type)||file.size>52428800){notice("Upload a PDF or image below 50 MB.","error");return}
  if(f.kind==="link"){notice("Choose an HTTPS URL for links.","error");return}
  const path=programId+"/"+eventId+"/"+crypto.randomUUID()+"."+allowed[file.type];
  if(demo){obj.storage_path=path}
  else{
   const uploaded=await db.storage.from("hacksphere-course-files").upload(path,file,{contentType:file.type,cacheControl:"300",upsert:false});
   if(uploaded.error){notice("Upload failed: "+uploaded.error.message,"error");return}
   obj.storage_path=path;
  }
 }else if(f.external_url?.trim()){
  if(!/^https:\/\/[^ ]+$/.test(f.external_url.trim())){notice("Enter a secure HTTPS link.","error");return}
  if(f.kind==="video"&&!/\.(mp4|webm)(\?.*)?$/i.test(f.external_url.trim())){notice("Video URLs must link directly to MP4 or WebM.","error");return}
  obj.external_url=f.external_url.trim();
 }else if(f.kind==="notes"&&f.note_text?.trim()){
  obj.note_text=f.note_text.trim();
 }else{notice("Provide a file, HTTPS link or written notes.","error");return}
 await save("lesson_resources",obj);
}

else if(type==="media-upload"){
 let file=form.querySelector('input[name="resource_file"]')?.files?.[0];
 let allowed=["application/pdf","video/mp4","video/webm","image/png","image/jpeg"];
 if(!file||!allowed.includes(file.type)||file.size>52428800){notice("Choose a supported file under 50 MB.","error");return}
 let eventId=form.dataset.event,programId=form.dataset.program,extension={"application/pdf":"pdf","video/mp4":"mp4","video/webm":"webm","image/png":"png","image/jpeg":"jpg"}[file.type];
 let path=programId+"/"+eventId+"/"+crypto.randomUUID()+"."+extension;
 if(demo){await save("timeline_events",{resource_url:"storage://hacksphere-course-files/"+path},eventId);return}
 let result=await db.storage.from("hacksphere-course-files").upload(path,file,{contentType:file.type,cacheControl:"3600",upsert:false});
 if(result.error){notice(result.error.message,"error");return}
 await save("timeline_events",{resource_url:"storage://hacksphere-course-files/"+path},eventId);
}

else if(type==="quiz-create"){
 let eventId=form.dataset.event;
 await save("quizzes",{timeline_event_id:eventId,title:f.title,time_limit_minutes:Number(f.time_limit_minutes),max_attempts:Number(f.max_attempts),published:false,created_by:user.id});
}
else if(type==="quiz-question"){
 let opts=[f.option_a,f.option_b,f.option_c,f.option_d];
 if(opts.some(x=>x.trim().length<1)){notice("Complete all four options.","error");return}
 if(demo){D.quiz_questions.push({id:"demo-q"+Math.random().toString(36).slice(2),quiz_id:form.dataset.quiz,prompt:f.prompt,options:opts,position:D.quiz_questions.length+1});notice("Preview question added.","success");render()}
 else {
  let r=await db.rpc("add_quiz_question",{_quiz_id:form.dataset.quiz,_prompt:f.prompt,_options:opts,_correct_index:Number(f.correct_index),_points:1});
  if(r.error){notice(r.error.message,"error");return}
  await reload();render();notice("Question added securely.","success");
 }
}
else if(type==="quiz-attempt"){
 let answers={};let fields=[...form.querySelectorAll("fieldset[data-question]")];
 for(let q of fields){let chosen=q.querySelector('input[type="radio"]:checked');if(!chosen){notice("Answer every question.","error");return}answers[q.dataset.question]=Number(chosen.value)}
 if(demo){notice("Preview mode cannot submit a real graded quiz.");return}
 let r=await db.rpc("submit_quiz",{_quiz_id:form.dataset.quiz,_answers:answers});
 if(r.error){notice("Quiz failed: "+r.error.message,"error");return}
 await reload();render();notice("Quiz scored: "+r.data.score+" / "+r.data.max_score+" ("+r.data.percentage+"%)","success");
}
else if(type==="merchant"){await save("site_settings",{key:"legal_business",value:f,updated_by:user.id})}
else if(type==="score"){f.score=+f.score;f.max_score=+f.max_score;f.evaluator_id=user.id;await save("evaluations",f)}
else if(type==="payment"){const file=form.querySelector('input[name="proof_file"]')?.files?.[0];if(!file||!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5242880){notice("Upload a valid screenshot under 5 MB.","error");return}delete f.proof_file;f.student_id=user.id;f.amount_inr=p(f.program_id).fee_inr;if(demo){f.proof_path="demo-student/preview.png";await save("payment_claims",f)}else{const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";const path=user.id+"/"+crypto.randomUUID()+"."+ext;let uploaded=await db.storage.from("hacksphere-payment-proofs").upload(path,file,{contentType:file.type,upsert:false});if(uploaded.error){notice(uploaded.error.message,"error");return}f.proof_path=path;await save("payment_claims",f)}}
else if(type==="upi"){upi=f;await save("site_settings",{key:"payments_upi",value:f,updated_by:user.id})}
else if(type==="invite"){let email=f.email.toLowerCase();if(f.trainer)await save("staff_invitations",{email,role:"trainer",created_by:user.id});if(f.guide)await save("staff_invitations",{email,role:"guide",created_by:user.id})}
else if(type==="trainer"){f.role="trainer";f.assigned_by=user.id;await save("program_staff",f)}
else if(type==="guide"){f.allocated_by=user.id;await save("guide_allocations",f)}
else if(type==="recommend"){f.guide_user_id=user.id;await save("completion_recommendations",f)}
}catch(error){notice("Action failed: "+(error?.message||String(error)),"error")}
finally{form.dataset.busy="false";form.removeAttribute("aria-busy");if(submitButton){submitButton.disabled=false;if(savedButton!==undefined)submitButton.innerHTML=savedButton}}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){hideDialog();$("app-shell").classList.remove("drawer-open")}});

const LEGAL_PAGES={"/about":"About HackSphere","/contact":"Contact & support","/pricing":"Programs & pricing","/terms":"Terms & conditions","/privacy":"Privacy policy","/refunds":"Refund & cancellation policy","/delivery":"Digital delivery policy"};
async function showLegalPage(){
 const name=LEGAL_PAGES[location.pathname];if(!name)return false;
 let b={};
 if(db){try{let r=await db.rpc("get_hacksphere_public_business");if(!r.error)b=r.data||{}}catch(e){}}
 let contact=(b.support_email?'<a href="mailto:'+esc(b.support_email)+'">'+esc(b.support_email)+'</a>':'Support email: pending business confirmation');
 let phone=b.support_phone?'<p><b>Phone:</b> '+esc(b.support_phone)+'</p>':'';
 let address=b.address?'<p><b>Business address:</b> '+esc(b.address)+'</p>':'Business address: pending verified merchant details';
 let businessName=b.business_name||"HackSphere";
 let legalContact='<div class="legal-contact"><h3>Contact the operator</h3><p><b>Name:</b> '+esc(businessName)+'</p><p><b>Email:</b> '+contact+'</p>'+phone+'<p>'+address+'</p>'+(b.support_hours?'<p><b>Support hours:</b> '+esc(b.support_hours)+'</p>':'')+'</div>';
 const sections={
 "/about":'<p>HackSphere is an online learning management platform focused on structured technical training, project assignments and guided internship-style projects. Each course shows its own duration, published schedule, delivery format and fee.</p><h2>How learning works</h2><p>Student access follows the scheduled program calendar. Trainer evaluations and Internship Guide reviews are tracked separately, and any final completion certificate requires administrator approval.</p><p>HackSphere is not an employment placement agency. Enrollment does not guarantee a job, stipend, government accreditation or campus recruitment.</p>',
 "/contact":'<p>Use the verified support details below for questions about courses, payment verification, account access, cancellations or refunds. Please include your program and enrollment reference—not passwords or card details.</p>'+legalContact,
 "/pricing":'<p>Program prices, duration, start dates and available modes are shown on the published course cards. The amount shown for a course is the program enrollment fee in INR, unless a published offer states otherwise.</p><div id="public-price-list" class="policy-price-list"></div><p>During manual UPI enrollment, payment instructions are displayed only after the administrator configures official payment details. A submitted UTR is not proof of payment until actual bank credit is verified. Gateway checkout will be introduced only after a compliant merchant onboarding and integration process.</p>',
 "/terms":'<h2>Digital learning service</h2><p>By signing up, students receive access to the specific training and project internship schedule attached to an approved enrollment. Course dates, materials and instructor activities are program-specific. Future content unlocks by date, irrespective of past evaluation scores.</p><h2>Accounts and acceptable use</h2><p>Each person must use their own Google identity. Sharing login access, redistributing protected videos, misrepresenting assignment work or attempting to bypass restricted content is not permitted. Trainers and Internship Guides require administrator authorization.</p><h2>Fees and certificates</h2><p>Enrollment becomes active after verified payment or a separately disclosed authorized scholarship/test grant. A project certificate is issued only after the required completion review; participation alone does not guarantee certification or employment. See the Refunds & cancellations policy for any published refund terms.</p><h2>Support</h2>'+legalContact,
 "/privacy":'<h2>Information collected</h2><p>HackSphere uses Google account identity (name, email and provider identifier), enrolled programs, learning progress, quiz attempts, assignment links, feedback and certificate information. For manual UPI payment verification, the service may process the UTR and a payment-proof screenshot. Do not upload card numbers or banking passwords.</p><h2>Purpose and access</h2><p>Information is used to authenticate accounts, operate courses, assess submissions, verify enrollments and issue eligible documents. Admin, assigned Trainer, designated Internship Guide and the enrolled student have role-scoped access. Future content and private recordings are governed by server-side access policies.</p><h2>Service providers</h2><p>HackSphere uses Google OAuth for identity, Supabase for application data and private storage, and Cloudflare for website delivery. Google Meet may be used for live classes when enabled. Payment gateway providers may be introduced in the future, subject to their applicable notices and consent requirements.</p><h2>Privacy enquiries</h2><p>To request access, correction or deletion of personal data, contact the designated business support address. Operational retention and grievance contact details must be confirmed by the merchant before public payment-gateway launch.</p>'+legalContact,
 "/refunds":b.refund_policy?.trim()?'<div class="legal-policy-text">'+esc(b.refund_policy)+'</div>'+legalContact:'<div class="alert warning"><b>Refund and cancellation policy not yet published.</b><br>The business operator must approve and publish an accurate policy covering eligibility, request process, refund method and processing timeline before accepting public payments or submitting the site for payment-gateway review.</div>'+legalContact,
 "/delivery":'<h2>Digital service — no physical shipping</h2><p>HackSphere delivers access to online training materials, lessons and project dashboards electronically after approved enrollment. No physical product is shipped.</p><h2>Access timelines</h2><p>Students receive their account access after successful Google authentication and confirmation of their enrollment. A UPI claim is reviewed against actual bank credit; approval is manual. Specific lessons are released on their scheduled program dates, and internship activities follow the defined internship phase.</p><h2>Delivery enquiries</h2>'+legalContact
 };
 let nav='<nav class="legal-pill-nav" aria-label="Information pages">'+Object.entries(LEGAL_PAGES).map(([path,label])=>'<a class="'+(path===location.pathname?'active':'')+'" href="'+path+'">'+esc(label)+'</a>').join("")+'</nav>';
 const html='<section class="legal-page"><div class="container"><div class="legal-hero"><div class="eyebrow">HACKSPHERE · PLATFORM INFORMATION</div><h1>'+esc(name)+'</h1><p>Clear information about our online learning services.</p></div>'+nav+
 '<article class="legal-article">'+sections[location.pathname]+'</article></div></section>';
 const main=document.querySelector('#marketing main');main.innerHTML=html;
 document.title=name+" | HackSphere";
 $("marketing").hidden=false;$("app-shell").hidden=true;
 if(location.pathname==="/pricing"){
  const list=$("public-price-list");
  if(db){const r=await db.from("programs").select("title,description,fee_inr,training_days,internship_days,mode,start_date").eq("is_test",false).in("status",["published","ongoing"]).limit(50);if(!r.error&&r.data?.length)list.innerHTML=r.data.map(x=>'<div class="price-row"><div><b>'+esc(x.title)+'</b><small>'+x.training_days+' training + '+x.internship_days+' internship days · '+esc(x.mode)+'</small></div><strong>'+money(x.fee_inr)+'</strong></div>').join("");else list.innerHTML=empty("No public programs yet","Prices will be shown when admissions open.");}
  else list.innerHTML=empty("Pricing currently unavailable","Try again later.");
 }
 return true;
}

async function init(){try{if(location.pathname.startsWith("/preview/")){demo=true;reset();seed();user={id:"demo-student",email:"student@example.com",user_metadata:{full_name:"Preview Learner"}};readRoute();open();return}let r=await fetch("/api/config",{cache:"no-store"}),config=await r.json();if(config.supabaseUrl&&config.supabasePublishableKey&&window.supabase){db=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);if(await showLegalPage())return;let x=await db.auth.getUser();if(x.data.user){user=x.data.user;await reload();if(location.pathname==="/"){const assigned=D.staff_roles.filter(r=>r.user_id===user.id).map(r=>r.role);role=assigned.includes("admin")?"admin":assigned.includes("trainer")?"trainer":assigned.includes("guide")?"guide":"student"}open();
 if(sessionStorage.getItem("hacksphere_meet_sync")==="1"){
 sessionStorage.removeItem("hacksphere_meet_sync");
 setTimeout(()=>syncPendingMeet(),1000);
 }
 }else catalog();let verify=new URLSearchParams(location.search).get("verify");if(verify)showVerification(verify)}else {if(!await showLegalPage())drawCatalog()}}catch(e){console.warn(e);if(!await showLegalPage())drawCatalog()}}
init();
})();