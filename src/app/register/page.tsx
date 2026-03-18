
"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Erro", description: "As senhas não coincidem." });
      return;
    }

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: "Conta criada!", description: "Seja bem-vindo ao LedgerTrust." });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no registro",
        description: error.message || "Não foi possível criar sua conta."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-10 space-y-8 border border-slate-100">
        <Link href="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-colors mb-4 group">
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Voltar ao Início
        </Link>

        <div className="space-y-2">
          <div className="w-12 h-12 bg-[#E6F9F3] rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Novo Auditor</h1>
          <p className="text-slate-400 font-medium">Crie sua conta para acessar o ecossistema BMV.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail Profissional</Label>
            <Input 
              type="email" 
              placeholder="nome@empresa.com" 
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-5 focus:ring-primary"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Senha</Label>
            <Input 
              type="password" 
              placeholder="Mínimo 6 caracteres" 
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-5 focus:ring-primary"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmar Senha</Label>
            <Input 
              type="password" 
              placeholder="Repita sua senha" 
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-5 focus:ring-primary"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/20 mt-4"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Finalizar Cadastro"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-slate-400 font-medium">
            Já possui uma conta?{" "}
            <Link href="/" className="text-primary font-black uppercase tracking-widest hover:underline decoration-2 underline-offset-4 ml-1">
              Fazer Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
