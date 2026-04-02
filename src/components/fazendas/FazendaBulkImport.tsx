"use client"

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Fazenda, FazendaProprietario } from "@/lib/types";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface FazendaImportProps {
  onImport: (fazendas: Omit<Fazenda, 'id' | 'createdAt'>[]) => Promise<void>;
}

type ParsedRow = Omit<Fazenda, 'id' | 'createdAt'> & { _errors: string[] };

// ─────────────────────────────────────────────────────────────────────────────
// COLUNAS DA PLANILHA DO USUÁRIO:
//   Tipo da Área | IDF | DATA REGISTRO | Área total | Área total de vegetação |
//   Fazenda | Núcleo | Latitude | Longitude | Produtores | CNPJ | CPF
//
// Para múltiplos produtores na mesma fazenda:
//   Repita a linha com o mesmo IDF, trocando Produtores / CPF / CNPJ
// ─────────────────────────────────────────────────────────────────────────────

// Normaliza o header: remove acentos, espaços → underscore, lowercase
function normalizeHeader(h: string): string {
  return h.trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function parseCSV(raw: string): ParsedRow[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detecta separador: tab (Excel colado), ; ou ,
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';

  const firstLineCells = lines[0].split(sep).map(h => h.trim());
  const headers = firstLineCells.map(normalizeHeader);
  
  // Verifica se a primeira linha tem algum cabeçalho reconhecido
  const knownHeaders = ['safra', 'idf', 'fazenda', 'propriedade', 'produtores', 'produtor'];
  const hasHeaders = headers.some(h => knownHeaders.includes(h));

  const startIdx = hasHeaders ? 1 : 0;

  // Busca o valor de uma célula pelos nomes normalizados ou pelo índice fixo (fallback)
  const getCol = (row: string[], names: string[], fixedIdx?: number): string => {
    if (hasHeaders) {
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx >= 0 && row[idx]?.trim()) return row[idx].trim();
      }
    } else if (fixedIdx !== undefined) {
      return row[fixedIdx]?.trim() || "";
    }
    return "";
  };

  // Converte número brasileiro (1.234,56 → 1234.56)
  const num = (s: string): number => {
    if (!s) return 0;
    // Remove pontos de milhar e troca vírgula por ponto decimal
    // Se houver apenas vírgula e for do tipo decimal (ex: 123,45)
    const clean = s.replace(/\s/g, '').replace(/[^\d,.-]/g, '');
    if (!clean) return 0;

    // Lógica robusta para detectar se o separador decimal é vírgula ou ponto
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Formato brasileiro/europeu: 1.234,56 ou 1234,56
      return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return parseFloat(clean) || 0;
  };

  const coord = (s: string): string => s.trim().replace(',', '.');

  const grouped: Record<string, ParsedRow> = {};

  for (let i = startIdx; i < lines.length; i++) {
    const cells = lines[startIdx === 0 ? i : i].split(sep);
    if (cells.every(c => !c.trim())) continue;

    // Layout esperado (sem header):
    // 0:safra, 1:tipo_area, 2:idf, 3:data, 4:areaTotal, 5:areaVeg, 6:fazenda, 7:nucleo, 8:lat, 9:long, 10:ucs, 11:isin, 12:hash, 13:produtor, 14:cnpj, 15:cpf

    const idf = getCol(cells, ['idf'], 2);
    if (!idf) continue;

    const cnpj = getCol(cells, ['cnpj'], 14);
    const cpf  = getCol(cells, ['cpf'], 15);
    const documento = cnpj || cpf;
    const tipoPessoa: 'PJ' | 'PF' = cnpj ? 'PJ' : 'PF';

    const produtor: FazendaProprietario = {
      nome: getCol(cells, ['produtores', 'produtor', 'proprietario', 'nome_produtor'], 13).toUpperCase(),
      documento,
      percentual: 100,
      tipo: tipoPessoa,
    };

    if (grouped[idf]) {
      grouped[idf].proprietarios.push(produtor);
    } else {
      const errors: string[] = [];
      const nome      = getCol(cells, ['fazenda', 'nome', 'denominacao', 'propriedade'], 6).toUpperCase();
      const areaTotal = num(getCol(cells, ['area_total', 'area_total_ha', 'area'], 4));

      if (!nome)        errors.push("Fazenda (nome) ausente");
      if (!idf)         errors.push("IDF ausente");
      if (areaTotal <= 0) errors.push("Área total inválida ou zero");

      const tipoAreaStr = getCol(cells, ['tipo_da_area', 'tipo_area', 'tipo'], 1).toLowerCase();
      const status: 'ativa' | 'inativa' | 'pendente' =
        tipoAreaStr.includes('inativ') ? 'inativa' :
        tipoAreaStr.includes('pend')   ? 'pendente' : 'ativa';

      const nucleo = getCol(cells, ['nucleo', 'associacao', 'nucleo_'], 7);
      
      // Auto-mapeamento de CNPJ de Associações conhecidas
      let nucleoCnpj = getCol(cells, ['cnpj_nucleo', 'nucleo_cnpj'], 33);
      if (!nucleoCnpj && nucleo) {
        const n = nucleo.toUpperCase();
        if (n.includes('XINGU')) nucleoCnpj = '10.175.886/0001-68';
        else if (n.includes('TELES PIRES')) nucleoCnpj = '11.271.788/0001-97';
        else if (n.includes('MADEIRA') || n.includes('APRIMA') || n.includes('APRRIMA')) nucleoCnpj = '12.741.679/0001-59';
        else if (n.includes('ARINOS')) nucleoCnpj = '11.952.411/0001-01';
      }

      grouped[idf] = {
        nome,
        idf,
        safra: getCol(cells, ['safra'], 0),
        isin: getCol(cells, ['isin'], 11),
        hashOriginacao: getCol(cells, ['hash_origination', 'hash_originacao', 'hash'], 12),
        ucs: num(getCol(cells, ['ucs', 'originacao'], 10)),
        proprietarios: [produtor],
        municipio: getCol(cells, ['municipio', 'cidade', 'mun'], 30),
        uf: getCol(cells, ['uf', 'estado'], 31).toUpperCase().slice(0, 2),
        lat: coord(getCol(cells, ['latitude', 'lat'], 8)),
        long: coord(getCol(cells, ['longitude', 'long'], 9)),
        areaTotal,
        areaVegetacao: num(getCol(cells, ['area_total_de_vegetacao', 'area_vegetacao', 'vegetacao'], 5)) || undefined,
        areaConsolidada: num(getCol(cells, ['area_consolidada', 'consolidada'], 32)) || undefined,
        nucleo,
        nucleoCnpj,
        status,
        observacao: getCol(cells, ['observacao', 'obs'], 34),
        dataRegistro: getCol(cells, ['data_registro', 'data registro', 'data'], 3),
        _errors: errors,
      };
    }
  }

  const result = Object.values(grouped);
  result.forEach(row => {
    const n = row.proprietarios.length;
    if (n > 1) {
      const quota = parseFloat((100 / n).toFixed(4));
      row.proprietarios.forEach((p, i) => {
        p.percentual = i === n - 1 ? parseFloat((100 - quota * (n - 1)).toFixed(4)) : quota;
      });
    }
    const total = row.proprietarios.reduce((s, p) => s + p.percentual, 0);
    if (Math.abs(total - 100) > 0.5) {
      row._errors.push(`Produtores somam ${total.toFixed(1)}% (esperado 100%)`);
    }
  });

  return result;
}

