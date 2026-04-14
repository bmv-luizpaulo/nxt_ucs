"use client"

import { useState, useMemo } from "react";
import { 
  History, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Home, 
  User, 
  AlertCircle,
  FileText,
  Table as TableIcon,
  ChevronRight,
  Database,
  ArrowRightLeft
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  nome: string;
  saldoInicial: number;
}

interface Transaction {
  id: string;
  valor: number;
  data: string;
  documento?: string;
  tipo: "origem" | "retirada" | "ajuste";
  destinatario?: string;
}

interface ProcessedResult {
  data: string;
  valor: number;
  tipo: string;
  destinatario: string;
  distribuicao: { fazenda: string; valor: number }[];
  ignorada: boolean;
  motivoIgnorada?: string;
}

export default function RastreabilidadePage() {
  const [cliente, setCliente] = useState("");
  const [properties, setProperties] = useState<Property[]>([
    { id: "A", nome: "Fazenda A", saldoInicial: 0 },
    { id: "B", nome: "Fazenda B", saldoInicial: 0 },
  ]);
  const [rawTable, setRawTable] = useState("");
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([]);

  // Funcao para adicionar mais propriedades
  const addProperty = () => {
    const id = String.fromCharCode(65 + properties.length); // A, B, C...
    setProperties([...properties, { id, nome: `Fazenda ${id}`, saldoInicial: 0 }]);
  };

  const updateProperty = (index: number, field: keyof Property, value: any) => {
    const newProps = [...properties];
    newProps[index] = { ...newProps[index], [field]: value };
    setProperties(newProps);
  };

  // Processamento da Tabela
  const processData = () => {
    if (!rawTable.trim()) return;

    const lines = rawTable.split("\n").filter(l => l.trim());
    const results: ProcessedResult[] = [];
    
    // Saldos dinâmicos durante o processamento
    let currentBalances = properties.map(p => ({ ...p, saldo: p.saldoInicial }));

    for (const line of lines) {
      // Split inteligente (tab ou espacos multiplos)
      const parts = line.split(/[\t]+| {2,}/).map(p => p.trim());
      if (parts.length < 2) continue;

      // Exemplo do user: 49895	36699	06/01/2023 16:03:25
      // Vamos tentar identificar:
      // Valor pode ser parts[0]
      // ID pode ser parts[1]
      // Data pode ser parts[2] ou parts[parts.length-1]
      
      const valorStr = parts[0].replace(/\./g, "").replace(",", ".");
      const valor = parseFloat(valorStr);
      const id = parts[1];
      const data = parts[2] || "";
      const destinatario = parts[3] || "N/A";

      // Regra de Ignorar: Transações para o próprio cliente
      const isSelfTransfer = destinatario.toLowerCase().includes(cliente.toLowerCase()) && cliente.length > 2;
      
      if (isSelfTransfer) {
        results.push({
          data,
          valor,
          tipo: "Ajuste Interno",
          destinatario,
          distribuicao: [],
          ignorada: true,
          motivoIgnorada: "Ajuste entre contas do próprio produtor"
        });
        continue;
      }

      // Regra de Retirada: Distribuir entre fazendas
      // Aqui vamos simular o "fazer uma transação na fazenda A e na fazenda B até zerar"
      // Se for uma retirada (valor positivo na tabela do user pode significar saida?), 
      // ou se assumirmos que todas as linhas da tabela sao retiradas exceto a originacao inicial.
      
      let restante = valor;
      const dist: { fazenda: string; valor: number }[] = [];

      // FIFO ou Distribuicao Proporcional? O user disse "até zerar", 
      // geralmente implica exaurir uma e depois a outra.
      for (const prop of currentBalances) {
        if (restante <= 0) break;
        
        const subtrair = Math.min(restante, prop.saldo);
        if (subtrair > 0) {
          prop.saldo -= subtrair;
          restante -= subtrair;
          dist.push({ fazenda: prop.nome, valor: subtrair });
        }
      }

      // Se ainda sobrar valor e nao tiver mais saldo, registramos como "descoberto" ou apenas o que foi possivel
      if (restante > 0) {
        dist.push({ fazenda: "Excedente/Ajuste", valor: restante });
      }

      results.push({
        data,
        valor,
        tipo: "Retirada",
        destinatario,
        distribuicao: dist,
        ignorada: false
      });
    }

    setProcessedResults(results);
  };

  const totalOrigination = properties.reduce((acc, p) => acc + p.saldoInicial, 0);
  const totalWithdrawn = processedResults.filter(r => !r.ignorada).reduce((acc, r) => acc + r.valor, 0);
  const currentBalance = totalOrigination - totalWithdrawn;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-24 bg-white px-10 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <History className="w-8 h-8 text-emerald-600" />
              Rastreabilidade de Transações
            </h1>
            <p className="text-[12px] font-medium text-slate-400">
              Gestão de saldos, originação por propriedade e reconciliação de retiradas.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Saldo Consolidado</span>
              <span className={cn(
                "text-2xl font-black tracking-tighter",
                currentBalance < 0 ? "text-rose-600" : "text-emerald-600"
              )}>
                {currentBalance.toLocaleString('pt-BR')} <span className="text-sm">UCS</span>
              </span>
            </div>
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-100 uppercase">
              RT
            </div>
          </div>
        </header>

        <div className="flex-1 p-10 space-y-8 overflow-y-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* SETUP SECTION */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 p-8">
                  <div className="flex items-center gap-3 mb-1">
                    <User className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Cadastro</CardTitle>
                  </div>
                  <CardDescription className="text-xs font-medium">Configure o cliente e suas propriedades de origem.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Cliente</label>
                    <Input 
                      placeholder="Ex: João da Silva" 
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-emerald-500 font-bold"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Propriedades & Originação</label>
                      <Button variant="ghost" size="sm" onClick={addProperty} className="h-6 text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 p-2">
                        <Plus className="w-3 h-3 mr-1" /> Add Fazenda
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {properties.map((prop, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2">
                           <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm border border-slate-100">
                             {prop.id}
                           </div>
                           <div className="flex-1 flex flex-col gap-1">
                             <input 
                               value={prop.nome}
                               onChange={(e) => updateProperty(idx, "nome", e.target.value)}
                               className="bg-transparent text-[11px] font-black text-slate-900 focus:outline-none uppercase"
                               placeholder="Nome da Fazenda"
                             />
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] font-bold text-slate-400">Originação:</span>
                               <input 
                                 type="number"
                                 value={prop.saldoInicial}
                                 onChange={(e) => updateProperty(idx, "saldoInicial", parseFloat(e.target.value) || 0)}
                                 className="bg-white border border-slate-100 rounded-md px-2 py-0.5 text-[11px] font-mono font-bold w-24 focus:ring-1 focus:ring-emerald-500"
                                />
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-emerald-600 rounded-[2rem] p-8 text-white space-y-6 shadow-xl shadow-emerald-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16"></div>
                <div className="space-y-1 relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Originação</p>
                  <p className="text-3xl font-black tracking-tight">{totalOrigination.toLocaleString('pt-BR')} <span className="text-sm font-medium opacity-60 uppercase">ucs</span></p>
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                   <div className="bg-black/10 rounded-2xl p-4">
                     <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Retiradas</p>
                     <p className="text-lg font-black tracking-tight">-{totalWithdrawn.toLocaleString('pt-BR')}</p>
                   </div>
                   <div className="bg-black/10 rounded-2xl p-4">
                     <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Participação</p>
                     <p className="text-lg font-black tracking-tight">{properties.length} Fazendas</p>
                   </div>
                </div>
              </div>
            </div>

            {/* TRANSACTION IMPORT SECTION */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden flex flex-col h-full min-h-[500px]">
                <CardHeader className="bg-white border-b border-slate-100 p-8 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <TableIcon className="w-5 h-5 text-emerald-600" />
                      <CardTitle className="text-lg font-black uppercase tracking-tight">Importação de Dados</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-medium">Cole as linhas da planilha de movimentação para processar a rastreabilidade.</CardDescription>
                  </div>
                  <Button onClick={processData} className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-100">
                    <Database className="w-4 h-4 mr-2" /> Processar Rastreio
                  </Button>
                </CardHeader>
                <CardContent className="p-0 flex flex-col flex-1">
                  <Tabs defaultValue="paste" className="flex flex-col flex-1">
                    <div className="px-8 pt-4">
                      <TabsList className="bg-slate-100/50 p-1 rounded-xl w-full max-w-[400px]">
                        <TabsTrigger value="paste" className="rounded-[10px] text-[10px] font-black uppercase h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">Colar Tabela</TabsTrigger>
                        <TabsTrigger value="results" className="rounded-[10px] text-[10px] font-black uppercase h-8 data-[state=active]:bg-white data-[state=active]:shadow-sm">Visualizar Resultado</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="paste" className="flex-1 p-8 pt-6 mt-0">
                      <div className="space-y-4 h-full flex flex-col">
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-700 font-bold uppercase tracking-tight">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Mascara esperada: [Valor] [ID/Doc] [Data] [Destinatário]</span>
                        </div>
                        <Textarea 
                          value={rawTable}
                          onChange={(e) => setRawTable(e.target.value)}
                          placeholder="Cole os dados aqui (ex: 49895   36699   06/01/2023...)"
                          className="flex-1 min-h-[300px] font-mono text-[11px] bg-slate-50 border-slate-200 focus:ring-emerald-500 p-8 rounded-[1.5rem] resize-none"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="results" className="flex-1 p-0 mt-0">
                      <ScrollArea className="h-[500px]">
                        {processedResults.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-[400px] text-slate-300 gap-4">
                            <FileText className="w-12 h-12 opacity-20" />
                            <p className="text-[11px] font-black uppercase tracking-widest opacity-40">Nenhum dado processado ainda</p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                              <TableRow>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest pl-8">Data/ID</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Valor</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Destinatário</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest">Distribuição Origem</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-center pr-8">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {processedResults.map((res, i) => (
                                <TableRow key={i} className={cn(
                                  "border-b border-slate-50 group hover:bg-slate-50/50 transition-colors",
                                  res.ignorada && "opacity-60 bg-slate-50/30"
                                )}>
                                  <TableCell className="pl-8 py-4">
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-slate-900 leading-none">{res.data || "-"}</span>
                                      <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase">TRAN-{i+1000}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-[13px] font-black",
                                        res.ignorada ? "text-slate-400" : "text-slate-900"
                                      )}>
                                        {res.valor.toLocaleString('pt-BR')}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-400">UCS</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[11px] font-black text-slate-700 uppercase">{res.destinatario}</span>
                                      <span className="text-[9px] font-medium text-slate-400 italic">via Transação Direta</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1.5">
                                      {res.distribuicao.length > 0 ? res.distribuicao.map((d, j) => (
                                        <div key={j} className="flex items-center gap-2">
                                          <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                          <span className="text-[10px] font-bold text-slate-600">{d.fazenda}:</span>
                                          <span className="text-[10px] font-black text-emerald-600">-{d.valor.toLocaleString('pt-BR')}</span>
                                        </div>
                                      )) : (
                                        <span className="text-[10px] text-slate-400 italic">Sem distribuição (interna)</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center pr-8">
                                    {res.ignorada ? (
                                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-none text-[8px] font-black uppercase px-2 py-0.5" title={res.motivoIgnorada}>
                                        Ignorada
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase px-2 py-0.5">
                                        Rastreado
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FLOW VISUALIZATION */}
          {processedResults.length > 0 && (
            <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
               <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                 <div className="flex items-center gap-3">
                   <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                   <CardTitle className="text-lg font-black uppercase tracking-tight">Fluxo de Rastreabilidade</CardTitle>
                 </div>
               </CardHeader>
               <CardContent className="p-10">
                 <div className="flex flex-wrap items-center justify-center gap-12">
                   {/* ORIGIN NODES */}
                   <div className="space-y-4">
                     {properties.map(p => (
                       <div key={p.id} className="w-48 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.nome}</p>
                         <p className="text-lg font-black text-slate-900">{p.saldoInicial.toLocaleString('pt-BR')}</p>
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white">
                           <ChevronRight className="w-2 h-2 text-white" />
                         </div>
                       </div>
                     ))}
                   </div>

                   {/* MIDDLE CONSOLIDATOR */}
                   <div className="w-32 h-32 rounded-full bg-emerald-600 flex flex-col items-center justify-center text-white shadow-2xl shadow-emerald-200 border-8 border-emerald-50 relative">
                     <Wallet className="w-6 h-6 mb-1" />
                     <p className="text-[10px] font-black uppercase opacity-60">Carteira</p>
                     <p className="text-xl font-black leading-none">{totalOrigination.toLocaleString('pt-BR')}</p>
                     
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-12 h-0.5 bg-slate-200" />
                   </div>

                   {/* TARGET NODES (TOP 3) */}
                   <div className="space-y-4">
                     {processedResults.filter(r => !r.ignorada).slice(0, 3).map((r, idx) => (
                        <div key={idx} className="w-48 bg-slate-50 border border-slate-100 rounded-2xl p-4 relative group">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-4 h-4 bg-slate-300 rounded-full flex items-center justify-center border-4 border-white">
                            <ChevronRight className="w-2 h-2 text-white" />
                          </div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{r.destinatario}</p>
                          <p className="text-lg font-black text-rose-500">-{r.valor.toLocaleString('pt-BR')}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.distribuicao.map((d, j) => (
                              <Badge key={j} variant="outline" className="text-[7px] font-black px-1 py-0 border-slate-200">
                                {d.fazenda.substring(0, 3)}: {d.valor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                     ))}
                     {processedResults.filter(r => !r.ignorada).length > 3 && (
                       <div className="text-center">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">+ {processedResults.filter(r => !r.ignorada).length - 3} outras retiradas</p>
                       </div>
                     )}
                   </div>
                 </div>
               </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
