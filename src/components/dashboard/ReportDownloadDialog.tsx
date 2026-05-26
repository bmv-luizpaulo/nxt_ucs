"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, CheckCircle2, Printer, FileText, ExternalLink } from "lucide-react";
import { Pedido, Movimento } from "@/lib/types";
import { cn } from "@/lib/utils";
import { calculateGhgEmissions } from "@/lib/ghgProtocol";

// ─── Report Templates ───────────────────────────────────────────────────────

interface ReportTemplate {
  id: string;
  label: string;
  description: string;
  category: string[];
  previewBg: string;
  accentColor: string;
  headerLogo: "bmv" | "tesouro-verde" | "sebrae";
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "bmv-standard",
    label: "Report BMV Padrão",
    description: "Identidade visual BMV, verde escuro",
    category: ["selo", "Saas_BMV"],
    previewBg: "from-[#2d4a2d] to-[#1a2e1a]",
    accentColor: "#3a6b3a",
    headerLogo: "bmv",
  },
  {
    id: "tesouro-verde",
    label: "Report Tesouro Verde",
    description: "Identidade Tesouro Verde, verde teal",
    category: ["Saas_Tesouro_Verde"],
    previewBg: "from-[#2d6a5a] to-[#1a3e35]",
    accentColor: "#3d7a6a",
    headerLogo: "tesouro-verde",
  },
  {
    id: "sebrae-co",
    label: "Report Tesouro Verde + SEBRAE",
    description: "Co-branding SEBRAE & Tesouro Verde",
    category: ["Saas_Tesouro_Verde"],
    previewBg: "from-[#1a3d6e] to-[#0f2444]",
    accentColor: "#1a5aa0",
    headerLogo: "sebrae",
  },
];

// ─── HTML Report Generator ──────────────────────────────────────────────────

