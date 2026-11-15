import Link from "next/link";
import { ArrowRight, Award, BookOpenText, CalendarDays, CheckCircle2, Code2, Users } from "lucide-react";
const steps=[
 {number:"01",title:"Join a program",desc:"Enroll in a course with a clear syllabus, cohort schedule and mentor support."},
 {number:"02",title:"Learn from mentors",desc:"Scheduled classes, recordings, topic quizzes, notes and weekly mini-projects."},
 {number:"03",title:"Build together",desc:"After training, work on a meaningful in-house project in a five-student team."},
 {number:"04",title:"Prove your skills",desc:"Receive mentor feedback, complete your internship work and build a shareable portfolio."}
];
const features=[{icon:BookOpenText,title:"Structured learning",desc:"Your day-by-day training plan in one student dashboard."},
 {icon:Code2,title:"Weekly mini-projects",desc:"Practice topics with assignments shared across your batch."},
 {icon:Users,title:"Team internships",desc:"Five-student teams, allocated mentors and major projects."},
 {icon:CalendarDays,title:"Industry Connect",desc:"Career sessions scheduled by Admin for every enrolled student."}];
export default function Home(){
 return <main>
 <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-sky-50">
  <div className="hs-container grid gap-12 py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-32">
   <div>
    <span className="hs-eyebrow">HackSphere training + internship platform</span>
    <h1 className="mt-5 max-w-3xl text-5xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
     Learn new skills. <span className="text-indigo-600">Build real projects.</span> Grow with a team.</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Mentor-led technical programs, topic quizzes, weekly practical projects and supervised in-house team internships—all in one learning journey.</p>
    <div className="mt-9 flex flex-wrap gap-3">
     <Link href="/programs" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-4 font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700">Explore programs <ArrowRight size={18}/></Link>
     <Link href="/#how-it-works" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-7 py-4 font-semibold text-slate-800 hover:bg-slate-50">How it works</Link>
    </div>
    <div className="mt-9 flex flex-wrap gap-5 text-sm font-semibold text-slate-600"><span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-600" size={17}/> Scheduled live classes</span><span className="flex items-center gap-2"><CheckCircle2 className="text-emerald-600" size={17}/> Mentor-reviewed work</span></div>
   </div>
   <div className="hs-card relative overflow-hidden !rounded-3xl !p-0">
    <div className="bg-slate-950 px-7 py-8 text-white">
     <p className="text-xs font-bold tracking-widest text-indigo-300">EXAMPLE 100-DAY LEARNING JOURNEY</p>
     <h2 className="mt-3 text-2xl font-bold">Full Stack Development</h2>
     <p className="mt-2 text-sm text-slate-300">A flexible program model configured by Admin.</p>
    </div>
    <div className="space-y-6 p-7">
     <div><div className="mb-3 flex justify-between text-sm font-bold"><span>Training</span><span className="text-indigo-600">60 days</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-3/5 rounded-full bg-indigo-600"/></div></div>
     <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-indigo-50 p-4"><BookOpenText className="text-indigo-700"/><b className="mt-3 block">Learn & practice</b><p className="mt-1 text-xs leading-5 text-slate-600">Recorded lessons, notes, quizzes & weekly projects.</p></div>
      <div className="rounded-xl bg-emerald-50 p-4"><Users className="text-emerald-700"/><b className="mt-3 block">40-day internship</b><p className="mt-1 text-xs leading-5 text-slate-600">A supervised project with five students per team.</p></div>
     </div>
     <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><Award className="shrink-0 text-indigo-600"/><p className="text-sm text-slate-600"><strong className="text-slate-900">Verified outcomes</strong> — assessment, project reviews and completion criteria.</p></div>
    </div>
   </div>
  </div>
 </section>
 <section id="how-it-works" className="hs-container py-20"><span className="hs-eyebrow">The HackSphere method</span><h2 className="mt-4 text-4xl font-black">A clear path from classroom to project</h2>
 <div className="mt-10 grid gap-4 md:grid-cols-4">{steps.map(s=><article key={s.number} className="hs-card"><span className="text-sm font-black text-indigo-600">{s.number}</span><h3 className="mt-4 text-lg font-bold">{s.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{s.desc}</p></article>)}</div></section>
 <section id="internship" className="bg-white py-20"><div className="hs-container"><span className="hs-eyebrow">Built for practical outcomes</span><h2 className="mt-4 text-4xl font-black">Everything students need. Nothing unnecessary.</h2>
 <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{features.map(({icon:Icon,title,desc})=><article key={title} className="hs-card"><Icon className="text-indigo-600" size={28}/><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p></article>)}</div>
 <div className="mt-10 rounded-2xl bg-slate-950 px-8 py-10 text-white md:flex md:items-center md:justify-between"><div><h3 className="text-2xl font-bold">Ready to start building?</h3><p className="mt-2 text-slate-300">Browse available batches and choose the one that matches your goals.</p></div><Link className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 md:mt-0" href="/programs">Browse programs <ArrowRight size={17}/></Link></div>
 </div></section>
 </main>;
}
