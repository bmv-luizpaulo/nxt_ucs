"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, CheckCircle2, Loader2, ImageIcon } from "lucide-react";
import { Pedido } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Template Registry ─────────────────────────────────────────────────────

interface SealTemplate {
  id: string;
  label: string;
  src: string;         // path relativo a /public
  category: string[];  // quais categorias de pedido este selo é sugerido
  hasQrSpace: boolean; // se o template já tem espaço para QR code
}

const SEAL_TEMPLATES: SealTemplate[] = [
  // BMV – Eu Preservo
  { id: "bmv-01", label: "Eu Preservo BMV — Modelo 1", src: "/seals/bmv/Eu Preservo_Selos_Individuais_01.png", category: ["selo", "Saas_BMV"], hasQrSpace: false },
  { id: "bmv-02", label: "Eu Preservo BMV — Modelo 2", src: "/seals/bmv/Eu Preservo_Selos_Individuais_02.png", category: ["selo", "Saas_BMV"], hasQrSpace: false },
  { id: "bmv-03", label: "Eu Preservo BMV — Modelo 3", src: "/seals/bmv/Eu Preservo_Selos_Individuais_03.png", category: ["selo", "Saas_BMV"], hasQrSpace: false },
  { id: "bmv-04", label: "Eu Preservo BMV — Modelo 4", src: "/seals/bmv/Eu Preservo_Selos_Individuais_04.png", category: ["selo", "Saas_BMV"], hasQrSpace: false },
  { id: "bmv-05", label: "Eu Preservo BMV — Modelo 5", src: "/seals/bmv/Eu Preservo_Selos_Individuais_05.png", category: ["selo", "Saas_BMV"], hasQrSpace: false },
  { id: "bmv-06", label: "Eu Preservo BMV — Modelo 6", src: "/seals/bmv/Eu Preservo_Selos_Individuais_06.png", category: ["selo", "Saas_BMV"], hasQrSpace: false },
  { id: "bmv-07", label: "Eu Preservo BMV — Modelo 7", src: "/seals/bmv/Eu Preservo_Selos_Individuais_07.png", category: ["selo", "Saas_BMV"], hasQrSpace: false },
  { id: "bmv-08", label: "Eu Preservo BMV — Modelo 8", src: "/seals/bmv/Eu Preservo_Selos_Individuais_08.png", category: ["selo", "Saas_BMV"], hasQrSpace: false },

  // Tesouro Verde – Eu Preservo
  { id: "tv-01", label: "Eu Preservo Tesouro Verde — Modelo 1", src: "/seals/tesouro-verde/Tesouro Verde_Eu Preservo_Selos_Individuais_01.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: false },
  { id: "tv-02", label: "Eu Preservo Tesouro Verde — Modelo 2", src: "/seals/tesouro-verde/Tesouro Verde_Eu Preservo_Selos_Individuais_02.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: false },
  { id: "tv-03", label: "Eu Preservo Tesouro Verde — Modelo 3", src: "/seals/tesouro-verde/Tesouro Verde_Eu Preservo_Selos_Individuais_03.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: false },
  { id: "tv-04", label: "Eu Preservo Tesouro Verde — Modelo 4", src: "/seals/tesouro-verde/Tesouro Verde_Eu Preservo_Selos_Individuais_04.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: false },
  { id: "tv-05", label: "Eu Preservo Tesouro Verde — Modelo 5", src: "/seals/tesouro-verde/Tesouro Verde_Eu Preservo_Selos_Individuais_05.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: false },
  { id: "tv-06", label: "Eu Preservo Tesouro Verde — Modelo 6", src: "/seals/tesouro-verde/Tesouro Verde_Eu Preservo_Selos_Individuais_06.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: false },
  { id: "tv-07", label: "Eu Preservo Tesouro Verde — Modelo 7", src: "/seals/tesouro-verde/Tesouro Verde_Eu Preservo_Selos_Individuais_07.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: false },
  { id: "tv-08", label: "Eu Preservo Tesouro Verde — Modelo 8", src: "/seals/tesouro-verde/Tesouro Verde_Eu Preservo_Selos_Individuais_08.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: false },

  // Com QR code (todos os tipos)
  { id: "sebrae-qr", label: "Tesouro Verde + SEBRAE (com QR Code)", src: "/seals/sebrae/Selo- Pedido 806 SEBRAE.png", category: ["Saas_Tesouro_Verde", "Saas_BMV", "selo"], hasQrSpace: true },
  { id: "codemar-qr", label: "Mumbuca Verde / CODEMAR (com QR Code)", src: "/seals/tesouro-verde/Selo Mumbuca Verde - Tesouro Verde CODEMAR.png", category: ["Saas_Tesouro_Verde"], hasQrSpace: true },
];

// ─── Canvas Generator ───────────────────────────────────────────────────────

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function generateSealCanvas(template: SealTemplate, pedido: Pedido): Promise<string> {
  const canvas = document.createElement("canvas");
  const SIZE = 1200;
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  // Fundo branco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Imagem base do selo
  const sealImg = await loadImage(template.src);
  ctx.drawImage(sealImg, 0, 0, SIZE, SIZE);

  // Se tem QR code space, apenas faz download da imagem base (já tem QR)
  if (template.hasQrSpace) {
    return canvas.toDataURL("image/png");
  }

  // Overlay de dados no rodapé
  const certUrl = pedido.linkCertificado || pedido.linkNxt || "";

  // Faixa de dados no fundo
  const barH = 160;
  const barY = SIZE - barH;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.roundRect(40, barY - 10, SIZE - 80, barH, [20]);
  ctx.fill();

  // Borda sutil
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Empresa
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 36px 'Arial', sans-serif";
  ctx.fillText(pedido.empresa?.toUpperCase() || "", 70, barY + 44);

  // CNPJ + UCS
  ctx.fillStyle = "#64748b";
  ctx.font = "600 26px 'Arial', sans-serif";
  ctx.fillText(`CNPJ: ${pedido.cnpj || "—"}   •   ${pedido.quantidade} UCS   •   ${new Date(pedido.data).toLocaleDateString("pt-BR")}`, 70, barY + 84);

  // Hash/código
  if (pedido.hashPedido) {
    ctx.fillStyle = "#10B981";
    ctx.font = "500 22px 'Courier New', monospace";
    ctx.fillText(`ID: ${pedido.hashPedido}`, 70, barY + 120);
  }

  // QR Code no canto direito do overlay
  if (certUrl) {
    const qrSize = 120;
    const qrX = SIZE - 80 - qrSize;
    const qrY = barY - 4;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(certUrl)}&bgcolor=ffffff`;
    try {
      const qrImg = await loadImage(qrUrl);
      // Fundo branco para o QR
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(qrX - 8, qrY, qrSize + 16, qrSize + 16, [12]);
      ctx.fill();
      ctx.drawImage(qrImg, qrX, qrY + 8, qrSize, qrSize);
    } catch { /* sem QR se falhar */ }
  }

  return canvas.toDataURL("image/png");
}

// ─── Component ─────────────────────────────────────────────────────────────

interface SealDownloadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedido: Pedido;
}

export function SealDownloadDialog({ open, onOpenChange, pedido }: SealDownloadDialogProps) {
  // Pre-select the first template matching the order's category
  const suggested = SEAL_TEMPLATES.filter(t => t.category.includes(pedido.categoria));
  const others = SEAL_TEMPLATES.filter(t => !t.category.includes(pedido.categoria));

  const [selected, setSelected] = useState<SealTemplate>(suggested[0] || SEAL_TEMPLATES[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await generateSealCanvas(selected, pedido);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `selo-${pedido.empresa?.toLowerCase().replace(/\s+/g, "-") || pedido.id}-${selected.id}.png`;
      a.click();
    } catch (e) {
      console.error("Erro ao gerar selo:", e);
    } finally {
      setIsGenerating(false);
    }
  }, [selected, pedido]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 border-none bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Baixar Selo — {pedido.empresa}</DialogTitle>
          <DialogDescription>Selecione o template do selo e faça o download com os dados do pedido.</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">Gerar Selo de Certificação</p>
            <h2 className="text-xl font-black uppercase text-slate-900 leading-none">{pedido.empresa}</h2>
            <p className="text-[11px] text-slate-400 font-mono mt-1">{pedido.quantidade} UCS • {pedido.categoria?.replace(/_/g, " ")}</p>
          </div>
          <div className="flex items-center gap-3">
            {selected && (
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px] uppercase px-3 py-1.5">
                {selected.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Body: lista + preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div className="w-72 border-r border-slate-100 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Templates Disponíveis</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {/* Suggested */}
                {suggested.length > 0 && (
                  <>
                    <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest px-2 pt-2 pb-1">✦ Sugeridos para esta categoria</p>
                    {suggested.map(t => (
                      <TemplateThumb key={t.id} template={t} isSelected={selected.id === t.id} onClick={() => setSelected(t)} />
                    ))}
                    {others.length > 0 && (
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2 pt-4 pb-1">Outros modelos</p>
                    )}
                  </>
                )}
                {others.map(t => (
                  <TemplateThumb key={t.id} template={t} isSelected={selected.id === t.id} onClick={() => setSelected(t)} />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
              {selected ? (
                <div className="relative max-h-full max-w-full flex items-center justify-center">
                  {/* Shadow card */}
                  <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200 p-4 max-h-[calc(90vh-280px)]">
                    <img
                      src={selected.src}
                      alt={selected.label}
                      className="max-h-[calc(90vh-320px)] max-w-full object-contain rounded-xl"
                    />
                  </div>

                  {/* Overlay info badge */}
                  {!selected.hasQrSpace && (pedido.empresa || pedido.cnpj) && (
                    <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-3 border border-slate-100 shadow-lg">
                      <p className="text-[11px] font-black text-slate-900 uppercase truncate">{pedido.empresa}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{pedido.quantidade} UCS • {new Date(pedido.data).toLocaleDateString("pt-BR")}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 italic">← Esses dados serão sobrepostos no download</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 opacity-30">
                  <ImageIcon className="w-16 h-16 text-slate-300" />
                  <p className="text-sm font-bold text-slate-400">Selecione um template</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Template selecionado</p>
                <p className="text-sm font-black text-slate-900">{selected?.label || "—"}</p>
                {selected?.hasQrSpace && (
                  <p className="text-[10px] text-emerald-600 font-bold">✓ Contém QR Code</p>
                )}
              </div>
              <Button
                onClick={handleDownload}
                disabled={isGenerating || !selected}
                className="h-14 px-10 rounded-2xl bg-[#10B981] hover:bg-[#0D9488] text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-100 flex gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Gerando...</>
                ) : (
                  <><Download className="w-5 h-5" /> Baixar Selo PNG</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Thumbnail ────────────────────────────────────────────────────

function TemplateThumb({ template, isSelected, onClick }: { template: SealTemplate; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all group",
        isSelected
          ? "bg-emerald-50 border border-emerald-200 shadow-sm"
          : "hover:bg-slate-50 border border-transparent"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all",
        isSelected ? "border-emerald-400 shadow-md shadow-emerald-100" : "border-slate-100 group-hover:border-slate-200"
      )}>
        <img
          src={template.src}
          alt={template.label}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[11px] font-black leading-tight truncate",
          isSelected ? "text-emerald-700" : "text-slate-700"
        )}>
          {template.label}
        </p>
        {template.hasQrSpace && (
          <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide">com QR code</span>
        )}
      </div>
      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
    </button>
  );
}
