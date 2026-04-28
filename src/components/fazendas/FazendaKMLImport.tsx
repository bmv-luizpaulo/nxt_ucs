"use client"

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Map, Upload, CheckCircle, AlertTriangle, X, Loader2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTADOR DE POLÍGONOS KML
//
// Cada arquivo KML corresponde a UMA fazenda.
// O nome do arquivo (sem .kml) = IDF da fazenda.
// Ex: "7601101001.kml" → vincula ao IDF 7601101001
//
// O importador:
//  1. Lê os arquivos .kml
//  2. Extrai coordenadas do polígono
//  3. Calcula o centróide (lat/long central)
//  4. Retorna dados para salvar no Firestore via onImport()
// ─────────────────────────────────────────────────────────────────────────────

export interface KMLParseResult {
  idf: string;
  filename: string;
  polygonCoordinates: { lon: number; lat: number }[]; 
  centroidLat: string;
  centroidLon: string;
  vertexCount: number;
  error?: string;
}

// Calcula o centróide simples (média dos vértices)
function calcCentroid(coords: { lon: number; lat: number }[]): { lat: number; lon: number } {
  // Remove o ponto de fechamento se for igual ao primeiro
  const pts = coords.length > 1 && 
    coords[0].lon === coords[coords.length - 1].lon &&
    coords[0].lat === coords[coords.length - 1].lat
    ? coords.slice(0, -1)
    : coords;

  const lon = pts.reduce((s, c) => s + c.lon, 0) / pts.length;
  const lat = pts.reduce((s, c) => s + c.lat, 0) / pts.length;
  return { lat, lon };
}

// Parse de um único arquivo KML (string XML)
export function parseKML(xml: string, filename: string): KMLParseResult {
  // Extrai o IDF: tudo antes do primeiro '_' e remove zeros à esquerda
  // Ex: "07605101001_Lote_01_-_A.kml" → "7605101001"
  const nameWithoutExt = filename.replace(/\.kml$/i, '');
  const idf = nameWithoutExt.split('_')[0].trim();

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // Busca a primeira tag <coordinates>
    const coordEl = doc.querySelector('coordinates');
    if (!coordEl || !coordEl.textContent) {
      return { idf, filename, polygonCoordinates: [], centroidLat: '', centroidLon: '', vertexCount: 0, error: 'Sem coordenadas no arquivo' };
    }

    // Parse de "lon,lat,alt lon,lat,alt ..."
    const rawCoords = coordEl.textContent.trim().split(/\s+/);
    const coords: { lon: number; lat: number }[] = rawCoords
      .map(c => {
        const parts = c.split(',');
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        return { lon, lat };
      })
      .filter(({ lon, lat }) => !isNaN(lon) && !isNaN(lat));

    if (coords.length < 3) {
      return { idf, filename, polygonCoordinates: coords, centroidLat: '', centroidLon: '', vertexCount: coords.length, error: 'Polígono com menos de 3 pontos' };
    }

    const centroid = calcCentroid(coords);

    return {
      idf,
      filename,
      polygonCoordinates: coords,
      centroidLat: centroid.lat.toFixed(8),
      centroidLon: centroid.lon.toFixed(8),
      vertexCount: coords.length,
    };
  } catch (e) {
    return { idf, filename, polygonCoordinates: [], centroidLat: '', centroidLon: '', vertexCount: 0, error: 'Erro ao interpretar o XML' };
  }
}

interface FazendaKMLImportProps {
  onImport: (results: KMLParseResult[]) => Promise<void>;
}

