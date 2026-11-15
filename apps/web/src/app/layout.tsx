import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
export const metadata:Metadata={title:"HackSphere | Learn. Build. Intern.",description:"Mentor-led technical training, real projects and in-house team internships."};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><SiteHeader/>{children}<footer className="mt-24 border-t border-slate-200 bg-white">
 <div className="hs-container flex flex-wrap items-center justify-between gap-3 py-8 text-sm text-slate-500">
 <p>© {new Date().getFullYear()} HackSphere. Build skills through real work.</p>
 <p>Training and in-house internship outcomes depend on completing published requirements.</p>
 </div></footer></body></html>;
}
