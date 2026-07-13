import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const CONTAS_URL = "https://docs.google.com/spreadsheets/d/1WbTHAhdBN5PkyAkZUm6R8p8PxuDZ8V2VtGiCyUpR3RU/export?format=xlsx";
const CARTOES_URL = "https://docs.google.com/spreadsheets/d/1eLn_SZzyLPhg5dA5Ui58AxwTiyB4b9fGYkmbTq-yAds/export?format=xlsx";

// Usando o diretório temporário do SO para evitar erros de escrita em ambientes Serverless (como Vercel)
const CONTAS_PATH = path.join(os.tmpdir(), 'contas_2026.xlsx');
const CARTOES_PATH = path.join(os.tmpdir(), 'cartoes_2026.xlsx');

// Função auxiliar para download
async function downloadFile(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Falha ao baixar da URL: ${url} (Status: ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.writeFile(destPath, buffer);
}

// Helpers de formatação
function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    // Converter número serial do Excel para data
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return str.split('T')[0];
  }
  if (str.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  return str;
}

function parseNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function isTotalRow(val) {
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return str === 'total' || str === 'falta' || str === 'subtotal' || str === 'saldo' || str === 'total receitas' || str === 'total receita';
}

// Parser de Contas
function processContasFile() {
  if (!fs.existsSync(CONTAS_PATH)) {
    throw new Error("Arquivo de contas não encontrado localmente.");
  }
  
  const workbook = xlsx.readFile(CONTAS_PATH, { cellDates: true });
  const dataByMonth = {};

  workbook.SheetNames.forEach(sheetName => {
    const cleanName = sheetName.trim().toLowerCase();
    // Pular legendas e rascunhos
    if (cleanName.includes('rascunho') || cleanName.includes('legenda')) {
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    const despesas = [];
    const receitas = [];
    const investimentos = [];

    // Ignora linha 0 (títulos) e linha 1 (cabeçalhos)
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      // Despesas (Colunas 0-6: VENCIMENTO, CONTA, TIPO, VALOR, PAGO, DATA, BANCO)
      const vencimento = row[0];
      const conta = row[1];
      const tipo = row[2];
      const valorDespesa = row[3];
      const pago = row[4];
      const dataPagamento = row[5];
      const banco = row[6];

      const numValorDespesa = parseNumber(valorDespesa);
      if (conta !== null && conta !== undefined && String(conta).trim() !== '' && numValorDespesa > 0) {
        const contaStr = String(conta).trim();
        const contaLower = contaStr.toLowerCase();
        
        if (contaLower !== 'conta' && !isTotalRow(conta) && !isTotalRow(vencimento)) {
          despesas.push({
            vencimento: parseDate(vencimento),
            conta: contaStr,
            tipo: tipo ? String(tipo).trim() : 'Outros',
            valor: numValorDespesa,
            pago: pago !== null && pago !== undefined ? parseNumber(pago) : null,
            dataPagamento: parseDate(dataPagamento),
            banco: banco ? String(banco).trim() : null
          });
        }
      }

      // Receitas (Colunas 8-10: ENTRADA, CLIENTE, VALOR)
      const entrada = row[8];
      const cliente = row[9];
      const valorReceita = row[10];

      const numValorReceita = parseNumber(valorReceita);
      if (cliente !== null && cliente !== undefined && String(cliente).trim() !== '' && numValorReceita > 0) {
        const clienteStr = String(cliente).trim();
        const clienteLower = clienteStr.toLowerCase();

        if (clienteLower !== 'cliente' && !isTotalRow(cliente) && !isTotalRow(entrada)) {
          receitas.push({
            entrada: parseDate(entrada),
            cliente: clienteStr,
            valor: numValorReceita
          });
        }
      }

      // Investimentos (Colunas 12-13: BANCO, VALOR)
      const invBanco = row[12];
      const invValor = row[13];

      if (invBanco !== undefined && invBanco !== null && invValor !== undefined && invValor !== null) {
        const valBancoStr = String(invBanco).trim();
        const valBancoLower = valBancoStr.toLowerCase();
        
        if (valBancoLower !== 'banco' && valBancoLower !== 'valor' && !isTotalRow(invBanco)) {
          const numVal = parseNumber(invValor);
          if (numVal > 0) {
            investimentos.push({
              banco: valBancoStr,
              valor: numVal
            });
          }
        }
      }
    }

    dataByMonth[sheetName.trim()] = { despesas, receitas, investimentos };
  });

  return dataByMonth;
}