export function FazendaBulkImport({ onImport }: FazendaImportProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [rawText, setRawText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setRawText(text);
      setPreview(parseCSV(text));
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    setRawText(text);
    setPreview(parseCSV(text));
    e.preventDefault();
  };

  const valid = preview.filter(r => r._errors.length === 0);
  const invalid = preview.filter(r => r._errors.length > 0);

  const handleImport = async () => {
    if (valid.length === 0) return;
    setIsImporting(true);
    try {
      const clean = valid.map(({ _errors, ...rest }) => rest);
      await onImport(clean);
      setOpen(false);
      setPreview([]);
      setRawText("");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline"
        className="h-11 px-5 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest gap-2 bg-white hover:bg-slate-50">
        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
        Importar Planilha
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[1100px] w-[95vw] h-[90vh] p-0 border-none rounded-[2rem] overflow-hidden flex flex-col bg-white shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Importar Fazendas</DialogTitle>
            <DialogDescription>Importe fazendas em lote via CSV ou colando dados da planilha.</DialogDescription>
          </DialogHeader>

          {/* HEADER */}
          <div className="bg-[#0B0F1A] px-8 py-5 shrink-0 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">Importação em Lote</p>
              <h2 className="text-[18px] font-black text-white uppercase">Importar Fazendas</h2>
              <p className="text-[10px] text-slate-500">Cole os dados da planilha ou envie um arquivo .CSV</p>
            </div>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white h-9 w-9 p-0 rounded-xl">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* INPUT AREA */}
            {preview.length === 0 ? (
              <div className="flex-1 flex flex-col gap-6 p-8">
                {/* Template hint */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-[10px] font-mono text-slate-500 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Colunas da planilha (cole do Excel ou selecione .CSV):</p>
                  <p className="text-emerald-700 font-bold leading-relaxed">
                    SAFRA &nbsp;|&nbsp; Tipo da Área &nbsp;|&nbsp; IDF &nbsp;|&nbsp; DATA REGISTRO &nbsp;|&nbsp; Area total &nbsp;|&nbsp; Area total de vegetação &nbsp;|&nbsp; Fazenda &nbsp;|&nbsp; Núcleo &nbsp;|&nbsp; Latitude &nbsp;|&nbsp; Longitude &nbsp;|&nbsp; UCS &nbsp;|&nbsp; ISIN &nbsp;|&nbsp; Hash Originação &nbsp;|&nbsp; Produtores &nbsp;|&nbsp; CNPJ &nbsp;|&nbsp; CPF
                  </p>
                  <div className="pt-2 border-t border-slate-200 space-y-0.5">
                    <p className="text-[9px] text-slate-400">• Para múltiplos produtores na mesma fazenda: repita a linha com o mesmo <strong className="text-slate-600">IDF</strong>, trocando <strong className="text-slate-600">Produtores / CPF / CNPJ</strong></p>
                    <p className="text-[9px] text-slate-400">• Se CNPJ preenchido → Pessoa Jurídica. Se CPF → Pessoa Física</p>
                    <p className="text-[9px] text-slate-400">• O % de participação é distribuído igualmente quando há múltiplos produtores</p>
                  </div>
                </div>

                {/* Paste area */}
                <div className="flex-1 flex flex-col gap-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cole os dados aqui (Ctrl+V) ou selecione um arquivo abaixo</Label>
                  <textarea
                    className="flex-1 w-full rounded-2xl border border-slate-200 p-4 font-mono text-[11px] text-slate-700 resize-none focus:ring-1 focus:ring-emerald-500 outline-none bg-slate-50 min-h-[200px]"
                    placeholder="Cole aqui os dados copiados da planilha (Excel, Google Sheets, etc.)..."
                    onPaste={handlePaste}
                    onChange={e => {
                      setRawText(e.target.value);
                      setPreview(parseCSV(e.target.value));
                    }}
                    value={rawText}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">ou</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <Button variant="outline" onClick={() => fileRef.current?.click()}
                  className="h-11 px-6 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest gap-2">
                  <Upload className="w-4 h-4" /> Selecionar arquivo .CSV
                </Button>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-4">
                  {/* Summary */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-[12px] font-black text-emerald-700">{valid.length} prontas para importar</span>
                    </div>
                    {invalid.length > 0 && (
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span className="text-[12px] font-black text-rose-600">{invalid.length} com erros</span>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setPreview([]); setRawText(""); }}
                      className="ml-auto text-[10px] font-black uppercase text-slate-400 hover:text-slate-700">
                      <X className="w-3.5 h-3.5 mr-1" /> Limpar
                    </Button>
                  </div>

                  {/* Preview table */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {['Status', 'Nome', 'IDF', 'Proprietários', 'Área (ha)', 'Município/UF', 'Núcleo'].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className={cn("border-b border-slate-50 last:border-0", row._errors.length > 0 && "bg-rose-50/50")}>
                            <td className="py-3 px-4">
                              {row._errors.length === 0
                                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                : <div className="space-y-0.5">{row._errors.map((e, j) => <p key={j} className="text-[9px] text-rose-600 font-bold">{e}</p>)}</div>
                              }
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">{row.nome}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{row.idf}</td>
                            <td className="py-3 px-4">
                              {row.proprietarios.map((p, j) => (
                                <div key={j} className="text-[10px]">
                                  <span className="font-bold text-slate-700">{p.nome}</span>
                                  <span className="text-slate-400 ml-1">({p.percentual}%)</span>
                                </div>
                              ))}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-700">{row.areaTotal?.toLocaleString('pt-BR')}</td>
                            <td className="py-3 px-4 text-slate-500">{row.municipio}{row.uf ? `/${row.uf}` : ''}</td>
                            <td className="py-3 px-4 text-slate-500">{row.nucleo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ScrollArea>
            )}

            {/* FOOTER */}
            {rawText.length > 0 && (
              <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                <p className="text-[10px] text-slate-400 font-bold">
                  {preview.length === 0 
                    ? "Aguardando dados válidos..." 
                    : invalid.length > 0 
                      ? `${invalid.length} linha(s) com erros serão ignoradas.` 
                      : 'Todos os registros válidos.'}
                </p>
                <Button onClick={handleImport} disabled={valid.length === 0 || isImporting}
                  className="h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest gap-2 disabled:opacity-40">
                  {isImporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : <><Upload className="w-4 h-4" /> Importar {valid.length} Fazenda(s)</>}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn("block text-[8px] font-black uppercase tracking-widest text-slate-400", className)}>{children}</label>;
}
