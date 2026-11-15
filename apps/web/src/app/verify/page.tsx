import {VerificationForm} from "@/components/verify/verification-form";
export default async function VerifyPage({searchParams}:{searchParams:Promise<{code?:string}>}){
 const {code}=await searchParams;
 return <main className="hs-container py-16"><span className="hs-eyebrow">Public certificate verification</span>
 <h1 className="mt-3 text-4xl font-black">Verify a HackSphere document</h1>
 <p className="mt-3 max-w-2xl text-slate-600">Check authenticity of a program offer letter or internship completion certificate using its unique code.</p>
 <section className="hs-card mt-9 max-w-xl"><VerificationForm initialCode={code||""}/></section>
 </main>;
}
