import {requireAdmin} from "@/lib/supabase/authorization";
import {UpiSettings} from "@/components/admin/upi-settings";
export const dynamic="force-dynamic";
export default async function PaymentSettings(){
 const {db}=await requireAdmin();
 const {data}=await db.rpc("get_payment_instructions");
 return <main className="hs-container py-12">
  <span className="hs-eyebrow">Admin / Payment configuration</span>
  <h1 className="mt-3 text-3xl font-black">Official UPI QR settings</h1>
  <p className="mt-3 max-w-3xl text-slate-600">These exact details will appear to students during enrollment. Verify the payee, UPI ID and QR image before publishing.</p>
  <section className="hs-card mt-8 max-w-3xl"><UpiSettings settings={data||{}}/></section>
 </main>;
