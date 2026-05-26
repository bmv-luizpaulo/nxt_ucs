"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { 
  FileText, 
  Layers, 
  Calendar, 
  Check, 
  Award, 
  ShieldCheck, 
  Leaf, 
  Globe, 
  Sparkles, 
  MapPin, 
  ArrowUpRight,
  TrendingDown,
  Droplets,
  Loader2
} from "lucide-react";
import { Poppins, Montserrat } from "next/font/google";
import { initializeFirebase } from "@/firebase";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Pedido } from "@/lib/types";
import { calculateGhgEmissions, generateDefaultKpis } from "@/lib/ghgProtocol";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  weight: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

export default function CertificatePage() {
  const params = useParams();
  const code = typeof params?.code === "string" ? params.code : "";

  const [certData, setCertData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [auditedPedido, setAuditedPedido] = useState<Pedido | null>(null);

  // 1. Fetch certificate from backend CSV API
  useEffect(() => {
    if (!code) return;
    setLoading(true);
    fetch(`/api/legado/domain?domain=certificate-by-code&code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setCertData(data);
        }
      })
      .catch((err) => console.error("Error fetching certificate:", err))
      .finally(() => setLoading(false));
  }, [code]);

  // 2. Fetch audited order data from Firestore if certificate matches
  useEffect(() => {
    if (!certData) return;

    const fetchFirestoreData = async () => {
      try {
        const { firestore } = initializeFirebase();
        
        // Match 1: Search by order ID directly if we resolved it
        const orderId = certData.order?.id;
        if (orderId) {
          const docRef = doc(firestore, "pedidos", orderId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setAuditedPedido(docSnap.data() as Pedido);
            return;
          }
        }

        // Match 2: Query collection where linkCertificado or code matches
        const q = query(
          collection(firestore, "pedidos"),
          where("linkCertificado", ">=", `/certificate/${code}`)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          // Find exact match or first item
          const docData = querySnapshot.docs[0].data() as Pedido;
          setAuditedPedido(docData);
        }
      } catch (err) {
        console.error("Error querying Firestore for audited metrics:", err);
      }
    };

    fetchFirestoreData();
  }, [certData, code]);

  // 3. Perform calculations for GHG Protocol and positive impact
  const ucs = certData?.certificate?.amount || 0;

  const carbonBalance = useMemo(() => {
    if (auditedPedido) {
      const emissions = calculateGhgEmissions(auditedPedido);
      const isNeutral = ucs >= emissions.total;
      
      // If no activity data is inputted, fall back to proportional representation of retired UCS
      const hasInputs = [
        auditedPedido.kpiGasolinaL, auditedPedido.kpiDieselL, auditedPedido.kpiEtanolL,
        auditedPedido.kpiGnvM3, auditedPedido.kpiJetfuelL, auditedPedido.kpiLenhaT,
        auditedPedido.kpiEnergiaKwh, auditedPedido.kpiAguaM3, auditedPedido.kpiLixoT
      ].some(val => Number(val || 0) > 0);

      if (!hasInputs) {
        return {
          scope1: Number((ucs * 0.50).toFixed(2)),
          scope2: Number((ucs * 0.20).toFixed(2)),
          scope3: Number((ucs * 0.30).toFixed(2)),
          totalEmissions: ucs,
          isNeutral: true,
          isSimulated: true
        };
      }

      return {
        scope1: emissions.scope1,
        scope2: emissions.scope2,
        scope3: emissions.scope3,
        totalEmissions: emissions.total,
        isNeutral,
        isSimulated: false
      };
    }

    // Default proportional fallback for legacy/non-audited certificates
    return {
      scope1: Number((ucs * 0.50).toFixed(2)),
      scope2: Number((ucs * 0.20).toFixed(2)),
      scope3: Number((ucs * 0.30).toFixed(2)),
      totalEmissions: ucs,
      isNeutral: true,
      isSimulated: true
    };
  }, [auditedPedido, ucs]);

  const environmentalKpis = useMemo(() => {
    const defaults = generateDefaultKpis(ucs);
    if (auditedPedido) {
      return {
        florestaNativaM2: auditedPedido.kpiFlorestaNativaM2 || defaults.florestaNativaM2,
        carbonoTCO2e: auditedPedido.kpiCarbonoTCO2e || defaults.carbonoTCO2e,
        faunaHa: auditedPedido.kpiFaunaHa || defaults.faunaHa,
        floraHa: auditedPedido.kpiFloraHa || defaults.floraHa,
        madeiraM3: auditedPedido.kpiMadeiraM3 || defaults.madeiraM3,
        producaoApoiadaM2: auditedPedido.kpiProducaoApoiadaM2 || defaults.producaoApoiadaM2,
        hidrologicoLAno: auditedPedido.kpiHidrologicoLAno || defaults.hidrologicoLAno,
        recuperacaoAreaM2: auditedPedido.kpiRecuperacaoAreaM2 || defaults.recuperacaoAreaM2,
        nucleo: auditedPedido.nucleo || "Xingu Mata Viva",
        validade: auditedPedido.validade || certData?.certificationPeriod?.end || "—"
      };
    }

    return {
      ...defaults,
      nucleo: "Xingu Mata Viva",
      validade: certData?.certificationPeriod?.end || "—"
    };
  }, [auditedPedido, ucs, certData]);

  if (loading) {
    return (
      <div className={`min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-4 ${poppins.className}`}>
        <Loader2 className="w-10 h-10 text-[#4c563e] animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando Certificado...</p>
      </div>
    );
  }

  if (!certData) {
    return (
      <div className={`min-h-screen bg-[#fafaf9] flex items-center justify-center p-4 ${poppins.className}`}>
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-neutral-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-neutral-800 mb-2">Certificado não encontrado</h1>
          <p className="text-neutral-500 text-sm mb-6">
            O código do selo informado não foi localizado no nosso banco de dados. Verifique a URL e tente novamente.
          </p>
          <a href="/" className="inline-block bg-[#4c563e] text-white font-medium px-6 py-2.5 rounded-full text-sm hover:bg-[#3d4532] transition">
            Voltar ao Início
          </a>
        </div>
      </div>
    );
  }

  const { certificate, owner, certificationPeriod } = certData;

  return (
    <div className={`min-h-screen bg-[#fdfdfb] text-[#223322] py-16 px-4 md:px-8 ${poppins.className}`}>
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Certificate Title / Owner Name */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#4c563e]/10 text-[#4c563e] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#4c563e]/20 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" /> Integridade Blockchain Garantida
          </div>
          <h1 className={`text-3xl md:text-4xl font-black tracking-widest text-[#2c3d24] uppercase ${montserrat.className}`}>
            {owner.name}
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{owner.document ? `CNPJ/CPF: ${owner.document}` : ""}</p>
        </div>

        {/* Logo and Metadata Block */}
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[2.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Logo Image */}
          <div className="relative shrink-0 flex flex-col items-center">
            <img 
              src="/image/Logo Tesouro Verde_04.png" 
              alt="Logo Tesouro Verde" 
              className="w-56 h-56 object-contain select-none shrink-0"
            />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4c563e]/60 mt-4">Plataforma Homologada</span>
          </div>

          {/* Metadata Fields */}
          <div className="flex flex-col gap-6 w-full max-w-lg">
            
            {/* Field 1: Número do Selo */}
            <div className="flex gap-4 items-start border-b border-slate-50 pb-4 last:border-0 last:pb-0">
              <div className="bg-[#4c563e] text-white p-2.5 rounded-2xl shrink-0 shadow-md shadow-[#4c563e]/15">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código do Selo</span>
                <span className={`text-base text-[#2c3d24] font-bold break-all mt-0.5 ${montserrat.className}`}>
                  {certificate.code}
                </span>
              </div>
            </div>

            {/* Field 2: ICRS */}
            <div className="flex gap-4 items-start border-b border-slate-50 pb-4 last:border-0 last:pb-0">
              <div className="bg-[#4c563e] text-white p-2.5 rounded-2xl shrink-0 shadow-md shadow-[#4c563e]/15">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UCS Compensadas (Créditos)</span>
                <span className="text-base text-[#2c3d24] font-bold mt-0.5">
                  {ucs.toLocaleString("pt-BR")} UCS (Unidades de Crédito de Sustentabilidade)
                </span>
              </div>
            </div>

            {/* Field 3: Período da Certificação */}
            <div className="flex gap-4 items-start border-b border-slate-50 pb-4 last:border-0 last:pb-0">
              <div className="bg-[#4c563e] text-white p-2.5 rounded-2xl shrink-0 shadow-md shadow-[#4c563e]/15">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Período de Referência</span>
                <span className="text-base text-[#2c3d24] font-bold mt-0.5">
                  {certificationPeriod.start} a {certificationPeriod.end}
                </span>
              </div>
            </div>

            {/* Field 4: Validade */}
            <div className="flex gap-4 items-start border-b border-slate-50 pb-4 last:border-0 last:pb-0">
              <div className="bg-[#4c563e] text-white p-2.5 rounded-2xl shrink-0 shadow-md shadow-[#4c563e]/15">
                <Check className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Validade do Selo</span>
                <span className="text-base text-[#2c3d24] font-bold mt-0.5">
                  {environmentalKpis.validade}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── BALANÇO DE COMPENSAÇÃO AMBIENTAL (GHG PROTOCOL) ── */}
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[2.5rem] p-8 md:p-12 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
              <Globe className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className={`text-lg font-black uppercase tracking-tight text-slate-900 ${montserrat.className}`}>Balanço de Carbono (GHG Protocol)</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Declaração de Inventário e Compensação de Emissões</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Live Balance Graphic */}
            <div className="md:col-span-4 bg-[#0B0F1A] text-white p-6 rounded-3xl border border-white/5 space-y-4 shadow-xl flex flex-col justify-between h-full min-h-[220px]">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Volume Neutralizado</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white font-mono">{ucs.toLocaleString("pt-BR")}</span>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">tCO₂e</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-2">Corresponde a 100% das UCS aposentadas no Ledger.</p>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2 text-[10px]">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Pegada Calculada:</span>
                  <span className="font-mono text-amber-400">{carbonBalance.totalEmissions.toLocaleString("pt-BR")} t</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Status Corporativo:</span>
                  {carbonBalance.isNeutral ? (
                    <span className="text-emerald-400 uppercase font-black">Carbono Neutro ✓</span>
                  ) : (
                    <span className="text-rose-400 uppercase font-black">Emissão Residual</span>
                  )}
                </div>
              </div>
            </div>

            {/* Scope Details cards */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-slate-100 rounded-2xl p-4 space-y-2 text-left relative overflow-hidden bg-slate-50/50">
                <div className="absolute top-0 left-0 right-0 h-1 bg-yellow-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Escopo 1</span>
                <h4 className="text-lg font-black text-[#2c3d24] font-mono">{carbonBalance.scope1.toLocaleString("pt-BR")} <span className="text-[10px] text-slate-400 font-bold">t</span></h4>
                <p className="text-[9px] text-slate-500 leading-snug">Emissões diretas das operações corporativas (combustão, frotas).</p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-4 space-y-2 text-left relative overflow-hidden bg-slate-50/50">
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Escopo 2</span>
                <h4 className="text-lg font-black text-[#2c3d24] font-mono">{carbonBalance.scope2.toLocaleString("pt-BR")} <span className="text-[10px] text-slate-400 font-bold">t</span></h4>
                <p className="text-[9px] text-slate-500 leading-snug">Emissões indiretas associadas ao consumo de energia elétrica da rede.</p>
              </div>

              <div className="border border-slate-100 rounded-2xl p-4 space-y-2 text-left relative overflow-hidden bg-slate-50/50">
                <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Escopo 3</span>
                <h4 className="text-lg font-black text-[#2c3d24] font-mono">{carbonBalance.scope3.toLocaleString("pt-BR")} <span className="text-[10px] text-slate-400 font-bold">t</span></h4>
                <p className="text-[9px] text-slate-500 leading-snug">Emissões indiretas na cadeia de suprimentos (água e resíduos).</p>
              </div>
            </div>
          </div>
          
          {carbonBalance.isSimulated && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-start gap-2.5 text-slate-500 text-[10px] text-left">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                <b>Nota do Protocolo:</b> Este inventário exibe a alocação padrão de neutralização baseada no volume de créditos aposentados. 
                Para integrar os dados de consumo de combustível, energia e água reais da sua auditoria, o responsável técnico deve atualizar a ficha do pedido no console.
              </p>
            </div>
          )}
        </div>

        {/* ── RELATÓRIO DE IMPACTO ECOLÓGICO POSITIVO ── */}
        <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/50 rounded-[2.5rem] p-8 md:p-12 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className={`text-lg font-black uppercase tracking-tight text-slate-900 ${montserrat.className}`}>Impacto Ecológico Positivo</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ativos Ambientais Protegidos na Fazenda no Núcleo {environmentalKpis.nucleo}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* KPI 1 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-slate-100">
                🌳
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Floresta Preservada</span>
                <p className="text-[18px] font-black text-[#2c3d24] mt-0.5">{environmentalKpis.florestaNativaM2.toLocaleString("pt-BR")} m²</p>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-slate-100">
                💎
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carbono Estocado</span>
                <p className="text-[18px] font-black text-[#2c3d24] mt-0.5">{environmentalKpis.carbonoTCO2e.toLocaleString("pt-BR")} tCO₂e</p>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-slate-100">
                🐾
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fauna Protegida</span>
                <p className="text-[18px] font-black text-[#2c3d24] mt-0.5">
                  {environmentalKpis.faunaHa > 0 ? `${environmentalKpis.faunaHa.toLocaleString("pt-BR")} espécies/ha` : "Monitoramento ativo"}
                </p>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-slate-100">
                🌸
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Flora Protegida</span>
                <p className="text-[18px] font-black text-[#2c3d24] mt-0.5">
                  {environmentalKpis.floraHa > 0 ? `${environmentalKpis.floraHa.toLocaleString("pt-BR")} espécies/ha` : "Monitoramento ativo"}
                </p>
              </div>
            </div>

            {/* KPI 5 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-slate-100">
                🪵
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Madeira Preservada</span>
                <p className="text-[18px] font-black text-[#2c3d24] mt-0.5">
                  {environmentalKpis.madeiraM3 > 0 ? `${environmentalKpis.madeiraM3.toLocaleString("pt-BR")} m³` : "Monitoramento ativo"}
                </p>
              </div>
            </div>

            {/* KPI 6 */}
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-slate-100">
                💧
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fluxo Hidrológico Regula</span>
                <p className="text-[18px] font-black text-[#2c3d24] mt-0.5">
                  {environmentalKpis.hidrologicoLAno > 0 ? `${environmentalKpis.hidrologicoLAno.toLocaleString("pt-BR")} L/ano` : "Monitoramento ativo"}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
