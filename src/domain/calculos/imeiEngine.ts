/**
 * IMEI Engine - Motor de Cálculo Determinístico
 * Regra: Divisão 1/3 com absorção de resíduo pela IMEI.
 */

export type PartitionResult = {
  produtor: number;
  associacao: number;
  imei: number;
};

export const imeiEngine = {
  /**
   * Particiona o total de UCS de uma safra garantindo fechamento matemático.
   * @param totalUCS Valor total originado na safra
   */
  partitionSafra(totalUCS: number): PartitionResult {
    if (totalUCS <= 0) return { produtor: 0, associacao: 0, imei: 0 };

    // 1. Cálculo base (divisão por 3)
    // Usamos arredondamento para baixo para as partes "normais"
    // para garantir que a IMEI sempre absorva a sobra positiva.
    const partBase = Math.floor((totalUCS / 3) * 10000) / 10000;

    const produtor = partBase;
    const associacao = partBase;
    
    // 2. A IMEI fica com o total menos o que já foi distribuído
    // Isso garante que (produtor + associacao + imei) === totalUCS exatamente.
    const imei = Math.round((totalUCS - (produtor + associacao)) * 10000) / 10000;

    return {
      produtor,
      associacao,
      imei
    };
  },

  /**
   * Calcula o saldo final da IMEI baseado no fluxo de caixa de UCS.
   */
  calculateFinalBalance(
    totalOriginado: number,
    consumo: number,
    transferenciasSaida: number,
    transferenciasEntrada: number
  ): number {
    return (totalOriginado + transferenciasEntrada) - (consumo + transferenciasSaida);
  }
};
