import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request:NextRequest){
 const {searchParams,origin}=new URL(request.url);
 const code=searchParams.get("code");
 const proposed=searchParams.get("next")||"/workspace";
 const next=proposed.startsWith("/")&&!proposed.startsWith("//")?proposed:"/workspace";
 if(!code)return NextResponse.redirect(new URL("/login?error=missing_code",origin));
 const supabase=await createClient();
 const {error}=await supabase.auth.exchangeCodeForSession(code);
 if(error)return NextResponse.redirect(new URL("/login?error=oauth_failed",origin));
 return NextResponse.redirect(new URL(next,origin));
}