export function FazendaKMLImport({ onImport }: FazendaKMLImportProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<KMLParseResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const kmlFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.kml'));
    if (kmlFiles.length === 0) return;

    const readers = kmlFiles.map(file =>
      new Promise<KMLParseResult>(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          const xml = e.target?.result as string;
          resolve(parseKML(xml, file.name));
        };
        reader.readAsText(file, 'UTF-8');
      })
    );

    Promise.all(readers).then(parsed => {
      setResults(parsed.sort((a, b) => a.idf.localeCompare(b.idf)));
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const valid   = results.filter(r => !r.error);
  const invalid = results.filter(r => r.error);

  const handleImport = async () => {
    if (valid.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(valid);
      setOpen(false);
      setResults([]);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline"
        className="h-11 px-5 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest gap-2 bg-white hover:bg-slate-50">
        <Map className="w-4 h-4 text-indigo-600" />
        Importar KML
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[1000px] w-[95vw] h-[88vh] p-0 border-none rounded-[2rem] overflow-hidden flex flex-col bg-white shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Importar Polígonos KML</DialogTitle>
            <DialogDescription>Vincule arquivos KML às fazendas pelo IDF (nome do arquivo).</DialogDescription>
          </DialogHeader>

          {/* HEADER */}
          <div className="bg-[#0B0F1A] px-8 py-5 shrink-0 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">Geometria das Fazendas</p>
              <h2 className="text-[18px] font-black text-white uppercase">Importar Polígonos KML</h2>
              <p className="text-[10px] text-slate-500">Cada arquivo .kml deve ter o nome = IDF da fazenda (ex: 7601101001.kml)</p>
            </div>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white h-9 w-9 p-0 rounded-xl">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  className="w-full max-w-xl h-56 border-2 border-dashed border-indigo-200 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <Map className="w-8 h-8 text-indigo-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-black text-slate-700">Arraste os arquivos .KML aqui</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">ou clique para selecionar uma pasta / múltiplos arquivos</p>
                  </div>
                  <div className="flex gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                    <span className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Google Earth</span>
                    <span className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Global Mapper</span>
                    <span className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">QGIS</span>
                  </div>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".kml"
                  multiple
                  className="hidden"
                  onChange={handleChange}
                />

                {/* Info */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 max-w-xl w-full space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">O que será extraído de cada arquivo:</p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                    <span>✅ Polígono completo da fazenda</span>
                    <span>✅ Centróide (lat/long automático)</span>
                    <span>✅ Vínculo pelo <strong>IDF</strong> (nome do arquivo)</span>
                    <span>✅ Contagem de vértices</span>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-6 space-y-4">
                  {/* Summary */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span className="text-[12px] font-black text-indigo-700">{valid.length} polígono(s) válidos</span>
                    </div>
                    {invalid.length > 0 && (
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span className="text-[12px] font-black text-rose-600">{invalid.length} com erro</span>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setResults([]); }}
                      className="ml-auto text-[10px] font-black uppercase text-slate-400 hover:text-slate-700">
                      <X className="w-3.5 h-3.5 mr-1" /> Limpar
                    </Button>
                  </div>

                  {/* Table */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          {['', 'Arquivo', 'IDF', 'Vértices', 'Centróide (Lat)', 'Centróide (Lon)'].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => (
                          <tr key={i} className={cn("border-b border-slate-50 last:border-0", r.error && "bg-rose-50/30")}>
                            <td className="py-3 px-4">
                              {r.error
                                ? <AlertTriangle className="w-4 h-4 text-rose-500" />
                                : <CheckCircle className="w-4 h-4 text-indigo-500" />
                              }
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <div className="flex flex-col">
                                  <span className="font-mono text-[10px] text-slate-600 truncate max-w-[220px]">{r.filename}</span>
                                  <span className="text-[8px] text-slate-400">IDF extraído: <strong className="text-indigo-600">{r.idf}</strong></span>
                                </div>
                              </div>
                              {r.error && <p className="text-[9px] text-rose-600 font-bold mt-0.5">{r.error}</p>}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">{r.idf}</td>
                            <td className="py-3 px-4">
                              {r.vertexCount > 0 && (
                                <span className="bg-indigo-50 text-indigo-600 font-black text-[10px] px-2 py-0.5 rounded-full">
                                  {r.vertexCount} pts
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500 text-[10px]">{r.centroidLat}</td>
                            <td className="py-3 px-4 font-mono text-slate-500 text-[10px]">{r.centroidLon}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ScrollArea>
            )}

            {/* FOOTER */}
            {results.length > 0 && (
              <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
                <p className="text-[10px] text-slate-400 font-bold">
                  Os polígonos serão vinculados às fazendas pelo IDF.
                  {invalid.length > 0 && ` ${invalid.length} arquivo(s) com erros serão ignorados.`}
                </p>
                <Button onClick={handleImport} disabled={valid.length === 0 || isImporting}
                  className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest gap-2 disabled:opacity-40">
                  {isImporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Vinculando...</>
                    : <><Upload className="w-4 h-4" /> Vincular {valid.length} Polígono(s)</>
                  }
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
