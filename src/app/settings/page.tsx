"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  User, 
  Users, 
  Shield, 
  Key, 
  Loader2, 
  ShieldCheck,
  Search,
  Trash2,
  UserPlus
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { AppUser } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState("perfil");

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "users"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: appUsers, isLoading: isUsersLoading } = useCollection<AppUser>(usersQuery);

  const handleDeleteUser = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "users", id));
    toast({ variant: "destructive", title: "Usuário removido" });
  };

  const handleSeedUsers = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const mockUsers: AppUser[] = [
      { id: "U-001", nome: "Admin LedgerTrust", email: "admin@bmv.global", role: "admin", status: "ativo", ultimoAcesso: new Date().toISOString(), createdAt: new Date().toISOString() },
      { id: "U-002", nome: "Auditor de UCS", email: "auditor@bmv.global", role: "auditor", status: "ativo", ultimoAcesso: new Date().toISOString(), createdAt: new Date().toISOString() }
    ];
    mockUsers.forEach(u => batch.set(doc(firestore, "users", u.id), u));
    await batch.commit();
    toast({ title: "Usuários de teste gerados" });
  };

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const userInitial = user.email?.substring(0, 1).toUpperCase() || "A";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER PADRÃO VISUAL */}
        <header className="h-20 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#734DCC]/10 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#734DCC]" />
            </div>
            <h1 className="text-[22px] font-black uppercase tracking-[0.1em] text-slate-900">Configurações</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Auditor Autenticado</p>
              <p className="text-sm font-bold text-slate-900 leading-none">{user.email}</p>
            </div>
            <div className="w-12 h-12 bg-[#734DCC] rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg shadow-indigo-100 uppercase">
              {user.email?.substring(0,2)}
            </div>
          </div>
        </header>

        <div className="flex-1 p-10 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col lg:flex-row gap-10">
              {/* MENU LATERAL DE CONFIGURAÇÕES */}
              <div className="w-full lg:w-72">
                <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-3">
                  <TabsTrigger value="perfil" className="w-full justify-start gap-4 h-16 px-8 rounded-2xl border-2 border-transparent data-[state=active]:border-[#734DCC] data-[state=active]:bg-white data-[state=active]:text-[#734DCC] text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all shadow-none">
                    <User className="w-4 h-4" /> Meu Perfil
                  </TabsTrigger>
                  <TabsTrigger value="usuarios" className="w-full justify-start gap-4 h-16 px-8 rounded-2xl border-2 border-transparent data-[state=active]:border-[#734DCC] data-[state=active]:bg-white data-[state=active]:text-[#734DCC] text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all shadow-none">
                    <Users className="w-4 h-4" /> Gerenciar Usuários
                  </TabsTrigger>
                  <TabsTrigger value="seguranca" className="w-full justify-start gap-4 h-16 px-8 rounded-2xl border-2 border-transparent data-[state=active]:border-[#734DCC] data-[state=active]:bg-white data-[state=active]:text-[#734DCC] text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all shadow-none">
                    <Shield className="w-4 h-4" /> Segurança & Logs
                  </TabsTrigger>
                  <TabsTrigger value="api" className="w-full justify-start gap-4 h-16 px-8 rounded-2xl border-2 border-transparent data-[state=active]:border-[#734DCC] data-[state=active]:bg-white data-[state=active]:text-[#734DCC] text-[11px] font-black uppercase tracking-widest text-slate-400 transition-all shadow-none">
                    <Key className="w-4 h-4" /> Chaves de API
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* CONTEÚDO DA PÁGINA */}
              <div className="flex-1">
                <TabsContent value="perfil" className="mt-0">
                  <Card className="rounded-[2.5rem] border-none shadow-sm p-12 bg-white">
                    <div className="mb-10">
                      <h2 className="text-[28px] font-black uppercase text-slate-900 leading-none mb-3">Perfil do Auditor</h2>
                      <p className="text-sm font-medium text-slate-400">Informações de identificação no ecossistema BMV.</p>
                    </div>

                    <div className="flex items-center gap-8 mb-12">
                      <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 text-4xl font-black">
                        {userInitial}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-900">Auditor Responsável</h3>
                        <p className="text-base text-slate-400 font-medium">{user.email}</p>
                        <Badge variant="secondary" className="bg-[#E6F9F3] text-[#10B981] border-none font-black text-[10px] uppercase px-3 py-1 mt-2">
                          Acesso Autorizado
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</Label>
                        <Input defaultValue="Auditor Master" className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl px-6 font-bold text-slate-900" />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Cargo / Função</Label>
                        <Input defaultValue="Auditor de UCS" className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl px-6 font-bold text-slate-900" />
                      </div>
                      <div className="space-y-3 col-span-1">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail Corporativo</Label>
                        <Input value={user.email || ""} disabled className="h-14 bg-slate-50/80 border-none rounded-2xl px-6 font-bold text-slate-400 cursor-not-allowed" />
                      </div>
                      <div className="flex items-end">
                        <Button className="h-14 w-full rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[12px] tracking-widest shadow-xl shadow-indigo-100">
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="usuarios" className="mt-0 space-y-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-[28px] font-black uppercase text-slate-900 leading-none mb-3">Gestão de Usuários</h2>
                      <p className="text-sm font-medium text-slate-400">Controle de acesso e permissões administrativas.</p>
                    </div>
                    <div className="flex gap-4">
                      {(!appUsers || appUsers.length === 0) && (
                        <Button onClick={handleSeedUsers} variant="outline" className="h-14 px-8 rounded-2xl text-[12px] font-black uppercase border-dashed">
                          Gerar Usuários Teste
                        </Button>
                      )}
                      <Button className="h-14 px-10 rounded-2xl bg-[#734DCC] text-white font-black uppercase text-[12px] tracking-widest shadow-xl shadow-indigo-100 flex gap-2">
                        <UserPlus className="w-5 h-5" /> Novo Auditor
                      </Button>
                    </div>
                  </div>

                  <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100 h-16">
                          <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 pl-10">Auditor</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Nível</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-widest text-slate-400 text-right pr-10">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isUsersLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-40 text-center">
                              <Loader2 className="w-8 h-8 text-[#734DCC] animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : !appUsers || appUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-40 text-center text-slate-400 font-bold uppercase text-[12px]">Nenhum auditor cadastrado</TableCell>
                          </TableRow>
                        ) : (
                          appUsers.map((item) => (
                            <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all h-20">
                              <TableCell className="pl-10">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs">
                                    {item.nome.substring(0,1)}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-black text-slate-900 uppercase">{item.nome}</span>
                                    <span className="text-[11px] text-slate-400 font-medium">{item.email}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[9px] uppercase px-2">
                                  {item.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", item.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-300')} />
                                  <span className="text-[11px] font-black text-slate-600 uppercase">{item.status}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-10">
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
                                  <Trash2 className="w-5 h-5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                <TabsContent value="seguranca" className="mt-0">
                  <Card className="rounded-[2.5rem] border-none shadow-sm p-20 bg-white flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                      <ShieldCheck className="w-10 h-10 text-slate-200" />
                    </div>
                    <div>
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Logs de Conformidade</h3>
                      <p className="text-sm text-slate-300 font-medium">As gravações de auditoria estão ativas e sendo sincronizadas em tempo real.</p>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="api" className="mt-0">
                  <Card className="rounded-[2.5rem] border-none shadow-sm p-12 bg-white space-y-8">
                    <div>
                      <h2 className="text-[28px] font-black uppercase text-slate-900 leading-none mb-3">Integração Ledger</h2>
                      <p className="text-sm font-medium text-slate-400">Configure o acesso via API para sistemas externos.</p>
                    </div>
                    <div className="bg-slate-50 p-8 rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Chave de Produção</p>
                        <p className="text-sm font-mono text-slate-600">lt_prod_********************************</p>
                      </div>
                      <Button variant="outline" className="h-12 px-6 rounded-xl text-[10px] font-black uppercase border-slate-200">Revogar Chave</Button>
                    </div>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
