
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
  Trash2,
  UserPlus,
  ShieldCheck,
  RefreshCw,
  Plus
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, writeBatch, setDoc } from "firebase/firestore";
import { AppUser } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState("perfil");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({ nome: "", email: "", role: "auditor" });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!firestore || !user || isUserLoading) return;
    
    const syncUser = async () => {
      const userRef = doc(firestore, "users", user.uid);
      await setDoc(userRef, {
        id: user.uid,
        nome: user.email?.split('@')[0].toUpperCase() || "AUDITOR",
        email: user.email,
        role: 'admin',
        status: 'ativo',
        ultimoAcesso: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }, { merge: true });
    };
    
    syncUser();
  }, [firestore, user, isUserLoading]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "users");
  }, [firestore, user]);

  const { data: appUsers, isLoading: isUsersLoading } = useCollection<AppUser>(usersQuery);

  const handleDeleteUser = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "users", id));
    toast({ variant: "destructive", title: "Usuário removido" });
  };

  const handleAddAuditor = async () => {
    if (!firestore || !newUserData.nome || !newUserData.email) return;
    
    const newId = `U-${Date.now()}`;
    const userRef = doc(firestore, "users", newId);
    
    await setDoc(userRef, {
      id: newId,
      nome: newUserData.nome.toUpperCase(),
      email: newUserData.email,
      role: newUserData.role,
      status: 'ativo',
      ultimoAcesso: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    toast({ title: "Auditor Adicionado", description: "O novo perfil foi criado no LedgerTrust." });
    setNewUserData({ nome: "", email: "", role: "auditor" });
    setIsAddingUser(false);
  };

  const handleSeedUsers = async () => {
    if (!firestore || !user) return;
    const batch = writeBatch(firestore);
    
    const mockUsers: AppUser[] = [
      { id: "U-001", nome: "LUIZPAULO.JESUS", email: "luizpaulo.jesus@bmv.global", role: "auditor", status: "ativo", ultimoAcesso: new Date().toISOString(), createdAt: new Date().toISOString() },
      { id: "U-002", nome: "ADMINISTRADOR BMV", email: "admin@bmv.global", role: "admin", status: "ativo", ultimoAcesso: new Date().toISOString(), createdAt: new Date().toISOString() },
    ];
    
    mockUsers.forEach(u => batch.set(doc(firestore, "users", u.id), u));
    await batch.commit();
    toast({ title: "Usuários de teste sincronizados" });
  };

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const userInitial = user.email?.substring(0, 2).toUpperCase() || "LU";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 bg-white px-12 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-[#734DCC]/10 rounded-2xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-[#734DCC]" />
            </div>
            <div>
              <h1 className="text-[32px] font-black uppercase tracking-tight text-slate-900 leading-none">Configurações</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1">Gestão de Governança LedgerTrust</p>
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none mb-1.5">Auditor Autenticado</p>
              <p className="text-[14px] font-bold text-slate-900 leading-none">{user.email}</p>
            </div>
            <div className="w-14 h-14 bg-[#734DCC] rounded-full flex items-center justify-center text-white font-black text-lg shadow-xl shadow-indigo-100 uppercase">
              {userInitial}
            </div>
          </div>
        </header>

        <div className="flex-1 p-12 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="w-full lg:w-80">
                <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-4">
                  <SettingsTabTrigger value="perfil" icon={User} label="Meu Perfil" />
                  <SettingsTabTrigger value="usuarios" icon={Users} label="Gerenciar Usuários" />
                  <SettingsTabTrigger value="seguranca" icon={Shield} label="Segurança & Logs" />
                  <SettingsTabTrigger value="api" icon={Key} label="Chaves de API" />
                </TabsList>
              </div>

              <div className="flex-1">
                <TabsContent value="perfil" className="mt-0">
                  <Card className="rounded-[3rem] border-none shadow-sm p-14 bg-white">
                    <div className="mb-12">
                      <h2 className="text-[32px] font-black uppercase text-slate-900 leading-none mb-4">Perfil do Auditor</h2>
                      <p className="text-sm font-medium text-slate-400">Informações de identificação técnica no ecossistema BMV.</p>
                    </div>

                    <div className="flex items-center gap-10 mb-14">
                      <div className="w-28 h-28 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300 text-5xl font-black uppercase">
                        {userInitial[0]}
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-[24px] font-black text-slate-900 uppercase tracking-tight">Auditor Responsável</h3>
                        <p className="text-base text-slate-400 font-bold">{user.email}</p>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none font-black text-[10px] uppercase px-4 py-1.5 mt-3 rounded-full">
                          Acesso Autorizado ✓
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-3.5">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Nome Completo</Label>
                        <Input defaultValue={user.email?.split('@')[0].toUpperCase()} className="h-16 bg-slate-50/50 border-slate-100 rounded-2xl px-8 font-black text-[14px] text-slate-900 uppercase" />
                      </div>
                      <div className="space-y-3.5">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">Cargo / Função</Label>
                        <Input defaultValue="Auditor de UCS" className="h-16 bg-slate-50/50 border-slate-100 rounded-2xl px-8 font-black text-[14px] text-slate-900 uppercase" />
                      </div>
                      <div className="space-y-3.5 col-span-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1">E-mail Corporativo</Label>
                        <Input value={user.email || ""} disabled className="h-16 bg-slate-50 border-none rounded-2xl px-8 font-bold text-slate-300 cursor-not-allowed" />
                      </div>
                      <div className="flex items-end">
                        <Button className="h-16 w-full rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-2xl shadow-indigo-100 transition-all active:scale-95">
                          Salvar Alterações
                        </Button>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="usuarios" className="mt-0 space-y-10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-[32px] font-black uppercase text-slate-900 leading-none mb-2">Gestão de Auditores</h2>
                      <p className="text-[14px] font-medium text-slate-400">Controle de acesso e permissões administrativas da rede.</p>
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={handleSeedUsers} variant="outline" className="h-16 px-10 rounded-2xl text-[12px] font-black uppercase border-dashed border-slate-300 flex gap-3 hover:bg-slate-50">
                        <RefreshCw className="w-4 h-4" /> Sincronizar
                      </Button>
                      
                      <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                        <DialogTrigger asChild>
                          <Button className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-xl shadow-emerald-100 flex gap-3 transition-all active:scale-95">
                            <UserPlus className="w-5 h-5" /> Novo Auditor
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-white rounded-3xl p-8 border-none">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase text-slate-900">Novo Auditor</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6 mt-6">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Nome Completo</Label>
                              <Input 
                                placeholder="EX: JOÃO SILVA" 
                                value={newUserData.nome} 
                                onChange={e => setNewUserData({...newUserData, nome: e.target.value})}
                                className="h-14 rounded-xl border-slate-100 bg-slate-50 uppercase font-bold"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">E-mail Corporativo</Label>
                              <Input 
                                type="email" 
                                placeholder="nome@bmv.global" 
                                value={newUserData.email} 
                                onChange={e => setNewUserData({...newUserData, email: e.target.value})}
                                className="h-14 rounded-xl border-slate-100 bg-slate-50 font-bold"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Nível de Acesso</Label>
                              <Select value={newUserData.role} onValueChange={v => setNewUserData({...newUserData, role: v})}>
                                <SelectTrigger className="h-14 rounded-xl bg-slate-50 border-slate-100 font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auditor">AUDITOR</SelectItem>
                                  <SelectItem value="admin">ADMINISTRADOR</SelectItem>
                                  <SelectItem value="viewer">VISUALIZADOR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleAddAuditor} className="w-full h-14 rounded-xl bg-primary text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-100">
                              Confirmar Cadastro
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <Card className="rounded-[3rem] border-none shadow-sm overflow-hidden bg-white min-h-[500px]">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-b border-slate-100 h-16">
                          <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 pl-12">Auditor</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Nível</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Status</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-right pr-12">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isUsersLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-80 text-center">
                              <div className="flex flex-col items-center gap-6">
                                <Loader2 className="w-12 h-12 text-[#734DCC] animate-spin" />
                                <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">Sincronizando...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : !appUsers || appUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-80 text-center">
                              <div className="flex flex-col items-center gap-6 opacity-30">
                                <Users className="w-16 h-16 text-slate-300" />
                                <span className="text-[14px] font-black uppercase text-slate-400 tracking-[0.2em]">Nenhum auditor encontrado</span>
                                <Button onClick={handleSeedUsers} variant="link" className="text-[#734DCC] font-bold">Gerar Dados de Teste</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          appUsers.map((item) => (
                            <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-all h-24">
                              <TableCell className="pl-12">
                                <div className="flex items-center gap-5">
                                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-base uppercase">
                                    {item.nome ? item.nome.substring(0,1) : "U"}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[14px] font-black text-slate-900 uppercase tracking-tight">{item.nome || "AUDITOR"}</span>
                                    <span className="text-[11px] text-slate-400 font-bold">{item.email}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-black text-[10px] uppercase px-3 py-1 rounded-md">
                                  {item.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={cn("w-2.5 h-2.5 rounded-full", item.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-300')} />
                                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.1em]">{item.status}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-12">
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors h-12 w-12 rounded-xl">
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
                  <Card className="rounded-[3.5rem] border-none shadow-sm p-32 bg-white flex flex-col items-center justify-center text-center space-y-10">
                    <div className="w-32 h-32 bg-slate-50/50 rounded-full flex items-center justify-center border border-slate-100">
                      <ShieldCheck className="w-16 h-16 text-slate-200" />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-[13px] font-black text-[#94A3B8] uppercase tracking-[0.25em] leading-none">Logs de Conformidade Técnica</h3>
                      <p className="text-[15px] text-[#94A3B8] font-medium max-w-sm mx-auto leading-relaxed">
                        As gravações de auditoria estão ativas e sendo sincronizadas em tempo real com o Ledger.
                      </p>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="api" className="mt-0">
                  <Card className="rounded-[3rem] border-none shadow-sm p-14 bg-white space-y-10">
                    <div>
                      <h2 className="text-[32px] font-black uppercase text-slate-900 leading-none mb-4">Integração Ledger</h2>
                      <p className="text-sm font-medium text-slate-400">Configure o acesso via API para sistemas externos de rastreabilidade.</p>
                    </div>
                    <div className="bg-slate-50 p-10 rounded-[2rem] flex items-center justify-between border border-slate-100">
                      <div className="space-y-2">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Chave de Produção Ativa</p>
                        <p className="text-base font-mono text-slate-600 font-bold">lt_prod_********************************</p>
                      </div>
                      <Button variant="outline" className="h-14 px-8 rounded-2xl text-[11px] font-black uppercase border-slate-200 tracking-widest hover:bg-white">Revogar Chave</Button>
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

function SettingsTabTrigger({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
  return (
    <TabsTrigger 
      value={value} 
      className="w-full justify-start gap-5 h-20 px-10 rounded-full border-2 border-transparent data-[state=active]:border-[#734DCC] data-[state=active]:bg-white data-[state=active]:text-[#734DCC] text-[12px] font-black uppercase tracking-[0.15em] text-slate-400 transition-all shadow-none group"
    >
      <Icon className="w-5 h-5 transition-colors group-data-[state=active]:text-[#734DCC]" />
      {label}
    </TabsTrigger>
  );
}
