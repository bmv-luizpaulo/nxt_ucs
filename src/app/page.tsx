"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, Loader2, Moon } from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 relative overflow-hidden">
      {/* Dark Mode Toggle Placeholder */}
      <button className="absolute top-8 right-8 w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
        <Moon className="w-5 h-5" />
      </button>

      {/* Login Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-12 border border-slate-100 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-4">
          <h1 className="text-[52px] font-black text-slate-900 leading-none tracking-tighter">bmv</h1>
        </div>
        
        <h2 className="text-[22px] font-bold text-[#1E293B] mb-12">Acesso Restrito</h2>

        <form onSubmit={handleLogin} className="w-full space-y-8">
          <div className="space-y-2.5">
            <Label className="text-[13px] font-medium text-slate-500 ml-1">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                type="email" 
                placeholder="admin@bmv.com.br" 
                className="h-14 rounded-2xl border-slate-200 bg-white pl-12 pr-6 focus:ring-primary focus:border-primary text-slate-900 font-medium"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-[13px] font-medium text-slate-500 ml-1">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                type="password" 
                placeholder="••••••••" 
                className="h-14 rounded-2xl border-slate-200 bg-white pl-12 pr-6 focus:ring-primary focus:border-primary text-slate-900 font-medium"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 rounded-2xl bg-[#10B981] hover:bg-[#0D9488] text-white font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Entrar <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-10 text-center">
          <Link href="/register" className="text-sm font-semibold text-slate-400 hover:text-primary transition-colors">
            Solicitar acesso ao sistema
          </Link>
        </div>
      </div>

      {/* Decorative background blur */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
}