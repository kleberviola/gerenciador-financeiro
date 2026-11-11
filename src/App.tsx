import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  DollarSign, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  PieChart as PieIcon,
  Sun,
  Moon,
  PiggyBank,
  ChartColumn,
  Receipt,
  Search
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Logo } from './components/Logo';

// Tipagem dos Dados
interface Despesa {
  vencimento: string | null;
  conta: string;
  tipo: string;
  valor: number;
  pago: number | null;
  dataPagamento: string | null;
  banco: string | null;
}

interface Receita {
  entrada: string | null;
  cliente: string;
  valor: number;
}

interface ItemCartao {
  parcela: string;
  estabelecimento: string;
  valor: number;
}

interface Investimento {
  banco: string;
  valor: number;
}

interface DespesaVariavel {
  dia: string | null;
  estabelecimento: string;
  valor: number;
  categoria: string;
}

interface DadosMesContas {
  despesas: Despesa[];
  receitas: Receita[];
  investimentos?: Investimento[];
  variaveis?: DespesaVariavel[];
}

interface DadosMesCartoes {
  [nomeCartao: string]: ItemCartao[];
}

interface ResponseData {
  success: boolean;
  months: string[];
  contas: { [mes: string]: DadosMesContas };
  cartoes: { [mes: string]: DadosMesCartoes };
  lastUpdated: string;
  source: string;
  message?: string;
}

// Paleta de Cores Oficial Monewell (Extraída diretamente da identidade visual)
const CATEGORY_COLORS: { [key: string]: string } = {
  'Moradia': '#287af8',      // Azul Oficial
  'Internet/Tel': '#1cadc0', // Ciano Oficial
  'Lazer': '#fdc51b',        // Amarelo Oficial
  'Streaming': '#b57edc',    // Lilás Oficial
  'Carro': '#7e4ca5',        // Roxo Oficial
  'Empresa': '#1dbdd2',      // Turquesa Oficial
  'Saúde': '#d60000',        // Vermelho Oficial
  'Cartão': '#96cd28',       // Verde Vibrante Oficial
  'Outros': '#a1a1aa',       // Neutro
  'Variados': '#7e4ca5',     // Roxo Oficial
  'Vestuário': '#ff2a2a',    // Vermelho Claro Oficial
  'Alimentação': '#96cd28',   // Verde Oficial
  'Comer fora': '#fdc51b',   // Amarelo Oficial
  'Pet': '#fd7b04',          // Laranja Oficial
  'Dízimo': '#b57edc',       // Lilás Oficial
  'Fiorino': '#4aa2f6',      // Azul Céu Oficial
};

const BANK_COLORS: { [key: string]: { bg: string; text: string } } = {
  'Pagbank': { bg: '#feec9a', text: '#fd7b04' },
  'C6': { bg: '#253505', text: '#b3ed77' },
  'C6 PJ': { bg: '#9fdffa', text: '#287af8' },
  'Fabiana': { bg: '#dbb5ee', text: '#7e4ca5' },
  'Inter': { bg: '#ffcf91', text: '#fd7b04' },
  'Nubank': { bg: '#dbb5ee', text: '#7e4ca5' },
  'Nubank Fabiana': { bg: '#7e4ca5', text: '#ffffff' },
  'PicPay': { bg: '#b3ed77', text: '#253505' },
  'Picpay': { bg: '#b3ed77', text: '#253505' },
  'Porto': { bg: '#287af8', text: '#ffffff' },
  'Santander': { bg: '#f8c6c5', text: '#d60000' },
  'Yago': { bg: '#96cd28', text: '#253505' },
  'Mercado Pago': { bg: '#83dfea', text: '#1cadc0' },
  'Mercadopago': { bg: '#83dfea', text: '#1cadc0' }
};

const DEFAULT_COLORS = [
  '#96cd28', // Verde Vibrante da Paleta
  '#287af8', // Azul da Paleta
  '#fd7b04', // Laranja da Paleta
  '#7e4ca5', // Roxo da Paleta
  '#1cadc0', // Ciano da Paleta
  '#fdc51b', // Amarelo da Paleta
  '#d60000', // Vermelho da Paleta
  '#4aa2f6', // Azul Céu da Paleta
  '#b57edc', // Lilás da Paleta
  '#1dbdd2', // Turquesa da Paleta
];

// Variantes de Animação do Framer Motion
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } }
};

