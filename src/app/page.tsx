
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, Loader2, Moon, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  useEffect(() => {
    // Intercept legacy hash URLs (/#/certificate/[code]) and redirect them
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash;
      if (hash.startsWith("#/certificate/")) {
        const code = hash.replace("#/certificate/", "");
        if (code) {
          router.push(`/certificate/${code}`);
          return;
        }
      }
    }

    if (!isUserLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedUser = userCredential.user;

      // Sincronizar usuário logado com Firestore para aparecer na listagem
      await setDoc(doc(firestore, "users", loggedUser.uid), {
        id: loggedUser.uid,
        email: loggedUser.email,
        nome: loggedUser.email?.split('@')[0].toUpperCase() || "AUDITOR",
        role: 'auditor',
        status: 'ativo',
        ultimoAcesso: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

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

  const handleForgotPassword = async () => {
    if (!resetEmail) return;
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({ 
        title: "Link Enviado", 
        description: "Verifique seu e-mail para definir uma nova senha." 
      });
      setIsResetDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar e-mail",
        description: "Verifique se o endereço está correto."
      });
    } finally {
      setIsResetting(false);
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
      <button className="absolute top-8 right-8 w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
        <Moon className="w-5 h-5" />
      </button>

      <div className="w-full max-w-[420px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-12 border border-slate-100 flex flex-col items-center">
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
            <div className="flex justify-between items-center ml-1">
              <Label className="text-[13px] font-medium text-slate-500">Senha</Label>
              <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogTrigger asChild>
                  <button type="button" className="text-[11px] font-bold text-primary hover:underline uppercase tracking-tight">Esqueci a senha</button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl p-10 border-none bg-white max-w-sm">
                  <DialogHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                      <KeyRound className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-black uppercase text-slate-900">Definir Nova Senha</DialogTitle>
                    <DialogDescription className="text-slate-500">
                      Insira seu e-mail corporativo. Enviaremos um link seguro para você criar ou redefinir sua senha.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input 
                      placeholder="seu-email@bmv.global" 
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="h-14 rounded-xl"
                    />
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={handleForgotPassword} 
                      disabled={isResetting || !resetEmail}
                      className="w-full h-14 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
                    >
                      {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Link de Acesso"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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

      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
}
