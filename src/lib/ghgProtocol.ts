import { Pedido } from "./types";

export interface GhgEmissions {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

export function calculateGhgEmissions(pedido: Partial<Pedido>): GhgEmissions {
  const gasolina = Number(pedido.kpiGasolinaL || 0);
  const diesel = Number(pedido.kpiDieselL || 0);
  const etanol = Number(pedido.kpiEtanolL || 0);
  const gnv = Number(pedido.kpiGnvM3 || 0);
  const jetfuel = Number(pedido.kpiJetfuelL || 0);
  const lenha = Number(pedido.kpiLenhaT || 0);
  
  const energia = Number(pedido.kpiEnergiaKwh || 0);
  
  const agua = Number(pedido.kpiAguaM3 || 0);
  const lixo = Number(pedido.kpiLixoT || 0);

  // Fatores de Emissão (tCO2e / Unidade)
  // Escopo 1: Combustão Direta
  const s1Gasolina = gasolina * 0.00227;
  const s1Diesel = diesel * 0.00268;
  const s1Etanol = etanol * 0.00147;
  const s1Gnv = gnv * 0.00204;
  const s1Jetfuel = jetfuel * 0.00254;
  const s1Lenha = lenha * 1.75;
  const scope1 = s1Gasolina + s1Diesel + s1Etanol + s1Gnv + s1Jetfuel + s1Lenha;

  // Escopo 2: Eletricidade Adquirida
  const scope2 = energia * 0.0001;

  // Escopo 3: Cadeia de Valor
  const s3Agua = agua * 0.0003;
  const s3Lixo = lixo * 1.2;
  const scope3 = s3Agua + s3Lixo;

  const total = scope1 + scope2 + scope3;

  return {
    scope1: Number(scope1.toFixed(3)),
    scope2: Number(scope2.toFixed(3)),
    scope3: Number(scope3.toFixed(3)),
    total: Number(total.toFixed(3)),
  };
}

export interface EnvironmentalKpis {
  florestaNativaM2: number;
  carbonoTCO2e: number;
  faunaHa: number;
  floraHa: number;
  madeiraM3: number;
  producaoApoiadaM2: number;
  hidrologicoLAno: number;
  recuperacaoAreaM2: number;
}

/**
 * Generates standard environmental metrics proportional to the number of UCS.
 * Used for legacy certificates that do not have custom audited details in Firestore.
 */
export function generateDefaultKpis(ucsAmount: number): EnvironmentalKpis {
  const amount = Number(ucsAmount || 0);
  return {
    florestaNativaM2: Number((amount * 30).toFixed(1)),
    carbonoTCO2e: amount,
    faunaHa: Number((amount * 0.05).toFixed(2)),
    floraHa: Number((amount * 0.1).toFixed(2)),
    madeiraM3: Number((amount * 5.4).toFixed(1)),
    producaoApoiadaM2: Number((amount * 12).toFixed(1)),
    hidrologicoLAno: Number((amount * 15800).toFixed(0)),
    recuperacaoAreaM2: Number((amount * 2.5).toFixed(1)),
  };
}