// Parser de Cartões
function processCartoesFile() {
  if (!fs.existsSync(CARTOES_PATH)) {
    throw new Error("Arquivo de cartões não encontrado localmente.");
  }

  const workbook = xlsx.readFile(CARTOES_PATH, { cellDates: true });
  const dataByMonth = {};

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    const cartoes = {};

    function extractCartoesFromColumns(startColIdx, endColIdx) {
      let currentCardName = null;
      let cardItens = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const val0 = row[startColIdx];
        const val1 = row[startColIdx + 1];
        const val2 = row[startColIdx + 2];

        // Detecta início de um novo cartão
        if (val0 && String(val0).trim().toLowerCase().includes('cartão')) {
          if (currentCardName && cardItens.length > 0) {
            cartoes[currentCardName] = (cartoes[currentCardName] || []).concat(cardItens);
          }
          currentCardName = String(val0).trim();
          cardItens = [];
          i++; 
          continue;
        }

        // Se encontrou "Total", encerra o cartão atual
        if (val0 && String(val0).trim().toLowerCase() === 'total') {
          if (currentCardName && cardItens.length > 0) {
            cartoes[currentCardName] = (cartoes[currentCardName] || []).concat(cardItens);
          }
          currentCardName = null;
          cardItens = [];
          continue;
        }

        if (currentCardName) {
          if (val0 === null && val1 === null && val2 === null) {
            if (currentCardName && cardItens.length > 0) {
              cartoes[currentCardName] = (cartoes[currentCardName] || []).concat(cardItens);
            }
            currentCardName = null;
            cardItens = [];
            continue;
          }

          if (val1 !== null || val2 !== null) {
            if (String(val0).toLowerCase() !== 'parcela' && String(val1).toLowerCase() !== 'estabelecimento') {
              let parcelaStr = '';
              if (val0 instanceof Date) {
                const day = String(val0.getDate()).padStart(2, '0');
                const month = String(val0.getMonth() + 1).padStart(2, '0');
                parcelaStr = `${day}/${month}`;
              } else {
                parcelaStr = val0 ? String(val0).trim() : '';
              }

              cardItens.push({
                parcela: parcelaStr,
                estabelecimento: val1 ? String(val1).trim() : 'Sem nome',
                valor: parseNumber(val2)
              });
            }
          }
        }
      }

      if (currentCardName && cardItens.length > 0) {
        cartoes[currentCardName] = (cartoes[currentCardName] || []).concat(cardItens);
      }
    }

    // Processa esquerda e direita
    extractCartoesFromColumns(0, 2);
    extractCartoesFromColumns(5, 7);

    // Filtra para remover qualquer cartão Passaí (fora do orçamento do usuário)
    const cartoesFiltrados = {};
    Object.entries(cartoes).forEach(([cardName, itens]) => {
      const nameLower = cardName.toLowerCase();
      if (!nameLower.includes('passaí') && !nameLower.includes('passai')) {
        cartoesFiltrados[cardName] = itens;
      }
    });

    dataByMonth[sheetName.trim()] = cartoesFiltrados;
  });

  return dataByMonth;
}

// Rota para ler e processar os dados
app.get('/api/financial-data', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';

  try {
    const contasExist = fs.existsSync(CONTAS_PATH);
    const cartoesExist = fs.existsSync(CARTOES_PATH);
    
    let downloaded = false;

    // Baixa se for solicitado refresh ou se os arquivos não existirem
    if (forceRefresh || !contasExist || !cartoesExist) {
      console.log("Baixando dados atualizados do Google Sheets...");
      await Promise.all([
        downloadFile(CONTAS_URL, CONTAS_PATH),
        downloadFile(CARTOES_URL, CARTOES_PATH)
      ]);
      downloaded = true;
    }

    const contasData = processContasFile();
    const cartoesData = processCartoesFile();

    // Mapear meses únicos em ordem lógica
    const allMonths = Array.from(new Set([
      ...Object.keys(contasData),
      ...Object.keys(cartoesData)
    ]));

    // Ordenação dos meses (Janeiro a Dezembro)
    const monthOrder = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4,
      'Maio': 5, 'Junho': 6, 'Julho': 7, 'Agosto': 8,
      'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
    };

    allMonths.sort((a, b) => {
      const orderA = monthOrder[a.trim()] || 99;
      const orderB = monthOrder[b.trim()] || 99;
      return orderA - orderB;
    });

    const mtime = fs.statSync(CONTAS_PATH).mtime;

    res.json({
      success: true,
      months: allMonths,
      contas: contasData,
      cartoes: cartoesData,
      lastUpdated: mtime.toISOString(),
      source: downloaded ? "google_sheets" : "local_cache"
    });

  } catch (error) {
    console.error("Erro no processamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao processar dados financeiros.",
      error: error.message
    });
  }
});

// Servir frontend compilado em produção (para compatibilidade local com node api/index.js)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Inicia servidor apenas se rodando fora da Vercel (onde é Serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}

export default app;
