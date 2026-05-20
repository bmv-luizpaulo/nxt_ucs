import {
  LayoutGrid,
  Cpu,
  Leaf,
  Archive,
  Wallet,
  Building2,
  Users2,
  Shield,
  Network,
  Tractor,
  History,
  LayoutTemplate,
  LucideIcon
} from "lucide-react";

export interface MenuSubItem {
  label: string;
  href: string;
}

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  href?: string;
  color: string;
  isCollapsible?: boolean;
  menuKey?: "akses" | "tesouroVerde" | "estoque";
  subItems?: MenuSubItem[];
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export const SIDEBAR_CONFIG: MenuGroup[] = [
  {
    label: "Visão Geral",
    items: [
      { icon: LayoutGrid, label: "Dashboard", href: "/dashboard", color: "text-emerald-500 group-hover:text-emerald-600" },
      { icon: LayoutTemplate, label: "Fluxos", href: "/fluxos", color: "text-violet-500 group-hover:text-violet-600" },
    ]
  },
  {
    label: "Plataformas",
    items: [
      {
        icon: Cpu,
        label: "Akses",
        color: "text-blue-500 group-hover:text-blue-600",
        isCollapsible: true,
        menuKey: "akses",
        subItems: [
          { label: "Pedidos Compra", href: "/pedidos?category=akses_compra" },
          { label: "Pedidos de Venda", href: "/pedidos?category=akses_venda" },
          { label: "Pedidos de Transferência", href: "/pedidos?category=akses_transferencia" },
          { label: "Pedidos de Certificado (Cli.)", href: "/pedidos?category=akses_cert_cliente" },
          { label: "Cert. Dist. Financeira", href: "/pedidos?category=akses_cert_distribuidor_financeiro" },
          { label: "Cert. Dist. Geral", href: "/pedidos?category=akses_cert_distribuidor_geral" },
          { label: "Cert. SaaS Tesouro Verde", href: "/pedidos?category=akses_cert_distribuidor_credenciado" },
          { label: "Cert. SaaS BMV (Living Carbon)", href: "/pedidos?category=akses_living_carbon" },
          { label: "Cert. CDE (Stock)", href: "/pedidos?category=akses_cde" },
          { label: "Intenção de Movimentação", href: "/pedidos?category=akses_intencao_movimentacao" },
        ]
      },
      {
        icon: Leaf,
        label: "Tesouro Verde",
        color: "text-emerald-500 group-hover:text-emerald-600",
        isCollapsible: true,
        menuKey: "tesouroVerde",
        subItems: [
          { label: "Pedidos Selo", href: "/pedidos?category=tv_pedidos_selo" },
          { label: "DARE / Royalties", href: "/pedidos?category=tv_dare_royalties" },
          { label: "Compensações", href: "/pedidos?category=tv_compensacao" },
          { label: "Programas / Campanhas", href: "/pedidos?category=tv_programas" },
        ]
      }
    ]
  },
  {
    label: "Gestão",
    items: [
      {
        icon: Archive,
        label: "Estoque",
        color: "text-indigo-500 group-hover:text-indigo-600",
        isCollapsible: true,
        menuKey: "estoque",
        subItems: [
          { label: "Dashboard", href: "/estoque/dashboard" },
          { label: "Safra", href: "/safras" },
          { label: "Abastecimento", href: "/abastecimento" },
          { label: "Config. Distribuição", href: "/config-distribuicao" },
          { label: "Movimentações", href: "/movimentacoes" },
          { label: "Transf. de Titularidade", href: "/transf-titularidade" },
          { label: "Ajustes entre Contas", href: "/ajustes-contas" },
          { label: "Bloqueio de UCS", href: "/bloqueio-ucs" },
          { label: "CPR Verde", href: "/cpr-verde" },
        ]
      },
      { icon: Wallet, label: "DARE / Royalties", href: "/dare-royalties", color: "text-emerald-500 group-hover:text-emerald-600" },
      { icon: Building2, label: "Parceiros (Legado)", href: "/parceiros", color: "text-blue-500 group-hover:text-blue-600" },
      { icon: Users2, label: "Usuários (Legado)", href: "/users", color: "text-indigo-500 group-hover:text-indigo-600" },
    ]
  },
  {
    label: "Operações Agro",
    items: [
      { icon: Users2, label: "Produtores", href: "/produtores", color: "text-orange-500 group-hover:text-orange-600" },
      { icon: Network, label: "Núcleos & Associações", href: "/nucleos", color: "text-rose-500 group-hover:text-rose-600" },
      { icon: Tractor, label: "Fazendas", href: "/fazendas", color: "text-amber-700 group-hover:text-amber-800" },
    ]
  },
  {
    label: "Tecnologia",
    items: [
      { icon: History, label: "Rastreabilidade", href: "/rastreabilidade", color: "text-indigo-500 group-hover:text-indigo-600" },
      { icon: Cpu, label: "IMEI", href: "/imei", color: "text-cyan-500 group-hover:text-cyan-600" },
    ]
  }
];
