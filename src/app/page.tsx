
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Bem-vindo!", description: "Acesso autorizado ao LedgerTrust." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "E-mail ou senha incorretos."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white overflow-hidden">
      {/* Lado Esquerdo - Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#0F172A] text-white relative">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter">LedgerTrust</span>
          </div>
          
          <div className="space-y-6 max-w-md">
            <h1 className="text-5xl font-black leading-tight uppercase tracking-tighter">
              Auditoria & <br /> Rastreabilidade <br /> <span className="text-primary">Blockchain.</span>
            </h1>
            <p className="text-slate-400 font-medium leading-relaxed">
              Sistema avançado de conformidade para Unidades de Crédito de Sustentabilidade (UCS) e ativos ambientais do ecossistema BMV.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          <div className="flex -space-x-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0F172A] bg-slate-800 overflow-hidden">
                <img src={`https://picsum.photos/seed/${i + 10}/100/100`} alt="user" />
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Utilizado por mais de <span className="text-white">500 auditores</span> ativos
          </p>
        </div>

        {/* Decorativo de fundo */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
           <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] rounded-full bg-primary blur-[120px]"></div>
        </div>
      </div>

      {/* Lado Direito - Formuário */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-24 bg-white">
        <div className="w-full max-w-sm space-y-10">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex justify-center mb-8">
               <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Acessar Portal</h2>
            <p className="text-slate-400 font-medium">Entre com suas credenciais de auditor.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail Corporativo</Label>
              <Input 
                type="email" 
                placeholder="nome@empresa.com" 
                className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 px-6 focus:ring-primary focus:border-primary"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Senha</Label>
                <Link href="#" className="text-[10px] font-black uppercase text-primary tracking-widest">Esqueceu a senha?</Link>
              </div>
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="h-14 rounded-2xl border-slate-200 bg-slate-50/50 px-6 focus:ring-primary focus:border-primary"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Sistema"}
            </Button>
          </form>

          <div className="pt-8 text-center border-t border-slate-100">
            <p className="text-sm text-slate-400 font-medium">
              Ainda não possui acesso?{" "}
              <Link href="/register" className="text-primary font-black uppercase tracking-widest hover:underline decoration-2 underline-offset-4 ml-1">
                Solicitar Registro
              </Link>
            </p>
          </div>

          <p className="text-[8px] text-center font-bold text-slate-300 uppercase tracking-widest pt-12">
            © 2024 BMV LedgerTrust • Sistema Restrito de Auditoria
          </p>
        </div>
      </div>
    </div>
  );
}
