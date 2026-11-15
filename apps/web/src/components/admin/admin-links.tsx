import Link from "next/link";
import { CalendarDays, GraduationCap, Mic2, Users, UsersRound } from "lucide-react";
const links=[
 {href:"/workspace/admin/courses",name:"Course catalog",icon:GraduationCap},
 {href:"/workspace/admin/programs",name:"Create program",icon:GraduationCap},
 {href:"/workspace/admin/mentors",name:"Assign mentors",icon:Users},
 {href:"/workspace/admin/schedule",name:"Schedule learning",icon:CalendarDays},
 {href:"/workspace/admin/teams",name:"Internship teams",icon:UsersRound},
 {href:"/workspace/admin/events",name:"Global guest sessions",icon:Mic2},
 {href:"/workspace/admin/payments",name:"Payment approvals",icon:GraduationCap}
];
export function AdminLinks(){
 return <nav aria-label="Administration actions" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
 {links.map(({href,name,icon:Icon})=><Link key={href} href={href} className="hs-card flex items-center gap-3 hover:border-indigo-300">
 <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon size={21}/></span>
 <span className="font-semibold">{name}</span></Link>)}</nav>;
}
