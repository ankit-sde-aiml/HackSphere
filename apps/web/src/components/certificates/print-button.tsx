"use client";
import {Printer} from "lucide-react";
import {Button} from "@/components/ui/button";
export function PrintCertificateButton(){
 return <Button type="button" onClick={()=>window.print()}><Printer size={17}/> Print / Save PDF</Button>;
}
