import Link from "next/link";
import { GraduationCap, ArrowUpRight } from "lucide-react";
export function SiteHeader(){
 return <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
  <div className="hs-container flex h-18 items-center justify-between">
   <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950">
    <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><GraduationCap size={23}/></span>
    HackSphere
   </Link>
   <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
    <Link href="/programs" className="hover:text-indigo-600">Programs</Link>
    <Link href="/#how-it-works" className="hover:text-indigo-600">How it works</Link>
    <Link href="/#internship" className="hover:text-indigo-600">Internships</Link>
   </nav>
   <Link href="/login" className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
    Student Login <ArrowUpRight size={16}/></Link>
  </div></header>;
}
