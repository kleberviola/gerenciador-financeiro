import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  DollarSign, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  CircleDollarSign,
  ArrowDownRight,
  ArrowUpRight,
  PieChart as PieIcon,
  Sun,
  Moon,
  PiggyBank,
  ChartColumn
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
  Line
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

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

interface DadosMesContas {
  despesas: Despesa[];
  receitas: Receita[];
  investimentos?: Investimento[];
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

// Paleta de Cores Supabase (Cores vibrantes para o Dark e Light Mode)
const CATEGORY_COLORS: { [key: string]: string } = {
  'Moradia': '#3b82f6',      // Blue
  'Internet/Tel': '#38bdf8', // Sky Blue
  'Lazer': '#fbbf24',        // Amber
  'Streaming': '#f472b6',    // Pink
  'Carro': '#a78bfa',        // Violet
  'Empresa': '#2dd4bf',      // Teal
  'Saúde': '#f87171',        // Rose/Red
  'Cartão': '#3ecf8e',       // Supabase Green
  'Outros': '#a1a1aa',       // Zinc
  'Variados': '#c084fc',     // Purple
  'Vestuário': '#fb7185',    // Rose
  'Alimentação': '#10b981',   // Emerald
};

const BANK_COLORS: { [key: string]: { bg: string; text: string } } = {
  'Pagbank': { bg: '#fef3c7', text: '#b45309' },
  'C6': { bg: '#27272a', text: '#ffffff' },
  'C6 PJ': { bg: '#dbeafe', text: '#1e40af' },
  'Fabiana': { bg: '#fbcfe8', text: '#be185d' },
  'Inter': { bg: '#ffedd5', text: '#c2410c' },
  'Nubank': { bg: '#f3e8ff', text: '#6b21a8' },
  'Nubank Fabiana': { bg: '#8b5cf6', text: '#ffffff' },
  'PicPay': { bg: '#dcfce7', text: '#15803d' },
  'Picpay': { bg: '#dcfce7', text: '#15803d' },
  'Porto': { bg: '#1e3a8a', text: '#ffffff' },
  'Santander': { bg: '#fee2e2', text: '#b91c1c' },
  'Yago': { bg: '#10b981', text: '#ffffff' },
  'Mercado Pago': { bg: '#e0f2fe', text: '#0369a1' },
  'Mercadopago': { bg: '#e0f2fe', text: '#0369a1' }
};

const DEFAULT_COLORS = ['#3ecf8e', '#3b82f6', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#a1a1aa'];

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
          const currentMonthName = getMonthNamePtBR(new Date().getMonth());
          if (json.months.includes(currentMonthName)) {
            setSelectedMonth(currentMonthName);
          } else {
            setSelectedMonth(json.months[0]);
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
  const contasDoMes = data?.contas[selectedMonth] || { despesas: [], receitas: [], investimentos: [] };
  const cartoesDoMes = data?.cartoes[selectedMonth] || {};

  // Cálculos de KPIs
  const totalReceitas = contasDoMes.receitas.reduce((sum, item) => sum + item.valor, 0);
  const totalDespesasFixas = contasDoMes.despesas.reduce((sum, item) => sum + item.valor, 0);
  const totalInvestimentos = contasDoMes.investimentos?.reduce((sum, item) => sum + item.valor, 0) || 0;
  
  // Total Cartões
  let totalCartoes = 0;
  Object.values(cartoesDoMes).forEach(itens => {
    itens.forEach(item => {
      totalCartoes += item.valor;
    });
  });

  const saldoLiquido = totalReceitas - totalDespesasFixas;

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

  // Gráfico: Distribuição por Tipo de Despesa
  const despesasPorTipo: { [tipo: string]: number } = {};
  contasDoMes.despesas.forEach(item => {
    const tipo = item.tipo || 'Outros';
    despesasPorTipo[tipo] = (despesasPorTipo[tipo] || 0) + item.valor;
  });

  const pieChartData = Object.entries(despesasPorTipo).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  })).sort((a, b) => b.value - a.value);

  const topCategoryName = pieChartData[0]?.name || 'Nenhuma';

  // Gráfico: Histórico de Saldo (Meses Anteriores)
  const barChartData = data?.months.map(m => {
    const mesContas = data.contas[m] || { despesas: [], receitas: [] };

    const rec = mesContas.receitas.reduce((sum, item) => sum + item.valor, 0);
    const desp = mesContas.despesas.reduce((sum, item) => sum + item.valor, 0);

    return {
      name: m,
      Receitas: parseFloat(rec.toFixed(2)),
      Despesas: parseFloat(desp.toFixed(2))
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

  // Helper de Moeda
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
          <div className="brand-logo">
            <CircleDollarSign size={22} />
          </div>
          <div className="brand-title">
            <h1>Gestor Financeiro</h1>
            <p>Visão geral das suas planilhas financeiras</p>
          </div>
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

          {/* Botão de Chaveamento de Tema (Sun e Moon Lucide Icons) */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="btn-refresh"
            style={{ padding: '0.625rem', width: '2.5rem', height: '2.5rem', justifyContent: 'center' }}
            title="Alternar Tema"
          >
            {theme === 'dark' ? (
              <Sun size={16} style={{ color: '#fbbf24' }} />
            ) : (
              <Moon size={16} style={{ color: '#475569' }} />
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
        {/* Saldo Líquido - DESTAQUE SUPABASE */}
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
          <div className="kpi-value">
            {formatCurrency(saldoLiquido)}
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
          <div className="kpi-value" style={{ color: 'var(--success)' }}>
            {formatCurrency(totalReceitas)}
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
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>
            {formatCurrency(totalDespesasFixas)}
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
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>
            {formatCurrency(totalCartoes)}
          </div>
        </motion.div>

        {/* Investimentos */}
        {totalInvestimentos > 0 && (
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
            <div className="kpi-value" style={{ color: 'var(--info)' }}>
              {formatCurrency(totalInvestimentos)}
            </div>
            
            {/* Porcentagem que cresceu no mês */}
            {crescimentoInvestido !== 0 || totalInvestidoPrev > 0 ? (() => {
              const isPositive = crescimentoInvestido >= 0;
              return (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  fontSize: '0.725rem', 
                  fontWeight: 700, 
                  color: isPositive ? 'var(--success)' : 'var(--danger)',
                  marginTop: '0.25rem'
                }}>
                  {isPositive ? '↑' : '↓'} {isPositive ? '+' : ''}{crescimentoInvestido.toFixed(1)}% cresceu
                </div>
              );
            })() : null}
          </motion.div>
        )}
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
            Receitas vs Despesas Fixas (Evolução)
          </div>
          <div className="chart-container-inner">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderColor: 'var(--border-card)', 
                    borderRadius: '0.875rem',
                    boxShadow: 'var(--shadow-premium)',
                    color: 'var(--text-primary)'
                  }} 
                />
                <Bar dataKey="Receitas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Categoria Donut Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="premium-card chart-section"
        >
          <div className="chart-title">
            <PieIcon size={16} style={{ color: 'var(--primary)' }} />
            Categorias de Despesas Fixas
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
                        <span className="legend-row-percent">{Math.round((entry.value / totalDespesasFixas) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="update-badge" style={{ margin: 'auto' }}>Nenhuma despesa fixa lançada.</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Detalhamento das Contas (Micro-transitions ao mudar de mês) */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={selectedMonth}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="lists-grid"
        >
          {/* Tabela de Despesas */}
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
                            <th>Status</th>
                            <th>Banco</th>
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
                                <td>
                                  <span className={`badge ${isPaid ? 'badge-paid' : 'badge-pending'}`}>
                                    {isPaid ? (
                                      <><CheckCircle2 size={11} style={{ marginRight: 4 }} /> Pago</>
                                    ) : (
                                      <><AlertCircle size={11} style={{ marginRight: 4 }} /> Aberto</>
                                    )}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 500 }}>
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
                                          fontWeight: 700
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
                Receitas
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
          </div>
        </motion.div>
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
