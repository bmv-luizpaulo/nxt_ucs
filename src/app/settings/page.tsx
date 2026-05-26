
"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  User, 
  Users, 
  Shield, 
  Loader2, 
  Trash2,
  UserPlus,
  ShieldCheck,
  RefreshCw,
  Copy,
  MessageCircle,
  Mail,
  CheckCircle2,
  KeyRound,
  Search,
  Filter,
  X,
  Download,
  Activity,
  Clock,
  UserCheck
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from "@/firebase";
import { collection, doc, deleteDoc, writeBatch, setDoc, query, orderBy, limit } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { AppUser, AuditLog, AuditAction } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { writeAuditLog } from "@/lib/audit";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState("perfil");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showInviteResult, setShowInviteResult] = useState(false);
  const [newUserData, setNewUserData] = useState({ nome: "", email: "", role: "auditor", cargo: "", cpf: "", telefone: "" });
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [generatedLink, setGeneratedLink] = useState("");
  const [profileForm, setProfileForm] = useState({ nome: "", cargo: "", cpf: "" });

  // Filtros da aba de logs
  const [logSearch, setLogSearch] = useState("");
  const [logUserFilter, setLogUserFilter] = useState("all");
  const [logActionFilter, setLogActionFilter] = useState("all");
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  // A sincronização inicial agora é tratada apenas no login ou criação.
  // Removido syncUser repetitivo que sobrescrevia o nome do auditor.


  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "users");
  }, [firestore, user]);

  const { data: appUsers, isLoading: isUsersLoading } = useCollection<AppUser>(usersQuery);

  // Logs reais do Firestore — últimos 500, ordenados por timestamp desc
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "auditLogs"), orderBy("timestamp", "desc"), limit(500));
  }, [firestore, user]);

  const { data: rawLogs, isLoading: isLogsLoading } = useCollection<AuditLog>(logsQuery);

  const staffUsers = appUsers ? appUsers.filter(u => !!u.email && !!u.role) : [];

  useEffect(() => {
    if (appUsers && user && !profileForm.nome) { // Só inicializa se o formulário estiver vazio
       const me = appUsers.find(u => u.email === user.email);
       if (me) {
         setProfileForm({
           nome: me.nome || user.email?.split('@')[0].toUpperCase() || "",
           cargo: me.cargo || "AUDITOR DE UCS",
           cpf: me.cpf || ""
         });
       }
    }
  }, [appUsers, user, profileForm.nome]);

  const handleUpdateProfile = async () => {
    if (!firestore || !user) return;
    const userRef = doc(firestore, "users", user.uid);
    await setDoc(userRef, {
      ...profileForm,
      nome: profileForm.nome.toUpperCase(),
      cargo: profileForm.cargo.toUpperCase(),
      ultimoAcesso: new Date().toISOString()
    }, { merge: true });
    await writeAuditLog(firestore, user, "ATUALIZACAO_PERFIL", `Perfil atualizado: ${profileForm.nome}`);
    toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
  };

  const handleDeleteUser = async (id: string) => {
    if (!firestore || !user) return;
    const target = staffUsers.find(u => u.id === id);
    await deleteDoc(doc(firestore, "users", id));
    await writeAuditLog(firestore, user, "REMOCAO_AUDITOR", target?.nome ?? id, { targetId: id });
    toast({ variant: "destructive", title: "Usuário removido" });
  };

  const handleAddAuditor = async () => {
    if (!firestore || !newUserData.nome || !newUserData.email || !user) return;
    
    const newId = `U-${Date.now()}`;
    const userRef = doc(firestore, "users", newId);
    
    await setDoc(userRef, {
      id: newId,
      nome: newUserData.nome.toUpperCase(),
      email: newUserData.email,
      role: newUserData.role,
      cargo: newUserData.cargo.toUpperCase(),
      cpf: newUserData.cpf,
      status: 'pendente',
      ultimoAcesso: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    await writeAuditLog(firestore, user, "CADASTRO_AUDITOR", newUserData.nome.toUpperCase(), {
      targetId: newId,
      metadata: { email: newUserData.email, role: newUserData.role }
    });

    const baseUrl = window.location.origin;
    setGeneratedLink(baseUrl);
    
    setIsAddingUser(false);
    setShowInviteResult(true);
    toast({ title: "Registro Criado", description: "O auditor foi pré-cadastrado. Ele deve usar o fluxo 'Esqueci a Senha' ou se registrar." });
  };

  const handleUpdateUser = async () => {
    if (!firestore || !editingUser || !user) return;
    
    const userRef = doc(firestore, "users", editingUser.id);
    await setDoc(userRef, {
      ...editingUser,
      nome: editingUser.nome.toUpperCase(),
      cargo: editingUser.cargo?.toUpperCase() || "",
    }, { merge: true });

    await writeAuditLog(firestore, user, "EDICAO_AUDITOR", editingUser.nome.toUpperCase(), { targetId: editingUser.id });
    setEditingUser(null);
    toast({ title: "Auditor Atualizado", description: "As informações foram salvas com sucesso." });
  };

  const handleSendResetLink = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      if (firestore && user) await writeAuditLog(firestore, user, "RESET_SENHA", email);
      toast({ title: "Link Enviado", description: "O auditor recebeu as instruções por e-mail." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao enviar link", description: "O usuário pode ainda não ter uma conta no Auth." });
    }
  };

  const handleShareWhatsApp = () => {
    const message = `Olá ${newUserData.nome}! Você foi convidado para o ecossistema LedgerTrust Auditoria. \n\nPara acessar, utilize seu e-mail corporativo: ${newUserData.email} \n\nDefina sua senha no portal bmv acessando: ${generatedLink} e clicando em 'Esqueci minha senha'.`;
    const phone = newUserData.telefone.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "Link copiado!" });
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

  // Logs filtrados (client-side após busca do Firestore)
  const filteredLogs = useMemo(() => {
    if (!rawLogs) return [];
    return rawLogs.filter(log => {
      const searchLower = logSearch.toLowerCase();
      const matchesSearch = !logSearch ||
        log.target.toLowerCase().includes(searchLower) ||
        log.userName.toLowerCase().includes(searchLower) ||
        log.userEmail.toLowerCase().includes(searchLower);
      const matchesUser = logUserFilter === "all" || log.userEmail === logUserFilter;
      const matchesAction = logActionFilter === "all" || log.action === logActionFilter;
      const logDate = new Date(log.timestamp);
      const matchesFrom = !logDateFrom || logDate >= new Date(logDateFrom);
      const matchesTo = !logDateTo || logDate <= new Date(logDateTo + "T23:59:59");
      return matchesSearch && matchesUser && matchesAction && matchesFrom && matchesTo;
    });
  }, [rawLogs, logSearch, logUserFilter, logActionFilter, logDateFrom, logDateTo]);

  const last24hCount = useMemo(() => {
    if (!rawLogs) return 0;
    const cutoff = Date.now() - 86400000;
    return rawLogs.filter(l => new Date(l.timestamp).getTime() > cutoff).length;
  }, [rawLogs]);

  const uniqueUsersCount = useMemo(() => {
    if (!rawLogs) return 0;
    return new Set(rawLogs.map(l => l.userEmail)).size;
  }, [rawLogs]);

  const handleExportCsv = () => {
    if (!filteredLogs.length) return;
    const headers = ["Data", "Hora", "Usuário", "E-mail", "Ação", "Entidade"];
    const rows = filteredLogs.map(l => {
      const d = new Date(l.timestamp);
      return [
        d.toLocaleDateString("pt-BR"),
        d.toLocaleTimeString("pt-BR"),
        l.userName,
        l.userEmail,
        l.action,
        l.target
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (firestore && user) writeAuditLog(firestore, user, "EXPORTACAO_CSV", `${filteredLogs.length} registros exportados`);
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
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none mb-1.5">Staff Autenticado</p>
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
                  <SettingsTabTrigger value="usuarios" icon={Users} label="Gerenciar Staff" />
                  <SettingsTabTrigger value="seguranca" icon={Shield} label="Segurança & Logs" />
                </TabsList>
              </div>

              <div className="flex-1">
                <TabsContent value="perfil" className="mt-0 space-y-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Auditor Identity Card (Badge Style) */}
                    <div className="w-full md:w-80 shrink-0">
                      <div className="bg-slate-900 rounded-[3rem] p-8 text-center relative overflow-hidden shadow-2xl group transition-all duration-500 hover:scale-[1.02]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
                        
                        <div className="relative z-10 space-y-6">
                          <div className="mx-auto w-24 h-24 bg-white/5 rounded-[2rem] border border-white/10 flex items-center justify-center text-4xl font-black text-white glow-indigo">
                            {userInitial}
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="text-white font-black uppercase tracking-tight text-lg line-clamp-1">{profileForm.nome || "STAFF"}</h3>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{profileForm.cargo || "STAFF MEMBER"}</p>
                          </div>

                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl py-3 px-4 flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Acesso Autorizado</span>
                          </div>

                          <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                            <div className="text-left">
                              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Status</p>
                              <p className="text-[11px] font-black text-white uppercase">Ativo</p>
                            </div>
                            <div className="text-left">
                              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Nível</p>
                              <p className="text-[11px] font-black text-indigo-400 uppercase">{appUsers?.find(u => u.email === user.email)?.role || '---'}</p>
                            </div>
                          </div>

                          <div className="text-[8px] font-mono text-slate-600 uppercase pt-2">
                            LT-AUTH: {user.uid.substring(0, 16)}...
                          </div>
                        </div>

                        {/* Decorative Blur */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl" />
                      </div>
                    </div>

                    {/* Form Content */}
                    <Card className="flex-1 rounded-[3rem] border-none shadow-sm p-12 bg-white space-y-10">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-[28px] font-black uppercase text-slate-900 leading-none mb-3">Dados Cadastrais</h2>
                          <p className="text-sm font-medium text-slate-400">Gerencie suas informações de identificação corporativa.</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-inner">
                           <User className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Assinatura no Sistema (Nome)</Label>
                          <Input 
                            value={profileForm.nome} 
                            onChange={e => setProfileForm({...profileForm, nome: e.target.value})}
                            className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl px-6 font-black text-sm text-slate-900 uppercase focus:bg-white transition-all" 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">E-mail Corporativo</Label>
                          <Input value={user.email || ""} disabled className="h-14 bg-slate-100/50 border-none rounded-2xl px-6 font-bold text-slate-400 cursor-not-allowed italic" />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Função Hierárquica</Label>
                          <Input 
                            value={profileForm.cargo} 
                            onChange={e => setProfileForm({...profileForm, cargo: e.target.value})}
                            className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl px-6 font-black text-sm text-slate-900 uppercase focus:bg-white transition-all" 
                          />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Doc. Identificação (CPF)</Label>
                          <Input 
                            value={profileForm.cpf} 
                            onChange={e => setProfileForm({...profileForm, cpf: e.target.value})}
                            placeholder="000.000.000-00"
                            className="h-14 bg-slate-50/50 border-slate-100 rounded-2xl px-6 font-black text-sm text-slate-900 focus:bg-white transition-all" 
                          />
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <Button 
                          onClick={handleUpdateProfile}
                          className="h-14 px-12 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-95 flex gap-3"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Salvar Alterações
                        </Button>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="usuarios" className="mt-0 space-y-10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-[32px] font-black uppercase text-slate-900 leading-none mb-2">Gestão de Staff</h2>
                      <p className="text-[14px] font-medium text-slate-400">Controle de acesso e permissões administrativas do staff do sistema.</p>
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={handleSeedUsers} variant="outline" className="h-16 px-10 rounded-2xl text-[12px] font-black uppercase border-dashed border-slate-300 flex gap-3 hover:bg-slate-50">
                        <RefreshCw className="w-4 h-4" /> Sincronizar
                      </Button>
                      
                      <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
                        <DialogTrigger asChild>
                          <Button className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-xl shadow-emerald-100 flex gap-3 transition-all active:scale-95">
                            <UserPlus className="w-5 h-5" /> Novo Staff
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-white rounded-3xl p-8 border-none max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase text-slate-900">Novo Membro do Staff</DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium">Cadastre um novo membro para o staff do sistema.</DialogDescription>
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
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Cargo</Label>
                                <Input 
                                  placeholder="CARGO" 
                                  value={newUserData.cargo} 
                                  onChange={e => setNewUserData({...newUserData, cargo: e.target.value})}
                                  className="h-14 rounded-xl border-slate-100 bg-slate-50 uppercase font-bold"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">CPF</Label>
                                <Input 
                                  placeholder="000.000.000-00" 
                                  value={newUserData.cpf} 
                                  onChange={e => setNewUserData({...newUserData, cpf: e.target.value})}
                                  className="h-14 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Telefone (WhatsApp)</Label>
                              <Input 
                                type="tel"
                                placeholder="(00) 00000-0000" 
                                value={newUserData.telefone} 
                                onChange={e => setNewUserData({...newUserData, telefone: e.target.value})}
                                className="h-14 rounded-xl border-slate-100 bg-slate-50 font-bold"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Nível de Acesso</Label>
                              <Select value={newUserData.role} onValueChange={v => setNewUserData({...newUserData, role: v})}>
                                <SelectTrigger className="h-14 rounded-xl bg-slate-50 border-slate-100 font-bold text-xs">
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

                      <Dialog open={showInviteResult} onOpenChange={setShowInviteResult}>
                        <DialogContent className="max-w-md bg-white rounded-[2.5rem] p-10 border-none shadow-2xl">
                          <DialogHeader className="sr-only">
                            <DialogTitle>Convite Gerado</DialogTitle>
                            <DialogDescription>Link de acesso e opções de compartilhamento para o novo membro do staff.</DialogDescription>
                          </DialogHeader>
                          <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div className="space-y-2">
                              <h2 className="text-2xl font-black uppercase text-slate-950 tracking-tight">Convite Gerado!</h2>
                              <p className="text-sm font-medium text-slate-400">O membro do staff {newUserData.nome} já pode acessar o sistema.</p>
                            </div>

                            <div className="w-full space-y-4">
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 block text-left">Link de Acesso Único</Label>
                                <div className="flex gap-2">
                                  <Input value={generatedLink} readOnly className="h-10 bg-white border-slate-200 text-xs font-mono" />
                                  <Button size="icon" variant="outline" onClick={handleCopyLink} className="shrink-0 h-10 w-10 rounded-xl">
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <Button 
                                  onClick={handleShareWhatsApp}
                                  className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#128C7E] text-white font-black uppercase text-[10px] tracking-widest flex gap-2"
                                >
                                  <MessageCircle className="w-5 h-5" /> WhatsApp
                                </Button>
                                <Button 
                                  variant="outline"
                                  className="h-14 rounded-2xl border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-widest flex gap-2"
                                >
                                  <Mail className="w-5 h-5" /> E-mail
                                </Button>
                              </div>
                            </div>
                            
                            <Button variant="ghost" onClick={() => setShowInviteResult(false)} className="text-[10px] font-black uppercase text-slate-400">
                              Fechar Janela
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
                          <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 pl-12">Membro</TableHead>
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
                        ) : staffUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="h-80 text-center">
                              <div className="flex flex-col items-center gap-6 opacity-30">
                                <Users className="w-16 h-16 text-slate-300" />
                                <span className="text-[14px] font-black uppercase text-slate-400 tracking-[0.2em]">Nenhum membro do staff encontrado</span>
                                <Button onClick={handleSeedUsers} variant="link" className="text-[#734DCC] font-bold">Gerar Dados de Teste</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          staffUsers.map((item) => (
                            <TableRow key={item.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-all h-24">
                              <TableCell className="pl-12">
                                <div className="flex items-center gap-5">
                                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-base uppercase">
                                    {item.nome ? item.nome.substring(0,1) : "U"}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[14px] font-black text-slate-900 uppercase tracking-tight">{item.nome || "STAFF"}</span>
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
                                  <div className={cn("w-2.5 h-2.5 rounded-full", item.status === 'ativo' ? 'bg-emerald-500' : item.status === 'pendente' ? 'bg-amber-400' : 'bg-slate-300')} />
                                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.1em]">{item.status}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-12">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => setEditingUser(item)} 
                                    className="text-slate-400 hover:text-[#734DCC] transition-colors h-12 w-12 rounded-xl"
                                  >
                                    <User className="w-5 h-5" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleSendResetLink(item.email)} 
                                    className="text-slate-400 hover:text-primary transition-colors h-12 w-12 rounded-xl"
                                    title="Enviar Link para Definir Senha"
                                  >
                                    <KeyRound className="w-5 h-5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(item.id)} className="text-slate-200 hover:text-rose-500 transition-colors h-12 w-12 rounded-xl">
                                    <Trash2 className="w-5 h-5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
 
                  <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                    <DialogContent className="max-w-md bg-white rounded-3xl p-8 border-none">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase text-slate-900">Editar Membro do Staff</DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium">Atualize as informações cadastrais do membro do staff.</DialogDescription>
                      </DialogHeader>
                      {editingUser && (
                         <div className="space-y-6 mt-6">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Nome Completo</Label>
                              <Input 
                                value={editingUser.nome} 
                                onChange={e => setEditingUser({...editingUser, nome: e.target.value})}
                                className="h-14 rounded-xl border-slate-100 bg-slate-50 uppercase font-bold text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">Cargo</Label>
                                <Input 
                                  value={editingUser.cargo || ""} 
                                  onChange={e => setEditingUser({...editingUser, cargo: e.target.value})}
                                  className="h-14 rounded-xl border-slate-100 bg-slate-50 uppercase font-bold text-xs"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400">CPF</Label>
                                <Input 
                                  value={editingUser.cpf || ""} 
                                  onChange={e => setEditingUser({...editingUser, cpf: e.target.value})}
                                  className="h-14 rounded-xl border-slate-100 bg-slate-50 font-bold text-xs"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Nível de Acesso</Label>
                              <Select value={editingUser.role} onValueChange={v => setEditingUser({...editingUser as AppUser, role: v})}>
                                <SelectTrigger className="h-14 rounded-xl bg-slate-50 border-slate-100 font-bold text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auditor">AUDITOR</SelectItem>
                                  <SelectItem value="admin">ADMINISTRADOR</SelectItem>
                                  <SelectItem value="viewer">VISUALIZADOR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button onClick={handleUpdateUser} className="w-full h-14 rounded-xl bg-[#734DCC] text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95">
                              Salvar Alterações
                            </Button>
                          </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                <TabsContent value="seguranca" className="mt-0">
                  <div className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-end gap-4">
                      <div>
                        <h2 className="text-[32px] font-black uppercase text-slate-900 leading-none mb-2">Segurança & Logs</h2>
                        <p className="text-[14px] font-medium text-slate-400 italic">Rastreabilidade completa de todas as operações do staff no Ledger.</p>
                      </div>
                      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Tempo Real Ativo</span>
                      </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-5">
                      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#734DCC]/10 rounded-2xl flex items-center justify-center shrink-0">
                          <Activity className="w-6 h-6 text-[#734DCC]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total de Eventos</p>
                          <p className="text-3xl font-black text-slate-900">{isLogsLoading ? "—" : filteredLogs.length}</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
                          <Clock className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Últimas 24h</p>
                          <p className="text-3xl font-black text-slate-900">{isLogsLoading ? "—" : last24hCount}</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0">
                          <UserCheck className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Usuários Únicos</p>
                          <p className="text-3xl font-black text-slate-900">{isLogsLoading ? "—" : uniqueUsersCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Filtros */}
                    <Card className="rounded-3xl border-none shadow-sm bg-white p-6">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[180px] space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Busca Livre</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                              placeholder="Usuário, entidade..."
                              value={logSearch}
                              onChange={e => setLogSearch(e.target.value)}
                              className="h-11 pl-9 rounded-xl border-slate-100 bg-slate-50 text-sm font-medium"
                            />
                          </div>
                        </div>
                        <div className="min-w-[180px] space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Usuário</Label>
                          <Select value={logUserFilter} onValueChange={setLogUserFilter}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100 text-sm font-medium">
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os usuários</SelectItem>
                              {staffUsers.map(u => (
                                <SelectItem key={u.id} value={u.email}>{u.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="min-w-[180px] space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Tipo de Ação</Label>
                          <Select value={logActionFilter} onValueChange={setLogActionFilter}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100 text-sm font-medium">
                              <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas as ações</SelectItem>
                              {(["LOGIN","LOGOUT","CADASTRO_AUDITOR","EDICAO_AUDITOR","REMOCAO_AUDITOR","AJUSTE_IMEI","EXPORTACAO_PDF","EXPORTACAO_CSV","RESET_SENHA","ATUALIZACAO_PERFIL","SINCRONIZACAO"] as AuditAction[]).map(a => (
                                <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="min-w-[140px] space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-slate-400">De</Label>
                          <Input type="date" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-slate-100 text-sm" />
                        </div>
                        <div className="min-w-[140px] space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-slate-400">Até</Label>
                          <Input type="date" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-slate-100 text-sm" />
                        </div>
                        {(logSearch || logUserFilter !== "all" || logActionFilter !== "all" || logDateFrom || logDateTo) && (
                          <Button
                            variant="ghost"
                            onClick={() => { setLogSearch(""); setLogUserFilter("all"); setLogActionFilter("all"); setLogDateFrom(""); setLogDateTo(""); }}
                            className="h-11 px-4 rounded-xl text-slate-400 hover:text-rose-500 flex gap-2 text-[11px] font-black uppercase"
                          >
                            <X className="w-4 h-4" /> Limpar
                          </Button>
                        )}
                      </div>
                    </Card>

                    {/* Tabela de Logs */}
                    <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="border-b border-slate-100 h-14">
                            <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 pl-8">Data / Hora</TableHead>
                            <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Usuário</TableHead>
                            <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Ação</TableHead>
                            <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Entidade Alvo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLogsLoading ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-64 text-center">
                                <Loader2 className="w-8 h-8 text-[#734DCC] animate-spin mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Conectando ao Ledger de Segurança...</p>
                              </TableCell>
                            </TableRow>
                          ) : filteredLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-64 text-center">
                                <div className="flex flex-col items-center gap-3 opacity-40">
                                  <Filter className="w-12 h-12 text-slate-300" />
                                  <p className="text-[12px] font-black uppercase text-slate-400">Nenhum registro encontrado</p>
                                  <p className="text-[11px] text-slate-400">Ajuste os filtros ou aguarde novos eventos</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : filteredLogs.map((log) => {
                            const actionColors: Record<string, string> = {
                              LOGIN: "bg-emerald-50 text-emerald-700 border-emerald-200",
                              LOGOUT: "bg-slate-100 text-slate-600 border-slate-200",
                              CADASTRO_AUDITOR: "bg-blue-50 text-blue-700 border-blue-200",
                              EDICAO_AUDITOR: "bg-amber-50 text-amber-700 border-amber-200",
                              REMOCAO_AUDITOR: "bg-rose-50 text-rose-700 border-rose-200",
                              RESET_SENHA: "bg-purple-50 text-purple-700 border-purple-200",
                              EXPORTACAO_CSV: "bg-indigo-50 text-indigo-700 border-indigo-200",
                              EXPORTACAO_PDF: "bg-indigo-50 text-indigo-700 border-indigo-200",
                              ATUALIZACAO_PERFIL: "bg-teal-50 text-teal-700 border-teal-200",
                              AJUSTE_IMEI: "bg-orange-50 text-orange-700 border-orange-200",
                            };
                            const colorClass = actionColors[log.action] ?? "bg-slate-100 text-slate-600 border-slate-200";
                            const d = new Date(log.timestamp);
                            return (
                              <TableRow key={log.id} className="h-16 border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                <TableCell className="pl-8">
                                  <div className="flex flex-col">
                                    <span className="text-[12px] font-bold text-slate-900">{d.toLocaleDateString("pt-BR")}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{d.toLocaleTimeString("pt-BR")}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-[12px] font-black text-slate-800 uppercase">{log.userName}</span>
                                    <span className="text-[10px] text-slate-400">{log.userEmail}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("text-[10px] font-black uppercase border px-2.5 py-1", colorClass)}>
                                    {log.action.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-[12px] font-bold text-slate-600">{log.target}</span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Card>

                    {/* Export Banner */}
                    <div className="bg-[#734DCC] rounded-[2.5rem] p-10 flex items-center justify-between shadow-2xl shadow-indigo-200 relative overflow-hidden">
                      <div className="relative z-10">
                        <h4 className="text-white text-xl font-black uppercase mb-1">Exportar Log de Operações</h4>
                        <p className="text-indigo-100/70 text-sm font-medium">
                          {filteredLogs.length} registro{filteredLogs.length !== 1 ? "s" : ""} prontos para exportar com os filtros atuais.
                        </p>
                      </div>
                      <Button
                        onClick={handleExportCsv}
                        disabled={filteredLogs.length === 0}
                        className="bg-white text-[#734DCC] hover:bg-indigo-50 h-14 px-10 rounded-2xl font-black uppercase text-[11px] tracking-widest relative z-10 transition-transform active:scale-95 flex gap-2 disabled:opacity-40"
                      >
                        <Download className="w-4 h-4" /> Exportar CSV
                      </Button>
                      <ShieldCheck className="absolute -right-5 -bottom-5 w-48 h-48 text-white/5" />
                    </div>
                  </div>
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