function buildReportHtml(template: ReportTemplate, pedido: Pedido, movimentos: Movimento[]): string {
  const date = new Date(pedido.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const now = new Date().toLocaleString("pt-BR");
  const certUrl = pedido.linkCertificado || pedido.linkNxt || "";
  const qrUrl = certUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(certUrl)}&bgcolor=ffffff`
    : "";

  const isBMV = template.headerLogo === "bmv";
  const isTV = template.headerLogo === "tesouro-verde";
  const isSebrae = template.headerLogo === "sebrae";

  const primaryColor = isBMV ? "#2d4a2d" : isTV ? "#2a7a6a" : "#1a5aa0";
  const accentColor = isBMV ? "#5a8a3a" : isTV ? "#3aaa8a" : "#3a80c0";
  const lightBg = isBMV ? "#f0f7f0" : isTV ? "#f0f9f7" : "#f0f5fb";

  // Calculations for GHG Protocol
  const emissions = calculateGhgEmissions(pedido);
  
  // Resolve Positive Impact KPIs
  const nativa = pedido.kpiFlorestaNativaM2 || (pedido.quantidade * 30);
  const carbono = pedido.kpiCarbonoTCO2e || pedido.quantidade;
  const fauna = pedido.kpiFaunaHa || 0;
  const flora = pedido.kpiFloraHa || 0;
  const madeira = pedido.kpiMadeiraM3 || 0;
  const hidrologico = pedido.kpiHidrologicoLAno || 0;

  // Header logos HTML
  const headerLogos = isSebrae
    ? `<div style="display:flex;align-items:center;gap:24px;">
        <div style="background:#2a7a6a;color:white;padding:10px 16px;border-radius:8px;font-size:18px;font-weight:900;letter-spacing:-0.5px;">tesouro<br>VERDE</div>
        <div style="width:1px;height:40px;background:#ddd;"></div>
        <div style="color:#1a5aa0;font-size:28px;font-weight:900;letter-spacing:-1px;">SEBRAE</div>
      </div>`
    : isTV
    ? `<div style="background:#2a7a6a;color:white;padding:10px 20px;border-radius:8px;font-size:20px;font-weight:900;letter-spacing:-0.5px;line-height:1.2;">tesouro<br>VERDE</div>`
    : `<div style="display:flex;align-items:center;gap:4px;">
        <div style="width:44px;height:44px;background:#c8a820;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:900;">BMV</div>
        <span style="font-size:28px;font-weight:900;color:#c8a820;margin-left:-2px;">bmv</span>
      </div>`;

  const movimentosRows = movimentos.length > 0
    ? movimentos.map((m, i) => `
        <tr style="border-bottom:1px solid #e8f0e8;">
          <td style="padding:12px 16px;font-size:11px;font-weight:700;color:#555;text-transform:uppercase;">${m.tipo || "CLIENTE"}</td>
          <td style="padding:12px 16px;font-size:11px;color:#444;text-transform:uppercase;">${m.origem || "—"}</td>
          <td style="padding:12px 16px;font-size:11px;font-weight:900;color:#222;text-transform:uppercase;">${m.destino || "—"}</td>
          <td style="padding:12px 16px;font-size:11px;font-weight:900;color:${primaryColor};text-align:right;">${m.quantidade.toLocaleString("pt-BR")} UCS</td>
        </tr>`).join("")
    : `<tr><td colspan="4" style="padding:32px;text-align:center;font-size:11px;color:#aaa;font-style:italic;">Nenhuma movimentação registrada.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report de Certificação — ${pedido.empresa}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',Arial,sans-serif; background:#f4f4f4; color:#1a1a1a; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { background:white; max-width:860px; margin:0 auto; padding:0; box-shadow:0 4px 40px rgba(0,0,0,0.12); }

    /* HEADER */
    .header { background:${primaryColor}; padding:40px 50px 36px; display:flex; justify-content:space-between; align-items:flex-start; }
    .header-right { text-align:right; color:rgba(255,255,255,0.85); }
    .header-right h1 { font-size:15px; font-weight:900; text-transform:uppercase; letter-spacing:0.15em; color:white; line-height:1.3; }
    .header-right p { font-size:10px; font-weight:600; margin-top:6px; opacity:0.7; text-transform:uppercase; letter-spacing:0.1em; }
    .protocol-badge { display:inline-block; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); border-radius:6px; padding:5px 12px; font-size:11px; font-weight:900; letter-spacing:0.08em; color:white; margin-top:8px; }

    /* IDENTITY STRIP */
    .identity-strip { background:${lightBg}; border-bottom:3px solid ${primaryColor}; padding:28px 50px; display:flex; justify-content:space-between; align-items:flex-start; gap:32px; }
    .identity-block { flex:1; }
    .identity-block .label { font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; color:#888; margin-bottom:4px; }
    .identity-block .value { font-size:22px; font-weight:900; color:#111; line-height:1.1; }
    .identity-block .sub { font-size:11px; font-weight:600; color:#666; margin-top:4px; font-family:'Courier New',monospace; }
    .qr-box { display:flex; flex-direction:column; align-items:center; gap:6px; background:white; border:1px solid #e0e0e0; border-radius:12px; padding:12px 14px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
    .qr-box img { width:110px; height:110px; }
    .qr-box span { font-size:8px; font-weight:900; text-transform:uppercase; letter-spacing:0.15em; color:#999; }

    /* SECTION */
    .section { padding:36px 50px; border-bottom:1px solid #f0f0f0; }
    .section-title { font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.25em; color:${accentColor}; margin-bottom:20px; padding-bottom:10px; border-bottom:2px solid ${lightBg}; }

    /* INFO GRID */
    .info-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:24px; }
    .info-item .label { font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.15em; color:#aaa; margin-bottom:4px; }
    .info-item .value { font-size:15px; font-weight:900; color:#111; }
    .info-item .value.big { font-size:28px; color:${primaryColor}; }
    .info-item .value.currency { font-size:18px; color:${accentColor}; }
    .info-item .value.mono { font-family:'Courier New',monospace; font-size:11px; color:#555; word-break:break-all; }
    .info-item .value.status-ok { color:#16a34a; }
    .info-item .value.url { font-size:9px; font-family:'Courier New',monospace; color:#3b82f6; text-decoration:underline; word-break:break-all; }

    /* TABLE */
    .data-table { width:100%; border-collapse:collapse; border-radius:12px; overflow:hidden; border:1px solid #e8f0e8; }
    .data-table thead tr { background:${primaryColor}; }
    .data-table thead th { padding:13px 16px; font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.18em; color:rgba(255,255,255,0.85); text-align:left; }
    .data-table thead th:last-child { text-align:right; }
    .data-table tbody tr:nth-child(even) { background:#f9fdf9; }

    /* STATS ROW */
    .stats-row { display:flex; gap:0; }
    .stat-card { flex:1; padding:20px 24px; border-right:1px solid ${lightBg}; }
    .stat-card:last-child { border-right:none; }
    .stat-card .label { font-size:8px; font-weight:900; text-transform:uppercase; letter-spacing:0.2em; color:#aaa; margin-bottom:6px; }
    .stat-card .value { font-size:20px; font-weight:900; color:${primaryColor}; }
    .stat-card .value.currency { font-size:16px; }

    /* GHG PROTOCOL & IMPACT SECTIONS */
    .ghg-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:15px; }
    .ghg-card { background:#fafafa; border:1px solid #eaeaea; border-radius:12px; padding:16px; border-top:3px solid #ddd; text-align:left; }
    .ghg-card.scope1 { border-top-color:#eab308; }
    .ghg-card.scope2 { border-top-color:#3b82f6; }
    .ghg-card.scope3 { border-top-color:#a855f7; }
    .ghg-card h3 { font-size:10px; font-weight:900; text-transform:uppercase; color:#666; letter-spacing:0.05em; }
    .ghg-card .val { font-size:18px; font-weight:900; color:#111; margin-top:8px; }
    .ghg-card .desc { font-size:8px; color:#888; margin-top:4px; line-height:1.3; }

    .balance-banner { background:${primaryColor}; color:white; border-radius:12px; padding:20px; display:flex; justify-content:space-between; align-items:center; margin-top:20px; text-align:left; }
    .balance-left h4 { font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; opacity:0.8; }
    .balance-left p { font-size:15px; font-weight:900; margin-top:4px; }
    .balance-right { text-align:right; }
    .balance-badge { display:inline-block; background:#22c55e; color:white; padding:6px 12px; border-radius:30px; font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; }

    .impact-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; text-align:left; }
    .impact-card { background:${lightBg}; border:1px solid rgba(0,0,0,0.03); border-radius:12px; padding:16px; display:flex; align-items:center; gap:12px; }
    .impact-icon { width:36px; height:36px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,0.04); shrink-0; }
    .impact-info h4 { font-size:8px; font-weight:900; text-transform:uppercase; color:#888; letter-spacing:0.05em; }
    .impact-info p { font-size:14px; font-weight:900; color:#111; margin-top:2px; }

    /* FOOTER */
    .footer { background:${primaryColor}; padding:28px 50px; display:flex; justify-content:space-between; align-items:center; }
    .footer-left { display:flex; align-items:center; gap:10px; }
    .footer-check { width:22px; height:22px; background:#4ade80; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; color:white; font-weight:900; }
    .footer-left p { font-size:10px; font-weight:700; color:rgba(255,255,255,0.9); text-transform:uppercase; letter-spacing:0.1em; }
    .footer-right { text-align:right; }
    .footer-right .sign-line { border-top:1px solid rgba(255,255,255,0.3); padding-top:8px; }
    .footer-right p { font-size:9px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; color:rgba(255,255,255,0.7); }

    @media print {
      body { background:white; }
      .page { box-shadow:none; max-width:100%; }
      @page { margin:0; size:A4; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- HEADER -->
    <div class="header">
      ${headerLogos}
      <div class="header-right">
        <h1>Relatório de Certificação<br>e Rastreabilidade</h1>
        <p>Gerado em: ${now}</p>
        <div class="protocol-badge">PROTOCOLO #${pedido.id}</div>
      </div>
    </div>

    <!-- IDENTITY STRIP -->
    <div class="identity-strip">
      <div style="flex:1;">
        <div class="identity-block">
          <div class="label">Entidade Certificada</div>
          <div class="value">${pedido.empresa || "—"}</div>
          <div class="sub">${pedido.cnpj || "—"}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:20px;">
          <div class="identity-block">
            <div class="label">Programa</div>
            <div style="font-size:13px;font-weight:800;color:#333;text-transform:uppercase;">${pedido.programa || pedido.origem || pedido.categoria?.replace(/_/g, " ") || "—"}</div>
          </div>
          <div class="identity-block">
            <div class="label">Data do Protocolo</div>
            <div style="font-size:13px;font-weight:800;color:#333;">${date}</div>
          </div>
          <div class="identity-block">
            <div class="label">UF / Modo</div>
            <div style="font-size:13px;font-weight:800;color:#333;">${pedido.uf || pedido.modo || "—"}</div>
          </div>
        </div>
      </div>
      ${qrUrl ? `<div class="qr-box">
        <img src="${qrUrl}" alt="QR Code de Verificação" />
        <span>Verificar</span>
      </div>` : ""}
    </div>

    <!-- STATS -->
    <div style="border-bottom:1px solid #f0f0f0;">
      <div class="stats-row">
        <div class="stat-card">
          <div class="label">Volume de UCS Aposentadas</div>
          <div class="value">${pedido.quantidade.toLocaleString("pt-BR")} <span style="font-size:13px;">UCS</span></div>
        </div>
        <div class="stat-card">
          <div class="label">Taxa por UCS</div>
          <div class="value currency">${pedido.taxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
        </div>
        <div class="stat-card">
          <div class="label">Valor Total Auditado</div>
          <div class="value currency">${pedido.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
        </div>
        <div class="stat-card">
          <div class="label">Status de Auditoria</div>
          <div class="value" style="font-size:14px;color:${pedido.status === "ok" ? "#16a34a" : "#d97706"};">${pedido.status?.toUpperCase() || "PENDENTE"}</div>
        </div>
      </div>
    </div>

    <!-- BLOCKCHAIN -->
    <div class="section">
      <div class="section-title">Vínculo Blockchain NXT</div>
      <div class="info-grid">
        <div class="info-item" style="grid-column:span 1;">
          <div class="label">Número do Selo / Hash</div>
          <div class="value mono">${pedido.hashPedido || "—"}</div>
        </div>
        <div class="info-item" style="grid-column:span 2;">
          <div class="label">Link NXT de Verificação</div>
          <div class="value url">${pedido.linkNxt || "—"}</div>
        </div>
        ${pedido.linkCertificado ? `<div class="info-item" style="grid-column:span 3;">
          <div class="label">Link do Certificado</div>
          <div class="value url">${pedido.linkCertificado}</div>
        </div>` : ""}
      </div>
    </div>

    <!-- BALANÇO DE CARBONO (GHG PROTOCOL) -->
    <div class="section">
      <div class="section-title">Pegada de Carbono & Reconciliação (GHG Protocol)</div>
      
      <div class="ghg-grid">
        <div class="ghg-card scope1">
          <h3>Escopo 1 — Direto</h3>
          <div class="val">${emissions.scope1.toLocaleString("pt-BR")} tCO₂e</div>
          <div class="desc">Combustão móvel e fixa de combustíveis fósseis e biomassa nas operações da entidade.</div>
        </div>
        <div class="ghg-card scope2">
          <h3>Escopo 2 — Eletricidade</h3>
          <div class="val">${emissions.scope2.toLocaleString("pt-BR")} tCO₂e</div>
          <div class="desc">Emissões indiretas provenientes da geração de energia elétrica adquirida da rede (SIN).</div>
        </div>
        <div class="ghg-card scope3">
          <h3>Escopo 3 — Indireto</h3>
          <div class="val">${emissions.scope3.toLocaleString("pt-BR")} tCO₂e</div>
          <div class="desc">Emissões indiretas associadas à cadeia de valor, incluindo água consumida e resíduos gerados.</div>
        </div>
      </div>

      <div class="balance-banner">
        <div class="balance-left">
          <h4>Balanço de Carbono Corporativo</h4>
          <p>Compensação de GEE via Unidades de Crédito de Sustentabilidade</p>
        </div>
        <div class="balance-right">
          <span class="balance-badge">✓ Carbono Neutro Certificado</span>
          <div style="font-size:10px;margin-top:8px;opacity:0.9;font-weight:600;">
            Pegada GEE: <b>${emissions.total.toLocaleString("pt-BR")} tCO₂e</b> | Compensado: <b>${pedido.quantidade.toLocaleString("pt-BR")} tCO₂e</b>
          </div>
        </div>
      </div>
    </div>

    <!-- IMPACTO ECOLÓGICO POSITIVO -->
    <div class="section">
      <div class="section-title">Relatório de Impacto Ecológico Positivo</div>
      <div class="impact-grid">
        <div class="impact-card">
          <div class="impact-icon">🌳</div>
          <div class="impact-info">
            <h4>Floresta Nativa Preservada</h4>
            <p>${nativa.toLocaleString("pt-BR")} m²</p>
          </div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">💎</div>
          <div class="impact-info">
            <h4>Carbono Estocado</h4>
            <p>${carbono.toLocaleString("pt-BR")} tCO₂e</p>
          </div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">🐾</div>
          <div class="impact-info">
            <h4>Fauna Preservada (espécies/ha)</h4>
            <p>${fauna > 0 ? fauna.toLocaleString("pt-BR") : "—"}</p>
          </div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">🌸</div>
          <div class="impact-info">
            <h4>Flora Preservada (espécies/ha)</h4>
            <p>${flora > 0 ? flora.toLocaleString("pt-BR") : "—"}</p>
          </div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">🪵</div>
          <div class="impact-info">
            <h4>Volume de Madeira Preservada</h4>
            <p>${madeira > 0 ? `${madeira.toLocaleString("pt-BR")} m³` : "—"}</p>
          </div>
        </div>
        <div class="impact-card">
          <div class="impact-icon">💧</div>
          <div class="impact-info">
            <h4>Regulação de Fluxo Hidrológico</h4>
            <p>${hidrologico > 0 ? `${hidrologico.toLocaleString("pt-BR")} L/ano` : "—"}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- MOVIMENTAÇÕES -->
    <div class="section">
      <div class="section-title">Histórico de Rastreabilidade (Ledger Records)</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Origem do Ativo</th>
            <th>Destino Final</th>
            <th style="text-align:right;">Volume</th>
          </tr>
        </thead>
        <tbody>${movimentosRows}</tbody>
      </table>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-left">
        <div class="footer-check">✓</div>
        <p>Integridade verificada pelo Ledger BMV</p>
      </div>
      <div class="footer-right">
        <div class="sign-line">
          <p>Auditor de Conformidade BMV</p>
          <p style="opacity:0.5;font-size:8px;margin-top:3px;font-weight:600;">Assinado digitalmente via LedgerTrust</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Component ─────────────────────────────────────────────────────────────

interface ReportDownloadDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedido: Pedido;
  movimentos: Movimento[];
}

export function ReportDownloadDialog({ open, onOpenChange, pedido, movimentos }: ReportDownloadDialogProps) {
  const suggested = REPORT_TEMPLATES.filter(t => t.category.includes(pedido.categoria));
  const others = REPORT_TEMPLATES.filter(t => !t.category.includes(pedido.categoria));

  const [selected, setSelected] = useState<ReportTemplate>(suggested[0] || REPORT_TEMPLATES[0]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewHtml, setPreviewHtml] = useState("");

  // Rebuild preview whenever template or pedido changes
  useEffect(() => {
    if (selected) {
      setPreviewHtml(buildReportHtml(selected, pedido, movimentos));
    }
  }, [selected, pedido, movimentos]);

  // Write to iframe
  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [previewHtml]);

  const handleDownload = useCallback(() => {
    const html = buildReportHtml(selected, pedido, movimentos);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => {
        setTimeout(() => win.print(), 400);
      };
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [selected, pedido, movimentos]);

  const handleDirectDownload = useCallback(() => {
    const html = buildReportHtml(selected, pedido, movimentos);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `report-${pedido.empresa?.toLowerCase().replace(/\s+/g, "-") || pedido.id}-${selected.id}.html`;
    a.click();
  }, [selected, pedido, movimentos]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[92vh] p-0 border-none bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Report de Certificação — {pedido.empresa}</DialogTitle>
          <DialogDescription>Selecione o template do relatório e faça o download ou imprima como PDF.</DialogDescription>
        </DialogHeader>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1">Gerar Report de Certificação</p>
            <h2 className="text-xl font-black uppercase text-slate-900 leading-none">{pedido.empresa}</h2>
            <p className="text-[11px] text-slate-400 font-mono mt-1">{pedido.quantidade.toLocaleString("pt-BR")} UCS • Pedido #{pedido.id}</p>
          </div>
          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-[10px] uppercase px-3 py-1.5">
            {selected.label}
          </Badge>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div className="w-72 border-r border-slate-100 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-slate-50">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Templates de Report</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {suggested.length > 0 && (
                  <>
                    <p className="text-[9px] font-black uppercase text-indigo-600 tracking-widest px-2 pt-2 pb-1">✦ Sugeridos para esta categoria</p>
                    {suggested.map(t => (
                      <ReportThumb key={t.id} template={t} isSelected={selected.id === t.id} onClick={() => setSelected(t)} />
                    ))}
                    {others.length > 0 && (
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2 pt-4 pb-1">Outros modelos</p>
                    )}
                  </>
                )}
                {others.map(t => (
                  <ReportThumb key={t.id} template={t} isSelected={selected.id === t.id} onClick={() => setSelected(t)} />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-400 ml-2 font-mono">preview — {selected.label}</span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono">A4 · pt-BR</span>
            </div>

            {/* iFrame Preview */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white shadow-2xl shadow-black/20 min-h-full" style={{ transform: "scale(1)", transformOrigin: "top center" }}>
                <iframe
                  ref={iframeRef}
                  className="w-full border-none"
                  style={{ height: "calc(92vh - 220px)", minHeight: "600px" }}
                  title="Prévia do Report"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Modo de exportação</p>
            <p className="text-sm font-bold text-slate-600">Abre em nova aba → Ctrl+P → Salvar como PDF</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleDirectDownload}
              className="h-14 px-8 rounded-2xl border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 flex gap-2"
            >
              <FileText className="w-4 h-4" /> Baixar HTML
            </Button>
            <Button
              onClick={handleDownload}
              className="h-14 px-10 rounded-2xl bg-[#734DCC] hover:bg-[#633fb9] text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-indigo-100 flex gap-3 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Thumbnail ─────────────────────────────────────────────────────

function ReportThumb({ template, isSelected, onClick }: { template: ReportTemplate; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all group",
        isSelected
          ? "bg-indigo-50 border border-indigo-200 shadow-sm"
          : "hover:bg-slate-50 border border-transparent"
      )}
    >
      {/* Color swatch preview */}
      <div className={cn(
        "w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all flex flex-col",
        isSelected ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-slate-100 group-hover:border-slate-200"
      )}>
        <div className={`h-8 bg-gradient-to-br ${template.previewBg} flex items-center justify-center`}>
          <FileText className="w-4 h-4 text-white/80" />
        </div>
        <div className="flex-1 bg-white flex flex-col justify-center px-1.5 gap-0.5">
          <div className="h-1 bg-slate-200 rounded-full w-full" />
          <div className="h-1 bg-slate-100 rounded-full w-3/4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[11px] font-black leading-tight",
          isSelected ? "text-indigo-700" : "text-slate-700"
        )}>
          {template.label}
        </p>
        <p className={cn(
          "text-[9px] leading-tight mt-0.5",
          isSelected ? "text-indigo-400" : "text-slate-400"
        )}>
          {template.description}
        </p>
      </div>
      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />}
    </button>
  );
}
