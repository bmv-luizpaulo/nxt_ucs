"use client"

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, Upload, CheckCircle, AlertTriangle, 
  X, Loader2, FileSpreadsheet, Building2, User 
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// TIPAGENS DO IMPORTADOR
// ─────────────────────────────────────────────────────────────────────────────

interface ImportRow {
  nome: string;
  documento: string;
  tipo: 'PF' | 'PJ';
  
  // PJ specific
  nomeResponsavel?: string;
  documentoResponsavel?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  
  // Contato
  email?: string;
  celular?: string;
  telefone?: string;
  
  // Endereço
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  pais?: string;
  
  // Bancário
  bancoNome?: string;
  bancoCodigo?: string;
  agencia?: string;
  conta?: string;
  
  // Flags de Perfil
  isCliente: boolean;
  isAssociacao: boolean;
  isProdutor: boolean;
  isGoverno: boolean;
  isParceiro: boolean;
  isImei: boolean;
}

interface ProdutorBulkImportProps {
  onImport: (rows: ImportRow[]) => Promise<void>;
}

export function ProdutorBulkImport({ onImport }: ProdutorBulkImportProps) {
  const [open, setOpen] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState("");
  const [results, setResults] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const cleanVal = (val: any) => val?.toString().trim() || "";
  const isTrue = (val: any) => {
    const s = cleanVal(val).toUpperCase();
    return s === 'TRUE' || s === 'SIM' || s === 'S' || s === '1';
  };

  const processRawData = (data: any[]) => {
    const parsed: ImportRow[] = data.map((row: any) => {
      const tipo = (cleanVal(row['Tipo']) === 'PJ' ? 'PJ' : 'PF') as 'PF' | 'PJ';
      
      return {
        tipo,
        nome: tipo === 'PJ' ? cleanVal(row['Razão Social'] || row['Nome Fantasia']) : cleanVal(row['Nome']) + ' ' + cleanVal(row['Sobrenome']),
        documento: cleanVal(row['Documento']).replace(/\D/g, ''),
        
        // Responsável (PJ)
        nomeResponsavel: cleanVal(row['Nome do responsavel']),
        documentoResponsavel: cleanVal(row['Número do Documento do responsavel']).replace(/\D/g, ''),
        razaoSocial: cleanVal(row['Razão Social']),
        nomeFantasia: cleanVal(row['Nome Fantasia']),
        
        email: cleanVal(row['Email']),
        celular: cleanVal(row['Celular']),
        telefone: cleanVal(row['Telefone']),
        
        cep: cleanVal(row['Código postal']),
        rua: cleanVal(row['Rua']),
        numero: cleanVal(row['Número']),
        complemento: cleanVal(row['Complemento']),
        bairro: cleanVal(row['Bairro']),
        cidade: cleanVal(row['Cidade']),
        pais: cleanVal(row['País']),
        
        bancoNome: cleanVal(row['Conta Bancaria - Nome do banco']),
        bancoCodigo: cleanVal(row['Conta Bancaria - Código do banco']),
        agencia: cleanVal(row['Conta Bancaria - Agência']),
        conta: cleanVal(row['Conta Bancaria - Conta']),
        
        isCliente: isTrue(row['Cliente']),
        isAssociacao: isTrue(row['Associação']),
        isProdutor: isTrue(row['Produtor']),
        isGoverno: isTrue(row['Governo']),
        isParceiro: isTrue(row['Parceiro']),
        isImei: isTrue(row['IMEI'])
      };
    }).filter(r => r.documento && r.nome);

    setResults(parsed);
    setErrors([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        processRawData(data);
      } catch (err) {
        console.error(err);
        setErrors(['Erro ao processar arquivo. Verifique se o formato está correto.']);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePasteProcess = () => {
    if (!pasteText.trim()) return;
    try {
      const rows = pasteText.trim().split('\n');
      if (rows.length < 2) {
        setErrors(['Cole ao menos o cabeçalho e uma linha de dados.']);
        return;
      }

      const header = rows[0].split('\t').map(h => h.trim());
      const data = rows.slice(1).map(line => {
        const vals = line.split('\t').map(v => v.trim());
        const obj: any = {};
        header.forEach((h, i) => {
          obj[h] = vals[i] || "";
        });
        return obj;
      });

      processRawData(data);
    } catch (err) {
      setErrors(['Erro ao processar dados colados. Cerifique-se de copiar as colunas corretamente.']);
    }
  };

  const handleImport = async () => {
    if (results.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(results);
      setOpen(false);
      setResults([]);
      setPasteText("");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="h-11 px-5 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest gap-2 bg-white hover:bg-slate-50 transition-all">
        <Upload className="w-4 h-4 text-emerald-600" />
        Importar Entidades
      </Button>

      <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) { setResults([]); setPasteText(""); } }}>
        <DialogContent className="max-w-[1200px] w-[95vw] h-[90vh] p-0 border-none rounded-[2rem] overflow-hidden flex flex-col bg-white shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Importar Entidades (Produtores, Clientes, Parceiros)</DialogTitle>
          </DialogHeader>

          {/* HEADER DESIGN */}
          <div className="bg-[#0B0F1A] px-10 py-6 shrink-0 flex items-center justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-emerald-500/10 to-transparent" />
             <div className="relative z-10 flex items-center gap-6">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                   <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                   <h2 className="text-[20px] font-black text-white uppercase tracking-tight">Importação de Entidades</h2>
                   <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Produtores · Parceiros · Clientes · Governos</p>
                </div>
             </div>
             <Button variant="ghost" onClick={() => setOpen(false)} className="text-white/40 hover:text-white h-10 w-10 p-0 rounded-xl relative z-10">
                <X className="w-5 h-5" />
             </Button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col p-10 gap-8">
            {results.length === 0 ? (
               <div className="flex-1 flex flex-col gap-8">
                  {/* MODE SELECTOR */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit mx-auto shadow-inner">
                     <button 
                       onClick={() => setImportMode('file')}
                       className={cn("px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all", importMode === 'file' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                     >
                       Subir Arquivo
                     </button>
                     <button 
                       onClick={() => setImportMode('paste')}
                       className={cn("px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all", importMode === 'paste' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                     >
                       Colar Tabela
                     </button>
                  </div>

                  {importMode === 'file' ? (
                     <div className="flex-1 flex flex-col items-center justify-center gap-8 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/30 min-h-[400px]">
                        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                           <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                        </div>
                        <div className="text-center space-y-2">
                           <p className="text-[16px] font-black text-slate-700 uppercase">Selecione sua Planilha</p>
                           <p className="text-[12px] text-slate-400 max-w-md mx-auto">Arraste seu arquivo Excel ou CSV aqui para processar o cadastro de entidades em massa.</p>
                        </div>
                        <Button onClick={() => fileRef.current?.click()} className="h-12 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-100">
                          Procurar Arquivo
                        </Button>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-col gap-6">
                        <div className="flex-1 min-h-[400px] relative">
                           <textarea
                             value={pasteText}
                             onChange={(e) => setPasteText(e.target.value)}
                             placeholder="Cole aqui as colunas da sua planilha (incluindo o cabeçalho)..."
                             className="w-full h-full bg-slate-50/50 border-2 border-slate-200 rounded-[2rem] p-8 text-[13px] font-mono text-slate-600 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none shadow-inner relative z-10"
                           />
                           <div className="absolute top-4 right-4 z-20">
                              <Button 
                                variant="outline" 
                                onClick={async () => {
                                  try {
                                    const text = await navigator.clipboard.readText();
                                    setPasteText(text);
                                  } catch (err) {
                                    alert("Por favor, permita o acesso à área de transferência ou use Ctrl+V.");
                                  }
                                }}
                                className="bg-white border-slate-200 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 gap-2"
                              >
                                <Upload className="w-3 h-3 text-emerald-600" />
                                Colar da Área de Transferência
                              </Button>
                           </div>
                        </div>
                        <div className="flex justify-center">
                           <Button 
                             onClick={handlePasteProcess}
                             disabled={!pasteText.trim()}
                             className="h-14 px-12 rounded-2xl bg-[#0B0F1A] hover:bg-slate-900 text-white font-black uppercase text-[12px] tracking-[0.1em] shadow-xl disabled:opacity-30 transition-all"
                           >
                              Processar Dados Colados
                           </Button>
                        </div>
                     </div>
                  )}

                  {errors.length > 0 && (
                     <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                           {errors.map((err, i) => <p key={i} className="text-[11px] font-bold text-red-600 uppercase tracking-tight">{err}</p>)}
                        </div>
                     </div>
                  )}
               </div>
            ) : (
               <div className="flex-1 flex flex-col overflow-hidden space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 px-5 py-2.5 rounded-2xl flex items-center gap-3">
                           <CheckCircle className="w-5 h-5 text-emerald-600" />
                           <span className="text-[14px] font-black text-emerald-700 uppercase tracking-tight">{results.length} Entidades Identificadas</span>
                        </div>
                        <Button variant="ghost" onClick={() => { setResults([]); setPasteText(""); }} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">
                           {importMode === 'file' ? 'Trocar Arquivo' : 'Limpar e Colar Novamente'}
                        </Button>
                     </div>
                  </div>

                  <div className="flex-1 rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm bg-white">
                     <ScrollArea className="h-full">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 sticky top-0 z-20">
                              <tr>
                                 <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo</th>
                                 <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Identificação</th>
                                 <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsabilidade</th>
                                 <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Perfis</th>
                                 <th className="py-4 px-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cidade</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {results.map((row, idx) => (
                                 <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="py-4 px-6">
                                       <Badge className={cn(
                                          "px-2 py-0.5 rounded-md text-[8px] font-black uppercase border-none",
                                          row.tipo === 'PJ' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
                                       )}>{row.tipo}</Badge>
                                    </td>
                                    <td className="py-4 px-6">
                                       <div className="flex flex-col">
                                          <span className="text-[12px] font-black text-slate-800 uppercase truncate max-w-[200px]">{row.nome}</span>
                                          <span className="text-[10px] font-mono text-slate-400">{row.documento}</span>
                                       </div>
                                    </td>
                                    <td className="py-4 px-6">
                                       {row.tipo === 'PJ' ? (
                                          <div className="flex flex-col gap-1">
                                             <div className="flex items-center gap-1.5">
                                                <User className="w-3 h-3 text-emerald-500" />
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">{row.nomeResponsavel}</span>
                                             </div>
                                             <span className="text-[9px] font-mono text-slate-400 ml-4.5">{row.documentoResponsavel}</span>
                                          </div>
                                       ) : <span className="text-slate-300 text-[10px]">Autônomo</span>}
                                    </td>
                                    <td className="py-4 px-6">
                                       <div className="flex flex-wrap gap-1">
                                          {row.isProdutor && <Badge variant="outline" className="text-[8px] font-black bg-white border-slate-200">PROD</Badge>}
                                          {row.isParceiro && <Badge variant="outline" className="text-[8px] font-black bg-white border-slate-200">PARC</Badge>}
                                          {row.isCliente && <Badge variant="outline" className="text-[8px] font-black bg-white border-slate-200">CLIE</Badge>}
                                          {row.isAssociacao && <Badge variant="outline" className="text-[8px] font-black bg-white border-slate-200 text-indigo-500">ASSOC</Badge>}
                                       </div>
                                    </td>
                                    <td className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase">{row.cidade || '---'}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </ScrollArea>
                  </div>
               </div>
            )}

            {results.length > 0 && (
               <div className="shrink-0 flex items-center justify-between bg-slate-50 -mx-10 -mb-10 p-10 border-t border-slate-200">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                     As entidades serão cadastradas conforme os perfis identificados.
                  </p>
                  <Button 
                    onClick={handleImport} 
                    disabled={isImporting} 
                    className="h-12 px-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-200 disabled:opacity-40"
                  >
                    {isImporting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando...</> : "Confirmar e Cadastrar"}
                  </Button>
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Badge({ children, className, variant = "default" }: any) {
   return (
      <span className={cn(
         "px-2 py-0.5 rounded text-xs font-medium",
         variant === "default" ? "bg-slate-100 text-slate-900" : "border",
         className
      )}>
         {children}
      </span>
   );
}
