"use client"

import { useState } from "react";
import { Search, FileText, Trash2, ChevronLeft, ChevronRight, Database as DbIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/Sidebar";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, writeBatch, query, orderBy } from "firebase/firestore";
import { EntidadeSaldo, EntityStatus } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { EntityTable } from "@/components/entities/EntityTable";
import { EntityBulkImport } from "@/components/entities/EntityBulkImport";

const INITIAL_PRODUTORES_DATA = `ACACIO MASSARO YOSHIDA	534.372.098-68	493.477
ADAIR JOAO GUTT	274.307.400-06	54.284
ADALTO DE FREITAS	005.910.251-91	373.513
ADELIRIO GUTARDO BIANCHI	030.577.632-00	138.989
Adevair Carlos Calvi e Outros	454.170.249-53	88.902
ADOLFINO ALMEIDA DE MATOS	083.553.399-91	4.028
Agropecuária Mocoembu Ltda	80.359.862/0001-44	1.107.079
Agropecuária Nossa Senhora do Carmo S/A	00.945.531/0001-57	4.080.904
Agropecuária Palmas Ltda - ME	13.757.003/0001-16	145.262
Agropecuária Pangloss Ltda	60.710.761/0001-69	678.178
ALBERTO SCHLATTER	108.552.629-15	3.817.070
ALCEDA DA SILVA MACIEL	656.667.802-63	26.258
ALDAIR JOSÉ FENILLI	414.052.349-20	401.160
ALDEMAR FRANCISCATO DA SILVA	288.539.111-15	1.650
ALTAIR REMPEL	274.318.000-53	64.744
ALTAIR APARECIDO FENILLI E OUTROS	350.255.069-72	194.756
ALVISE ANTÔNIO SCANDOLARA	125.498.780-49	15.843
ANA PAULA DE SOUZA PARRON	935.297.321-68	14.701
ANTONIO FISCHER	255.764.539-72	540.615
ANTÔNIO DAMIAN PREVE NETO DAMIAN PREVE NETO	109.049.991-49	231.476
ANTÔNIO EVARISTO FRANCESCONI	002.052.068-91	1.035.489
ANTONIO LIMA GALADINOVIC GALADINOVIC	408.118.321-04	544.337
ANTÔNIO MARTINHO BECKER	369.954.799-04	92.570
ANTÔNIO RENATO MISSASSE	107.119.969-20	7.158
ANTÔNIO SÉRGIO LINCK	429.831.429-49	56.688
ANTÔNIO VICTORIO MANZUTTI	193.544.368-20	179.814
APARECIDO BRIANTE	045.704.809-34	2.126.612
APARECIDO RODRIGUES	278.904.659-04	148.087
ARI ALBRECHET	544.208.060-87	22.120
ARNOLDO GUTT	227.660.730-00	3.959
Arnoldo Schilke	145.220.470-53	7.473
RANCHO ROOSEVELT	261599.910.001-43	0
ASTOR ALBRECHT	604.581.941-15	13.958
ATAÍDE BARANZELLI	164.452.360-49	4.559
BEDIN - Indústria de Madeiras Ltda	03.208.121/0001-11	789.930
Benedicto Joaquim	203.200.948-04	570.649
BRENO MIRANDA FREITAS	333.561.811-49	686.714
Camilotti Empreendimentos e Participações S/A	544.710.289-87	1.112.087
CARLOS ALBERTO DE OLIVEIRA GUIMARÃES	002.853.581-20	5.378.713
CARLOS ANTÔNIO TROMBETTA	311.347.501-53	665.801
CARLOS HENRIQUE WOLF WOLF	427.916.771-00	14.807
CARLOS LEANDRO PALMEIRA COMPAROTTO	793.114.581-04	838.576
Carrenho Administradora de Bens LTDA	03.347.896/0001-78	46.996
Catlen Cella CELLA	015.623.771-75	232.451
CAUBI MOREIRA QUITO	016.163.071-53	222.709
CECÍLIA DONIN	830.521.271-87	14.714
CLEUZA BENEDITA DA SILVA	149.329.462-87	65.519
CLOVIS SVERSUT	412.748.909-00	310.845
Curicaca Agropecuaria S/A	02.470.321/0001-85	374.850
Danilo Silva e Lima e Outros	865.101.261-68	1.199.094
DEUSDEDITI RIBEIRO DE MATOS	329.349.209-68	4.654
Dinalva Lourenço Martins Borges	532.964.271-04	659.680
DIOGO ANTÔNIO CELLA	960.391.242-53	5.415
EDEGAR GORGEN	658.948.129-68	74.466
ÉDIO GONZAGA RIBEIRO	117.537.579-91	75.518
EDWARD ROSSI VILELA SILVA	049.866.361-20	2.892.043
EGON HOLTZ	181.303.210-68	17.951
ELAINE BIANCHI	779.875.782-15	15.405
Elizangela Cristina Martins	021.540.389-48	91.305
ELSON SCANDOLARA	766.007.429-68	14.849
ENIO PARRON PARRON	294.200.241-72	25.841
ENIO CAMPIOLO	106.408.789-20	401.190
ENOS CELLA	384.440.979-34	556.414
ERMELINDO COSTA ARAUJO	061.313.600-49	53.589
Ervino Miguel Kossmann	180.087.390-53	1.185
Fábio Bernardes da Costa	932.633.171-72	57.292
Fábio Luiz Oliveira Amaral	368.380.631-15	66.323
FELIPE TESSARI	036.070.771-85	36.154
Fenan Agropecuária Ltda	56.227.507/0001-37	1.379.868
FERNANDO NAGADORI MIZOTE	017.608.611-03	1.725
FIORAVANTE GABOARDI	016.038.179-72	28.246
Flávio Reinaldo Potter e Outros	154.866.133-34	474.769
Francisco Juares Machado e Outros	483.451.300-97	257.453
Frida Dickmann Hasse	054.636.549-30	50.157
Gelson Luiz	347.458.909-15	204.614
Geni Santolin	835.679.411-00	16.329
Germano Arno Kossmann	371.902.100-91	33.104
Gilmar Gobbi	385.642.899-20	204.019
Gilson Ferrucio Pinesso	389.458.869-15	357.686
Gulmar Fabrício	015.309.259-91	26.794
HÉLIO BARBOSA DORNELES	205.022.061-87	201.143
HERMES TESSARI	441.356.459-68	77.079
HERMINIO VENANCIO SOARES	116.630.220-20	23.952
HIONES GASQUER VICENTIN	177.985.231-20	666.936
IAOPA Agropecuária Ltda	03.624.545/0001-67	359.827
ILDA FERREIRA DOS SANTOS	887.460.541-20	150.356
Ilías Antônio de Oliveira e Outro	007.929.506-15	2.305.548
INÁCIO GABRIEL FISCHER	557.074.599-87	62.529
Ishamu Mizote MIZOTE	437.072.118-00	3.437
ITAMAR TESSARI	524.890.359-91	88.150
IVANIR PEDRO ESCHER	557.243.459-00	31.152
IVO ALCINO DE SOUZA	199.475.859-72	31.776
JACOB LOURENÇO TESSARI	441.355.569-49	240.306
JAEME ALVES DA SILVA	332.898.409-72	13.920
Jair Dias da Rocha e Outro	672.590.068-20	10.941
JAIRO OLIVEIRA AMARAL	403.618.881-04	63.085
JAIR SILVÉRIO PINTO RIBEIRO	160.869.021-00	377.577
JAQUELINE FÁTIMA BIOLO	405.039.501-06	138.167
JOANNA DA SILVA	290.945.002-30	20.228
JOÃO TELMO DE OLIVEIRA	174.654.511-91	35.157
JOÃO RIBEIRO DA SILVA	346.023.722-87	18.908
JOÃO ALTAIR CAETANO DOS SANTOS	368.413.239-04	129.813
Jocelito Carlos	700.742.321-34	28.120
JORACI TESSARI	441.356.109-00	62.840
JORGE CALGARO	473.347.979-49	53.174
Jorge Luiz Mello e Outro	603.580.849-20	160.700
JOSÉ FISCHER	332.970.709-78	41.402
JOSÉ GIMENES GELDE	116.663.829-49	28.395
JOSÉ LEAL DE FREITAS	014.658.641-72	1.192.117
JOSÉ SANTA ROSA	946.623.208-87	41.596
José Carlos Pena e outros	387.018.398-53	285.394
JOSÉ EDUARDO APARECIDO SILVA PARRON	014.797.281-79	1.938
José Hélio de Souza e Outro	467.425.909-63	72.838
JOSÉ IVAN MARTINS DARDENGO	493.770.607-10	234.727
JOSÉ JODIVALDO LOPES	199.527.401-15	24.427
José Laudenir Fabrício	327.767.721-49	30.700
JOSÉ RODRIGUES CORTIM	074.700.109-04	895
JOSÉ SADI MIRANDA SOARES	285.802.220-87	35.517
JOSINALDO LOPES	472.394.411-72	139.678
LAZARO ANTUNES	827.083.398-34	18.985
LUIS FERNANDO TADEU GRIMAS	363.341.119-49	558.832
LUIZ ZAPPANI	386.414.700-00	48.323
LUIZ CARLOS DE OLIVEIRA	156.767.901-30	0
LUIZ HENRIQUE ANTUNES	822.914.031-68	9.056
LUIZ PAULO BASSO	174.664.900-34	468.567
Madeireira Medianeira Ltda	150915150001-11	355.908
Madeireira Menino Cláudio Ltda	374773460001-95	1.035.399
Maicon Patrick	042.734.779-39	30.576
MANOEL PARRON RUIZ	117.524.249-72	90.235
Marcelo Fraccari Canova	828.881.081-00	12.896
Marcelo Simões Vieira e Outros	898.392.001-78	468.972
Marcia da Silva	290.943.992-53	22.131
Marco Antônio de Melo	348.592.251-04	60.348.988
Marcos Augusto Netto	139.810.051-04	288.164
MARIA DA SILVA MELO	290.947.472-00	22.905
Maria Cristina de Queiroz Orlanda Junqueira	005.803.558-37	922.497
Maria de Fátima Santana Roriz	133.741.681-91	95.626
Martha Macedo da Silva	273.278.682-91	25.182
Mauro Lanza	162.023.501-30	4.986
Mauro Sérgio Xavier Carrenho	183.608.829-91	6.772
Milson Antonio	368.053.279-20	223.971
Milton Antonio Dall Pizzolo	334.069.289-00	777.598
Moacir de Campos Rampazo	054.050.968-06	133.525
Nelson Peterlini Neto	103.921.198-46	65.549
Nercina de Almeida Gelde	939.613.161-04	4.776
Nereu Machado de Oliveira	344.761.801-91	14.543
Nestor Severino de Mendonça	035.764.931-15	403.557
Nilo Sérgio de Resende Neto	190.311.901-44	580.374
Norival Comandolli	019.398.319-20	518.543
Odair de Resende	134.178.271-91	551.017
Onício Resende Agropastoril Ltda	03.780.657/0001-07	699.808
Orlando Almeida Matos	429.627.141-53	3.665
Osmar Albino Sontag	219.693.610-34	42.033
Osvaldo Mondini	008.573.718-60	25.536
Paulo Roberto Seelend e Outro	276.622.681-87	1.374.843
Pedro Briante	128.501.529-00	1.836
Pedro Juliano Lopes	632.764.611-53	220.571
Pedro Nicolau Linck	359.722.460-15	37.234
Pruden-aço Comércio de Ferro e Chapas LTDA	61.446.316/0001-04	481.205
Quintino Severino Gobatto	131.370.699-04	47.594
Regina Lúcia Costa Simões	499.440.371-68	775.357
Regis Adriano Desordi Porazzi	613.709.400-68	188.476
Renato Oliveira Amaral	631.787.291-00	123.423
Renato Medeiros de Freitas	040.358.048-00	590.390
Roberto Marques Palmeira	303.121.161-87	326.684
Roberto Rampazo	462.316.418-72	128.247
Roberto Valdecir Brianti	129.476.799-20	400.559
Rosangela Silva	846.241.401-68	94.299
Rubens de Souza	046.179.249-49	64.415
Sandra Ribeiro	587.759.192-49	19.810
Saturnino Gonçalves	149.662.638-91	2.457.456
Silvia Maria Avila Peterlini	549.993.401-00	546.144
Silvio Xavier de Souza	088.187.111-72	124.766
Suélen Cella	990.863.521-20	32.287
Takemitsu Onitsuka	671.305.698-91	472.201
Tania Emilia Marques Motta Fuzeti e Outro	780.993.821-53	273.608
Thiago Luiz	025.896.151-16	183.408
Topázio Administração e Participação Sociedade Simples Ltda	176772880001-36	174.470
TOSHIKAZU NISHIDA	060.007.128-63	40.508
TOSHIMI SAITO	060.841.929-04	878
VALÉRIA DE SOUZA	837.132.201-15	21.106
VALÍDIO DRAI	285.480.869-04	19.888
VALTAIR CANOVA	927.909.848-91	10.909
VILSON SCANDOLARA	554.976.169-68	38.864
VIRSON SCHROEDER	575.719.299-20	37.419
Vladimir Cabral Donha	825.704.938-72	375.566
Wagner Garcia de Freitas	321.408.271-04	265.161
Waldir Pedro Hoffmann	187.014.349-34	474.897
Walter Éverton da Silva	098.090.188-00	83.152
Wilson Garcia de Andrade	279.116.409-04	119.989
Wilton Moreira Alves	420.461.142-72	370.771
Zélia Brissow	111.505.562-34	8.999
Zelir Tomaselli	275.758.450-20	11.421
Zelmir João Seelent	170.371.319-20	806.535
Zilma Macedo da Silva	589.165.042-87	128.433`;

export default function ProdutoresPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<EntityStatus>("disponivel");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [isSeeding, setIsSeeding] = useState(false);

  const produtoresQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "produtores"), orderBy("nome", "asc"));
  }, [firestore, user]);

  const { data: produtores, isLoading } = useCollection<EntidadeSaldo>(produtoresQuery);

  const filteredProdutores = (produtores || []).filter(p => p.status === activeTab);
  const totalPages = Math.ceil(filteredProdutores.length / itemsPerPage);
  const paginated = filteredProdutores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleBulkImport = async (data: any[]) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const colRef = collection(firestore, "produtores");

    data.forEach(item => {
      const docRef = doc(colRef, item.id);
      batch.set(docRef, item);
    });

    await batch.commit();
    toast({ title: "Ledger Sincronizado", description: `${data.length} registros de produtores atualizados.` });
  };

  const handleSeedData = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    
    try {
      const batch = writeBatch(firestore);
      const colRef = collection(firestore, "produtores");
      const rows = INITIAL_PRODUTORES_DATA.split('\n');
      
      rows.forEach(row => {
        const [nome, documento, saldoRaw] = row.split('\t');
        if (!nome || !documento) return;
        
        const saldoFinal = parseInt((saldoRaw || "0").replace(/\./g, '')) || 0;
        const id = `PROD-${documento.replace(/[^\d]/g, '')}`;
        
        const data: EntidadeSaldo = {
          id,
          nome: nome.trim(),
          documento: documento.trim(),
          uf: "MT", // Default para a base inicial
          originacao: saldoFinal,
          debito: 0,
          aposentadas: 0,
          bloqueadas: 0,
          aquisicao: 0,
          transferenciaImei: 0,
          estornoImei: 0,
          saldoAjustarImei: 0,
          saldoLegado: 0,
          cprs: "",
          bmtca: "",
          statusBmtca: "",
          desmate: "",
          saldoFinal,
          valorAjustar: 0,
          status: 'disponivel',
          createdAt: new Date().toISOString()
        };
        
        batch.set(doc(colRef, id), data);
      });

      await batch.commit();
      toast({ title: "Carga Inicial Concluída", description: `${rows.length} produtores inseridos com sucesso.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro na sincronização" });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!firestore || selectedIds.length === 0) return;
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => batch.delete(doc(firestore, "produtores", id)));
    await batch.commit();
    setSelectedIds([]);
    toast({ variant: "destructive", title: "Registros Removidos" });
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white/50 backdrop-blur-md px-8 flex items-center justify-between border-b border-slate-200 sticky top-0 z-10 print:hidden shrink-0">
          <h1 className="text-xl font-medium text-slate-600">Portal de Auditoria <span className="font-bold text-slate-900">Saldos: Produtores</span></h1>
          <div className="flex items-center gap-6">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar usuário ou documento..." className="pl-10 bg-slate-100 border-none rounded-full h-10 text-sm" />
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">AD</div>
          </div>
        </header>

        <div className="flex-1 p-8 space-y-8 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EntityStatus)} className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-slate-100/50 p-1 border rounded-full h-12">
                  <TabsTrigger value="disponivel" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">Disponíveis</TabsTrigger>
                  <TabsTrigger value="bloqueado" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">Bloqueados</TabsTrigger>
                  <TabsTrigger value="inapto" className="data-[state=active]:bg-white px-8 rounded-full text-[10px] font-bold uppercase tracking-widest">Inaptos</TabsTrigger>
                </TabsList>
                <div className="flex gap-3">
                  {selectedIds.length > 0 && (
                    <Button onClick={handleBulkDelete} variant="destructive" size="sm" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir ({selectedIds.length})
                    </Button>
                  )}
                  {(!produtores || produtores.length === 0) && (
                    <Button onClick={handleSeedData} disabled={isSeeding} className="h-12 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700">
                      <DbIcon className="w-3.5 h-3.5 mr-2" /> {isSeeding ? "Sincronizando..." : "Sincronizar Base Inicial"}
                    </Button>
                  )}
                  <EntityBulkImport onImport={handleBulkImport} type="produtor" />
                  <Button variant="outline" className="h-12 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest border-slate-200">
                    <FileText className="w-3.5 h-3.5 mr-2" /> Exportar Relatório
                  </Button>
                </div>
              </div>

              <EntityTable 
                data={paginated} 
                selectedIds={selectedIds} 
                onSelectionChange={setSelectedIds} 
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-slate-200 mt-6 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages} — Mostrando {paginated.length} de {filteredProdutores.length} produtores</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