export default function App() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pagos' | 'abertos'>('todos');
  const [categoryView, setCategoryView] = useState<'fixas' | 'variaveis' | 'geral'>('geral');
  const [searchVariavel, setSearchVariavel] = useState<string>('');
  
  // Controle de Tema (Supabase Dark / Light) com persistência
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('gestor-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Atualiza classe do body nativamente
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('gestor-theme', next);
      return next;
    });
  };

  const fetchData = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const url = refresh ? '/api/financial-data?refresh=true' : '/api/financial-data';
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status}`);
      }
      
      const json: ResponseData = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Erro desconhecido');
      }

      setData(json);
      setError(null);
      
      if (json.months.length > 0) {
        if (!selectedMonth || !json.months.includes(selectedMonth)) {
          // Prioriza o mês atual ou o mês mais recente ativo (ex: Novembro)
          const currentMonthName = getMonthNamePtBR(new Date().getMonth());
          if (json.months.includes(currentMonthName)) {
            setSelectedMonth(currentMonthName);
          } else if (json.months.includes('Novembro')) {
            setSelectedMonth('Novembro');
          } else {
            setSelectedMonth(json.months[json.months.length - 1]);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao conectar à API do Gestor Financeiro.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getMonthNamePtBR = (monthIndex: number): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex];
  };

  const handleRefreshClick = () => {
    fetchData(true);
  };

  // Lógica de processamento
  const contasDoMes = data?.contas[selectedMonth] || { despesas: [], receitas: [], investimentos: [], variaveis: [] };
  const cartoesDoMes = data?.cartoes[selectedMonth] || {};

  // Cálculos de KPIs
  const totalReceitas = contasDoMes.receitas.reduce((sum, item) => sum + item.valor, 0);
  const totalDespesasFixas = contasDoMes.despesas.reduce((sum, item) => sum + item.valor, 0);
  const totalDespesasVariaveis = contasDoMes.variaveis?.reduce((sum, item) => sum + item.valor, 0) || 0;
  const totalInvestimentos = contasDoMes.investimentos?.reduce((sum, item) => sum + item.valor, 0) || 0;
  
  // Total Cartões
  let totalCartoes = 0;
  Object.values(cartoesDoMes).forEach(itens => {
    itens.forEach(item => {
      totalCartoes += item.valor;
    });
  });

  // Saldo Líquido do mês deduzindo despesas fixas e variáveis (conforme alinhado e conforme aba Resumo da planilha)
  const saldoLiquido = totalReceitas - totalDespesasFixas - totalDespesasVariaveis;

  // Cálculo de crescimento de investimentos em relação ao mês anterior
  const mesesLista = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const cleanSelectedMonth = selectedMonth.trim().split(' ')[0];
  const selectedMonthIdx = mesesLista.findIndex(m => m.toLowerCase() === cleanSelectedMonth.toLowerCase());
  
  let totalInvestidoPrev = 0;
  if (selectedMonthIdx > 0) {
    const prevMonthName = mesesLista[selectedMonthIdx - 1];
    const prevMesKey = data?.months.find(month => month.trim().toLowerCase().startsWith(prevMonthName.toLowerCase())) || '';
    const prevMonthContas = prevMesKey ? (data?.contas[prevMesKey] || { investimentos: [] }) : { investimentos: [] };
    totalInvestidoPrev = prevMonthContas.investimentos?.reduce((sum: number, item: any) => sum + item.valor, 0) || 0;
  }
  
  let crescimentoInvestido = 0;
  if (totalInvestidoPrev > 0) {
    crescimentoInvestido = ((totalInvestimentos - totalInvestidoPrev) / totalInvestidoPrev) * 100;
  } else if (totalInvestimentos > 0 && totalInvestidoPrev === 0) {
    crescimentoInvestido = 100;
  }

  // Gráfico: Distribuição por Categoria (Alternável entre Fixas, Variáveis e Geral)
  const despesasPorCategoria: { [cat: string]: number } = {};
  
  if (categoryView === 'fixas' || categoryView === 'geral') {
    contasDoMes.despesas.forEach(item => {
      const tipo = item.tipo || 'Outros';
      despesasPorCategoria[tipo] = (despesasPorCategoria[tipo] || 0) + item.valor;
    });
  }
  if (categoryView === 'variaveis' || categoryView === 'geral') {
    contasDoMes.variaveis?.forEach(item => {
      const cat = item.categoria || 'Outros';
      despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + item.valor;
    });
  }

  const pieChartData = Object.entries(despesasPorCategoria).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  })).sort((a, b) => b.value - a.value);

  const topCategoryName = pieChartData[0]?.name || 'Nenhuma';
  const totalBaseCategorias = pieChartData.reduce((s, x) => s + x.value, 0);

  // Gráfico: Histórico de Saldo (Meses Anteriores com Fixas e Variáveis)
  const barChartData = data?.months.map(m => {
    const mesContas = data.contas[m] || { despesas: [], receitas: [], variaveis: [] };

    const rec = mesContas.receitas.reduce((sum, item) => sum + item.valor, 0);
    const despFixas = mesContas.despesas.reduce((sum, item) => sum + item.valor, 0);
    const despVar = mesContas.variaveis?.reduce((sum, item) => sum + item.valor, 0) || 0;

    return {
      name: m,
      Receitas: parseFloat(rec.toFixed(2)),
      'Despesas Fixas': parseFloat(despFixas.toFixed(2)),
      'Despesas Variáveis': parseFloat(despVar.toFixed(2))
    };
  }) || [];

  // Gráfico: Histórico de Investimentos (Evolução de Janeiro a Dezembro de 2026)
  const lineChartInvestimentos = mesesLista.map(m => {
    const mesKey = data?.months.find(month => month.trim().toLowerCase().startsWith(m.toLowerCase())) || '';
    const mesContas = mesKey ? (data?.contas[mesKey] || { investimentos: [] }) : { investimentos: [] };
    const inv = mesContas.investimentos?.reduce((sum: number, item: any) => sum + item.valor, 0) || 0;
    
    return {
      name: m,
      'Total Investido': parseFloat(inv.toFixed(2))
    };
  });

  // Filtragem de Despesas Variáveis por busca
  const variaveisFiltradas = (contasDoMes.variaveis || []).filter(item => {
    if (!searchVariavel.trim()) return true;
    const term = searchVariavel.toLowerCase();
    return item.estabelecimento.toLowerCase().includes(term) || item.categoria.toLowerCase().includes(term);
  });

  // Helper de Moeda com espaço inquebrável para evitar quebras de linha
  const formatCurrency = (val: number) => {
    if (val < 0) {
      return `-R$\u00A0${Math.abs(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `R$\u00A0${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper de Data formatada para exibição pt-BR
  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="loading-spinner"
        ></motion.div>
        <div className="loading-text">Buscando informações do seu painel financeiro...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-container">
          <div className="error-title">Ops! Ocorreu um erro</div>
          <div className="error-desc">{error}</div>
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-refresh" 
            onClick={() => fetchData()}
          >
            <RefreshCw size={16} /> Tentar Novamente
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="container"
    >
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <Logo height={38} className="brand-logo-img" />
          <p className="brand-subtitle">
            Visão integrada de despesas fixas, variáveis, receitas e cartões
          </p>
        </div>
        
        <div className="actions-section">
          <div className="text-right">
            <div className="update-badge">
              Atualizado em: {data ? new Date(data.lastUpdated).toLocaleString('pt-BR') : '-'}
            </div>
            <div className="update-badge">
              Fonte: {data?.source === 'google_sheets' ? 'Google Sheets Sync' : 'Cache Local'}
            </div>
          </div>

          {/* Botão de Chaveamento de Tema com Alto Contraste */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title="Alternar Tema"
          >
            {theme === 'dark' ? (
              <Sun size={17} className="sun-icon" />
            ) : (
              <Moon size={17} className="moon-icon" />
            )}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-refresh" 
            onClick={handleRefreshClick}
            disabled={refreshing}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={refreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
              style={{ display: 'flex' }}
            >
              <RefreshCw size={15} />
            </motion.div>
            {refreshing ? 'Sincronizando...' : 'Atualizar Dados'}
          </motion.button>
        </div>
      </header>

      {/* Seletor de Meses */}
      <div className="months-selector">
        {data?.months.map(m => (
          <motion.button
            key={m}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            className={`month-tab ${selectedMonth === m ? 'active' : ''}`}
            onClick={() => setSelectedMonth(m)}
          >
            {m}
          </motion.button>
        ))}
      </div>

      {/* KPI Cards (Staggered Animation) */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="kpis-grid"
      >
        {/* Saldo Líquido - DESTAQUE NO VERDE LIMÃO DA REFERÊNCIA */}
        <motion.div 
          variants={fadeUpItem}
          whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}
          className="premium-card kpi-card kpi-saldo-destaque"
        >
          <div className="kpi-header">
            <span>Saldo Líquido</span>
            <div className="kpi-icon-wrapper">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <div className="kpi-value" style={{ whiteSpace: 'nowrap' }}>
              {formatCurrency(saldoLiquido)}
            </div>
            <div className="kpi-pill">
              {saldoLiquido >= 0 ? '↑ Saldo positivo' : '↓ Saldo negativo'}
            </div>
          </div>
        </motion.div>

        {/* Receitas */}
        <motion.div 
          variants={fadeUpItem}
          whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
          className="premium-card kpi-card kpi-receitas"
        >
          <div className="kpi-header">
            <span>Receitas do Mês</span>
            <div className="kpi-icon-wrapper">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <div className="kpi-value" style={{ color: 'var(--success)' }}>
              {formatCurrency(totalReceitas)}
            </div>
            <div className="kpi-pill" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              ↑ Entradas confirmadas
            </div>
          </div>
        </motion.div>

        {/* Despesas Fixas */}
        <motion.div 
          variants={fadeUpItem}
          whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
          className="premium-card kpi-card kpi-despesas"
        >
          <div className="kpi-header">
            <span>Despesas Fixas</span>
            <div className="kpi-icon-wrapper">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <div className="kpi-value" style={{ color: 'var(--danger)' }}>
              {formatCurrency(totalDespesasFixas)}
            </div>
            <div className="kpi-pill" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
              ↓ Contas obrigatórias
            </div>
          </div>
        </motion.div>

        {/* NOVO: Despesas Variáveis */}
        <motion.div 
          variants={fadeUpItem}
          whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
          className="premium-card kpi-card kpi-variaveis"
        >
          <div className="kpi-header">
            <span>Despesas Variáveis</span>
            <div className="kpi-icon-wrapper">
              <Receipt size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <div className="kpi-value">
              {formatCurrency(totalDespesasVariaveis)}
            </div>
            <div className="kpi-pill" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
              {contasDoMes.variaveis && contasDoMes.variaveis.length > 0 ? `${contasDoMes.variaveis.length} lançamentos` : 'Nenhum lançamento'}
            </div>
          </div>
        </motion.div>

        {/* Cartões */}
        <motion.div 
          variants={fadeUpItem}
          whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
          className="premium-card kpi-card kpi-cartoes"
        >
          <div className="kpi-header">
            <span>Gastos do Cartão</span>
            <div className="kpi-icon-wrapper">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <div className="kpi-value" style={{ color: 'var(--purple)' }}>
              {formatCurrency(totalCartoes)}
            </div>
            <div className="kpi-pill" style={{ backgroundColor: 'var(--purple-soft)', color: 'var(--purple)' }}>
              Faturas a vencer
            </div>
          </div>
        </motion.div>

        {/* Investimentos */}
        <motion.div 
          variants={fadeUpItem}
          whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}
          className="premium-card kpi-card kpi-investimentos"
        >
          <div className="kpi-header">
            <span>Investido</span>
            <div className="kpi-icon-wrapper">
              <PiggyBank size={16} />
            </div>
          </div>
          <div className="kpi-body">
            <div className="kpi-value" style={{ color: 'var(--info)' }}>
              {formatCurrency(totalInvestimentos)}
            </div>
            {crescimentoInvestido !== 0 || totalInvestidoPrev > 0 ? (() => {
              const isPositive = crescimentoInvestido >= 0;
              return (
                <div className="kpi-pill" style={{ 
                  backgroundColor: isPositive ? 'var(--success-light)' : 'var(--danger-light)', 
                  color: isPositive ? 'var(--success)' : 'var(--danger)' 
                }}>
                  {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{crescimentoInvestido.toFixed(1)}% cresceu
                </div>
              );
            })() : (
              <div className="kpi-pill" style={{ backgroundColor: 'var(--info-light)', color: 'var(--info)' }}>
                Aplicações do mês
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Dashboard Charts */}
      <div className="dashboard-grid">
        {/* Histórico Mensal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="premium-card chart-section"
        >
          <div className="chart-title">
            <ChartColumn size={16} style={{ color: 'var(--primary)' }} />
            Receitas vs Despesas (Fixas e Variáveis)
          </div>
          <div className="chart-container-inner">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--text-secondary)" 
                  fontSize={11} 
                  tickLine={false}
                  interval={0}
                  tickFormatter={(val: string) => val.trim().slice(0, 3)}
                />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                <Tooltip 
                  formatter={(val: any) => formatCurrency(Number(val || 0))}
                  labelFormatter={(label: any) => `Mês: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderColor: 'var(--border-card)', 
                    borderRadius: '0.875rem',
                    boxShadow: 'var(--shadow-premium)',
                    color: 'var(--text-primary)'
                  }} 
                />
                <Legend 
                  wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }} 
                  iconType="circle"
                />
                {/* Tons Pastéis Conforme Imagem de Referência */}
                <Bar dataKey="Receitas" fill="#b3ed77" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas Fixas" fill="#ff797a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas Variáveis" fill="#ffcf91" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Categoria Donut Chart com Seletor Fixas / Variáveis / Geral */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="premium-card chart-section"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="chart-title" style={{ margin: 0 }}>
              <PieIcon size={16} style={{ color: 'var(--primary)' }} />
              Categorias de Gastos
            </div>
            
            {/* Seletor de Categoria */}
            <div style={{ 
              display: 'flex', 
              gap: '2px', 
              background: 'var(--bg-card-hover)', 
              padding: '2px', 
              borderRadius: '0.5rem', 
              border: '1px solid var(--border-card)' 
            }}>
              <button 
                onClick={() => setCategoryView('geral')} 
                style={{ 
                  background: categoryView === 'geral' ? 'var(--bg-card)' : 'transparent',
                  color: categoryView === 'geral' ? 'var(--primary)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Geral
              </button>
              <button 
                onClick={() => setCategoryView('fixas')} 
                style={{ 
                  background: categoryView === 'fixas' ? 'var(--bg-card)' : 'transparent',
                  color: categoryView === 'fixas' ? 'var(--danger)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Fixas
              </button>
              <button 
                onClick={() => setCategoryView('variaveis')} 
                style={{ 
                  background: categoryView === 'variaveis' ? 'var(--bg-card)' : 'transparent',
                  color: categoryView === 'variaveis' ? 'var(--warning)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Variáveis
              </button>
            </div>
          </div>

          <div className="chart-container-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieChartData.length > 0 ? (
              <div className="chart-container-horizontal">
                {/* Donut Chart com Texto Centralizado */}
                <div className="chart-wrapper-donut">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CATEGORY_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(Number(value || 0))}
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-card)', 
                          borderColor: 'var(--border-card)', 
                          borderRadius: '0.875rem',
                          boxShadow: 'var(--shadow-premium)',
                          color: 'var(--text-primary)'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Texto Centralizado no Donut (Categoria Principal) */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    width: '110px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ 
                      fontSize: '0.625rem', 
                      color: 'var(--text-secondary)', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em' 
                    }}>
                      Maior Gasto
                    </span>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 800, 
                      color: 'var(--text-primary)', 
                      marginTop: '0.125rem',
                      lineHeight: '1.2',
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {topCategoryName}
                    </span>
                  </div>
                </div>

                {/* Legendas Tabulares à Direita (Idêntico ao FINAI) */}
                <div className="chart-legend-horizontal">
                  {pieChartData.slice(0, 6).map((entry, index) => (
                    <div key={entry.name} className="legend-row-item">
                      <div className="legend-row-left">
                        <div 
                          className="legend-color-dot" 
                          style={{ backgroundColor: CATEGORY_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                        ></div>
                        <span className="legend-row-name">{entry.name}</span>
                      </div>
                      <div className="legend-row-right">
                        <span className="legend-row-value">{formatCurrency(entry.value)}</span>
                        <span className="legend-row-percent">
                          {totalBaseCategorias > 0 ? Math.round((entry.value / totalBaseCategorias) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="update-badge" style={{ margin: 'auto' }}>Nenhuma despesa para esta visualização.</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Detalhamento das Contas: Fixas e Receitas */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={selectedMonth}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="lists-grid"
        >
          {/* Tabela de Despesas Fixas */}
          <div className="premium-card">
            {(() => {
              const despesasFiltradas = contasDoMes.despesas.filter(item => {
                const isPaid = item.pago !== null && item.pago >= item.valor;
                if (statusFilter === 'pagos') return isPaid;
                if (statusFilter === 'abertos') return !isPaid;
                return true;
              });

              const despesasPagas = contasDoMes.despesas.reduce((sum, item) => {
                const isPaid = item.pago !== null && item.pago >= item.valor;
                return sum + (isPaid ? item.valor : 0);
              }, 0);

              const despesasFalta = contasDoMes.despesas.reduce((sum, item) => {
                const isPaid = item.pago !== null && item.pago >= item.valor;
                return sum + (isPaid ? 0 : item.valor);
              }, 0);

              return (
                <>
                  <div className="table-header-row">
                    <div className="table-title">
                      <ArrowUpRight size={16} style={{ color: 'var(--danger)' }} />
                      Despesas Fixas
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Filtro de Status Segmentado */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '2px', 
                        background: 'var(--bg-card-hover)', 
                        padding: '2px', 
                        borderRadius: '0.5rem', 
                        border: '1px solid var(--border-card)' 
                      }}>
                        <button 
                          onClick={() => setStatusFilter('todos')} 
                          style={{ 
                            background: statusFilter === 'todos' ? 'var(--bg-card)' : 'transparent',
                            color: statusFilter === 'todos' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            border: 'none',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          Todas
                        </button>
                        <button 
                          onClick={() => setStatusFilter('pagos')} 
                          style={{ 
                            background: statusFilter === 'pagos' ? 'var(--bg-card)' : 'transparent',
                            color: statusFilter === 'pagos' ? 'var(--success)' : 'var(--text-secondary)',
                            border: 'none',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          Pagas
                        </button>
                        <button 
                          onClick={() => setStatusFilter('abertos')} 
                          style={{ 
                            background: statusFilter === 'abertos' ? 'var(--bg-card)' : 'transparent',
                            color: statusFilter === 'abertos' ? 'var(--danger)' : 'var(--text-secondary)',
                            border: 'none',
                            padding: '0.25rem 0.625rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)'
                          }}
                        >
                          Abertas
                        </button>
                      </div>
                      <div className="update-badge">{despesasFiltradas.length} itens</div>
                    </div>
                  </div>
                  
                  <div className="table-container">
                    {despesasFiltradas.length > 0 ? (
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Vencimento</th>
                            <th>Conta</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Banco</th>
                          </tr>
                        </thead>
                        <tbody>
                          {despesasFiltradas.map((item, idx) => {
                            const isPaid = item.pago !== null && item.pago >= item.valor;
                            return (
                              <tr key={idx}>
                                <td>{formatDisplayDate(item.vencimento)}</td>
                                <td style={{ fontWeight: 600 }}>{item.conta}</td>
                                <td>
                                  {(() => {
                                    const color = CATEGORY_COLORS[item.tipo] || '#a1a1aa';
                                    return (
                                      <span 
                                        className="badge badge-category"
                                        style={{ 
                                          backgroundColor: `${color}18`, 
                                          color: color, 
                                          borderColor: `${color}30`,
                                          borderWidth: '1px',
                                          borderStyle: 'solid'
                                        }}
                                      >
                                        {item.tipo}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td style={{ fontWeight: 700 }}>{formatCurrency(item.valor)}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  <span className={`badge ${isPaid ? 'badge-paid' : 'badge-pending'}`}>
                                    {isPaid ? (
                                      <><CheckCircle2 size={11} style={{ marginRight: 4 }} /> Pago</>
                                    ) : (
                                      <><AlertCircle size={11} style={{ marginRight: 4 }} /> Aberto</>
                                    )}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                                  {item.banco ? (() => {
                                    const bankName = item.banco.trim();
                                    const colors = BANK_COLORS[bankName] || BANK_COLORS[bankName.replace(/\s+/g, '')] || { bg: 'var(--bg-card-hover)', text: 'var(--text-secondary)' };
                                    return (
                                      <span 
                                        className="badge" 
                                        style={{ 
                                          backgroundColor: colors.bg, 
                                          color: colors.text,
                                          border: '1px solid rgba(0,0,0,0.03)',
                                          fontWeight: 700,
                                          whiteSpace: 'nowrap'
                                        }}
                                      >
                                        {bankName}
                                      </span>
                                    );
                                  })() : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="update-badge" style={{ padding: '2rem 0', textAlign: 'center' }}>
                        Nenhuma despesa para o filtro selecionado.
                      </div>
                    )}
                  </div>

                  {/* Resumo Financeiro de Despesas do Mês */}
                  {contasDoMes.despesas.length > 0 && (
                    <div style={{
                      marginTop: '1.25rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-card)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      fontSize: '0.825rem'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total do Mês: </span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(totalDespesasFixas)}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pago: </span>
                          <strong style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(despesasPagas)}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Falta: </span>
                          <strong style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatCurrency(despesasFalta)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Tabela de Receitas */}
          <div className="premium-card">
            <div className="table-header-row">
              <div className="table-title">
                <ArrowDownRight size={16} style={{ color: 'var(--success)' }} />
                Receitas do Mês
              </div>
              <div className="update-badge">{contasDoMes.receitas.length} itens</div>
            </div>

            <div className="table-container">
              {contasDoMes.receitas.length > 0 ? (
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Entrada</th>
                      <th>Cliente / Descrição</th>
                      <th className="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contasDoMes.receitas.map((item, idx) => (
                      <tr key={idx}>
                        <td>{formatDisplayDate(item.entrada)}</td>
                        <td style={{ fontWeight: 600 }}>{item.cliente}</td>
                        <td className="text-right" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {formatCurrency(item.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="update-badge" style={{ padding: '2rem 0', textAlign: 'center' }}>Nenhuma receita encontrada.</div>
              )}
            </div>

            {contasDoMes.receitas.length > 0 && (
              <div style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-card)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.825rem'
              }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Receitas:</span>
                <strong style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatCurrency(totalReceitas)}</strong>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* NOVO: Seção de Despesas Variáveis do Mês */}
      <AnimatePresence mode="wait">
        {contasDoMes.variaveis && contasDoMes.variaveis.length > 0 && (
          <motion.div 
            key={`var-${selectedMonth}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="premium-card" 
            style={{ marginTop: '2rem' }}
          >
            <div className="table-header-row">
              <div className="table-title">
                <Receipt size={16} style={{ color: 'var(--warning)' }} />
                Despesas Variáveis (Dia a Dia)
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Campo de Busca Rápida */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '0.5rem',
                  padding: '0.25rem 0.625rem',
                  fontSize: '0.75rem'
                }}>
                  <Search size={13} style={{ color: 'var(--text-secondary)' }} />
                  <input 
                    type="text"
                    placeholder="Filtrar lançamento..."
                    value={searchVariavel}
                    onChange={(e) => setSearchVariavel(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontSize: '0.75rem',
                      width: '130px'
                    }}
                  />
                </div>
                <div className="update-badge">{variaveisFiltradas.length} itens</div>
              </div>
            </div>

            <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Estabelecimento</th>
                    <th>Categoria</th>
                    <th className="text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {variaveisFiltradas.map((item, idx) => {
                    const color = CATEGORY_COLORS[item.categoria] || '#f97316';
                    return (
                      <tr key={idx}>
                        <td>{formatDisplayDate(item.dia)}</td>
                        <td style={{ fontWeight: 600 }}>{item.estabelecimento}</td>
                        <td>
                          <span 
                            className="badge badge-category"
                            style={{ 
                              backgroundColor: `${color}18`, 
                              color: color, 
                              borderColor: `${color}30`,
                              borderWidth: '1px',
                              borderStyle: 'solid'
                            }}
                          >
                            {item.categoria}
                          </span>
                        </td>
                        <td className="text-right" style={{ fontWeight: 700, color: 'var(--warning)' }}>
                          {formatCurrency(item.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé das Variáveis com Total e Resumo por Categoria */}
            <div style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-card)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.825rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total de Variáveis: </span>
                <strong style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '0.95rem' }}>{formatCurrency(totalDespesasVariaveis)}</strong>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(() => {
                  const agrupado: { [c: string]: number } = {};
                  contasDoMes.variaveis.forEach(v => {
                    agrupado[v.categoria] = (agrupado[v.categoria] || 0) + v.valor;
                  });
                  return Object.entries(agrupado)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([cat, val]) => (
                      <div 
                        key={cat} 
                        style={{
                          background: 'var(--bg-card-hover)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.375rem',
                          fontSize: '0.725rem',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-card)'
                        }}
                      >
                        <strong style={{ color: CATEGORY_COLORS[cat] || 'var(--text-primary)' }}>{cat}:</strong> {formatCurrency(val)}
                      </div>
                    ));
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabela de Investimentos (se houver no mês) */}
      <AnimatePresence mode="wait">
        {contasDoMes.investimentos && contasDoMes.investimentos.length > 0 && (
          <motion.div 
            key={`inv-${selectedMonth}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="premium-card" 
            style={{ marginTop: '2rem', marginBottom: '2rem' }}
          >
            <div className="table-header-row">
              <div className="table-title">
                <PiggyBank size={16} style={{ color: 'var(--info)' }} />
                Investimentos Realizados (Evolução)
              </div>
              <div className="update-badge">{contasDoMes.investimentos.length} aplicações</div>
            </div>
            
            <div className="chart-container-horizontal" style={{ marginTop: '1.25rem' }}>
              {/* Coluna da esquerda: Tabela de Investimentos */}
              <div className="chart-details-panel" style={{ flex: 1.1 }}>
                <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Banco / Origem</th>
                        <th className="text-right">Valor Aplicado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contasDoMes.investimentos.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{item.banco}</td>
                          <td className="text-right" style={{ fontWeight: 700, color: 'var(--info)' }}>
                            {formatCurrency(item.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total e Porcentagem de Crescimento embaixo da tabela */}
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total no Mês: </span>
                    <strong style={{ color: 'var(--info)', fontWeight: 700 }}>{formatCurrency(totalInvestimentos)}</strong>
                  </div>
                  {crescimentoInvestido !== 0 || totalInvestidoPrev > 0 ? (() => {
                    const isPositive = crescimentoInvestido >= 0;
                    return (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: isPositive ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{crescimentoInvestido.toFixed(1)}% cresceu
                      </div>
                    );
                  })() : null}
                </div>
              </div>

              {/* Coluna da direita: Gráfico de Linha de Evolução Mensal com altura fixa para evitar colapso */}
              <div className="chart-visual-panel" style={{ flex: 1.9, minHeight: '220px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  Histórico de Aplicações
                </div>
                <div style={{ width: '100%', height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartInvestimentos} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-card)', 
                          borderColor: 'var(--border-card)', 
                          borderRadius: '0.75rem', 
                          fontSize: '0.825rem',
                          color: 'var(--text-primary)',
                          boxShadow: 'var(--shadow-premium)'
                        }} 
                        formatter={(val: any) => [formatCurrency(Number(val || 0)), 'Total Investido']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Total Investido" 
                        stroke="var(--info)" 
                        strokeWidth={3} 
                        dot={{ r: 4, stroke: 'var(--info)', strokeWidth: 2, fill: 'var(--bg-card)' }}
                        activeDot={{ r: 6 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cartões de Crédito Detalhamento */}
      <motion.h2 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ fontSize: '1.25rem', fontWeight: 855, margin: '2.5rem 0 1.25rem 0', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
      >
        Fatura dos Cartões de Crédito
      </motion.h2>

      <AnimatePresence mode="wait">
        <motion.div 
          key={`cards-${selectedMonth}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="cards-layout"
        >
          {Object.keys(cartoesDoMes).length > 0 ? (
            Object.entries(cartoesDoMes).map(([cardName, itens]) => {
              const cardTotal = itens.reduce((sum, item) => sum + item.valor, 0);
              return (
                <motion.div 
                  key={cardName} 
                  whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}
                  className="credit-card-widget"
                >
                  <div className="card-widget-header">
                    <div>
                      <span className="card-widget-total-label">Fatura de {selectedMonth}</span>
                      <div className="card-widget-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                        {cardName}
                        <span className="badge" style={{ 
                          backgroundColor: 'var(--primary-light)', 
                          color: 'var(--primary)', 
                          fontSize: '0.625rem', 
                          padding: '0.15rem 0.4rem', 
                          borderRadius: '0.375rem', 
                          fontWeight: 700,
                          border: '1px solid rgba(62, 207, 142, 0.15)'
                        }}>
                          Crédito
                        </span>
                      </div>
                    </div>
                    <div style={{ color: 'var(--primary)', opacity: 0.9 }}>
                      <CreditCard size={18} />
                    </div>
                  </div>
                  
                  <div>
                    <span className="card-widget-total-label">Total Gasto</span>
                    <div className="card-widget-total-value" style={{ color: 'var(--primary)' }}>{formatCurrency(cardTotal)}</div>
                  </div>

                  <div className="card-transactions-list">
                    {itens.length > 0 ? (
                      itens.map((trans, tIdx) => (
                        <div key={tIdx} className="transaction-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            {/* Tracinho vertical verde na esquerda (referência de checks do Supabase) */}
                            <div style={{ 
                              width: '3px', 
                              height: '1.25rem', 
                              backgroundColor: 'var(--primary)', 
                              borderRadius: '2px',
                              opacity: 0.8
                            }}></div>
                            <div className="trans-desc">
                              <span className="trans-title">{trans.estabelecimento}</span>
                              <span className="trans-sub">
                                {trans.parcela ? `Parcela: ${trans.parcela}` : 'À vista'}
                              </span>
                            </div>
                          </div>
                          <span className="trans-value">{formatCurrency(trans.valor)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="update-badge" style={{ paddingTop: '1rem' }}>Sem transações registradas.</div>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="premium-card w-full" style={{ textAlign: 'center', padding: '2rem' }}>
              <span className="update-badge">Nenhum cartão lançado na aba {selectedMonth}.</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
