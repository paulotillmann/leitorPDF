export interface ParsedTransaction {
  id_temp: number;
  data: string; // YYYY-MM-DD
  documento: string;
  tipo_documento: 
    | 'PIX' 
    | 'TRANSFERÊNCIA' 
    | 'DEPÓSITO' 
    | 'CARTÃO DE CRÉDITO' 
    | 'CARTÃO DE DÉBITO' 
    | 'IOF' 
    | 'CHEQUE' 
    | 'TARIFA' 
    | 'BOLETO' 
    | 'OUTROS' 
    | 'SALDO';
  historico: string;
  valor_debito: number | null;
  valor_credito: number | null;
  referente_extrato?: string;
}

// Sicoob configuration keywords
const nonDocKeywords = new Set([
  'SALDO', 'RECEBIMENTO', 'PAGAMENTO', 'REM.:', 'SIPAG', 'DEP.DINHEIRO', 'DEP'
]);

const ignorePatternsSicoob = [
  /Sicoob \| Internet Banking/,
  /^https:\/\/www\.sicoob\.com\.br/,
  /^Data Documento Histórico Valor$/,
  /^SISTEMA DE COOPERATIVAS DE CRÉDITO DO BRASIL$/,
  /^PLATAFORMA DE SERVIÇOS FINANCEIROS DO SICOOB - SISBR$/,
  /^EXTRATO DE CONTA CORRENTE/,
  /^Cooperativa:/,
  /^Conta:/,
  /^Periodo:/,
  /^HISTÓRICO DE MOVIMENTAÇÃO$/
];

function shouldIgnoreSicoob(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  for (const pat of ignorePatternsSicoob) {
    if (pat.test(trimmed)) return true;
  }
  return false;
}

// Bradesco configuration patterns
const ignorePatternsBradesco = [
  /^Extrato de:/,
  /Agência\s*\|\s*Conta/,
  /Total\s*\(R\)/,
  /\(A\+B\)/,
  /Total\s*Disponível/,
  /Data\s*Lançamento/,
  /Data\s*Histórico\s*Valor/,
  /Folha\s*\d+\/\d+/,
  /Extrato\s*Mensal/,
  /POSTO\s*L\.\s*F\.\s*FRANCO.*CNPJ/,
  /Nome\s*do\s*usuário:/,
  /Data\s*da\s*operação:/,
  /Os\s*dados\s*acima\s*têm\s*como\s*base/,
  /Saldos\s*Invest/,
  /^Total\s+[\d.,]+\s+-?[\d.,]+\s+[\d.,]+$/
];

function shouldIgnoreBradesco(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  for (const pat of ignorePatternsBradesco) {
    if (pat.test(trimmed)) return true;
  }
  return false;
}

// SUB-PARSER 1: Sicoob Parser
function parseSicoob(fullText: string): { transactions: ParsedTransaction[], periodStart: string | null } {
  // Extract period
  const periodMatch = fullText.match(/Periodo:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  const extractMatch = fullText.match(/EXTRATO DE CONTA CORRENTE\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  
  let periodStart: string | null = null;
  let startMonth = 1;
  let startYear = new Date().getFullYear();

  if (periodMatch) {
    periodStart = `${periodMatch[1]}/${periodMatch[2]}/${periodMatch[3]}`;
    startMonth = parseInt(periodMatch[2]);
    startYear = parseInt(periodMatch[3]);
  } else if (extractMatch) {
    periodStart = `${extractMatch[1]}/${extractMatch[2]}/${extractMatch[3]}`;
    startMonth = parseInt(extractMatch[2]);
    startYear = parseInt(extractMatch[3]);
  }

  // Helper to resolve Sicoob transactions dates
  const resolveDate = (dateStr: string): string => {
    const [day, month] = dateStr.split('/').map(Number);
    if (!day || !month) return `${startYear}-01-01`;

    let txYear = startYear;
    // Handle Dec -> Jan boundary
    if (startMonth === 1 && month === 12) {
      txYear = startYear - 1;
    } else if (month > startMonth && (month - startMonth > 6)) {
      txYear = startYear - 1;
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${txYear}-${pad(month)}-${pad(day)}`;
  };

  const lines = fullText.split('\n');
  const rawTxs: { date: string; document: string; descriptionLines: string[]; rawLines: string[] }[] = [];
  let currentTx: typeof rawTxs[0] | null = null;

  for (const line of lines) {
    if (shouldIgnoreSicoob(line)) continue;

    const dateMatch = line.match(/^\s*(\d{2}\/\d{2})(.*)/);
    if (dateMatch) {
      if (currentTx) {
        rawTxs.push(currentTx);
      }

      const date = dateMatch[1];
      const rest = dateMatch[2].trim();

      const docMatch = rest.match(/^([a-zA-Z0-9.\-/]+)(.*)/);
      let doc = '';
      let descPart = rest;

      if (docMatch) {
        const candidate = docMatch[1];
        if (!nonDocKeywords.has(candidate.toUpperCase())) {
          doc = candidate;
          descPart = docMatch[2].trim();
        }
      }

      currentTx = {
        date,
        document: doc,
        descriptionLines: descPart ? [descPart] : [],
        rawLines: [line]
      };
    } else {
      if (currentTx) {
        currentTx.descriptionLines.push(line.trim());
        currentTx.rawLines.push(line);
      }
    }
  }

  if (currentTx) {
    rawTxs.push(currentTx);
  }

  const transactions: ParsedTransaction[] = rawTxs.map((tx, idx) => {
    let fullDesc = tx.descriptionLines.join(' ').trim();
    const valueRegex = /R\$\s*([\d.,]+)\s*([CD*])/;
    const match = fullDesc.match(valueRegex);

    let debit: number | null = null;
    let credit: number | null = null;

    if (match) {
      const valueStr = match[1];
      const valueType = match[2];
      fullDesc = fullDesc.replace(match[0], '').trim();

      const cleanVal = valueStr.replace(/\./g, '').replace(',', '.');
      const valFloat = parseFloat(cleanVal);
      if (!isNaN(valFloat)) {
        if (valueType === 'C') {
          credit = valFloat;
        } else if (valueType === 'D') {
          debit = valFloat;
        }
      }
    }

    fullDesc = fullDesc.replace(/\s+/g, ' ').trim();

    let docType: ParsedTransaction['tipo_documento'] = 'OUTROS';
    const descUpper = fullDesc.toUpperCase();
    const docUpper = tx.document.toUpperCase();

    if (descUpper.includes('PIX') || docUpper.includes('PIX')) {
      docType = 'PIX';
    } else if (
      descUpper.includes('IOF') || 
      descUpper.includes('IMP.OP') || 
      descUpper.includes('IMPOSTO OP') || 
      descUpper.includes('IMP S/ OPER') ||
      descUpper.includes('IMPOSTO S/ OPER')
    ) {
      docType = 'IOF';
    } else if (
      descUpper.includes('CHEQUE') || 
      descUpper.includes('CHQ') || 
      descUpper.includes('CH.') || 
      descUpper.startsWith('CH ') || 
      descUpper.includes(' CH ') || 
      docUpper.includes('CHEQUE') || 
      docUpper.includes('CHQ')
    ) {
      docType = 'CHEQUE';
    } else if (
      descUpper.includes('TARIFA') || 
      descUpper.includes('TAR.') || 
      descUpper.includes('TAR CONTA') || 
      descUpper.includes('MANUTENCAO CONTA') || 
      descUpper.includes('MANUT.CONTA') || 
      descUpper.includes('MANUT CONTA') || 
      descUpper.includes('COBRANCA TARIFA') || 
      descUpper.includes('TAR BANC') || 
      descUpper.includes('TAXA SERVICO') ||
      descUpper.includes('TAR PAQ') ||
      descUpper.includes('TAR EXTRATO')
    ) {
      docType = 'TARIFA';
    } else if (
      descUpper.includes('CARTAO DEBITO') ||
      descUpper.includes('CARTÃO DÉBITO') ||
      descUpper.includes('CARTAO DÉBITO') ||
      descUpper.includes('CARTÃO DEBITO') ||
      descUpper.includes('COMPRA DEBITO') ||
      descUpper.includes('COMPRA DÉBITO') ||
      descUpper.includes('DEB.CARTAO') ||
      descUpper.includes('DÉB.CARTÃO') ||
      descUpper.includes('DEB CARTAO') ||
      descUpper.includes('DÉB CARTÃO') ||
      descUpper.includes('MAESTRO') ||
      descUpper.includes('VISA ELECTRON') ||
      descUpper.includes('ELO DEBITO') ||
      descUpper.includes('ELO DÉBITO') ||
      (descUpper.includes('DEBITO') && (descUpper.includes('CARTAO') || descUpper.includes('CARTÃO')))
    ) {
      docType = 'CARTÃO DE DÉBITO';
    } else if (
      descUpper.includes('CARTAO CREDITO') ||
      descUpper.includes('CARTÃO CRÉDITO') ||
      descUpper.includes('CARTAO') || 
      descUpper.includes('CARTÃO') || 
      descUpper.includes('COMPRAS') || 
      descUpper.includes('SIPAG') ||
      descUpper.includes('MASTERCARD') ||
      descUpper.includes('CABAL') ||
      descUpper.includes('ELO') ||
      descUpper.includes('VISA')
    ) {
      docType = 'CARTÃO DE CRÉDITO';
    } else if (
      descUpper.includes('TRANSFERENCIA') || 
      descUpper.includes('TRANSFERÊNCIA') || 
      descUpper.includes('TRANSF') || 
      descUpper.includes('TED') || 
      descUpper.includes('DOC')
    ) {
      docType = 'TRANSFERÊNCIA';
    } else if (descUpper.includes('DEP') || descUpper.includes('DEPOSITO') || descUpper.includes('DEPÓSITO')) {
      docType = 'DEPÓSITO';
    } else if (descUpper.includes('SALDO')) {
      docType = 'SALDO';
    } else if (
      descUpper.includes('DÉB.TÍT') || 
      descUpper.includes('DEB.TIT') || 
      descUpper.includes('DÉB.TIT') ||
      descUpper.includes('TITULO') || 
      descUpper.includes('TÍTULO') || 
      descUpper.includes('BOLETO') || 
      descUpper.includes('LIQUIDAÇÃO') || 
      descUpper.includes('LIQUIDACAO')
    ) {
      docType = 'BOLETO';
    }

    return {
      id_temp: idx + 1,
      data: resolveDate(tx.date),
      documento: tx.document,
      tipo_documento: docType,
      historico: fullDesc,
      valor_debito: debit,
      valor_credito: credit
    };
  });

  return { transactions, periodStart };
}

// SUB-PARSER 2: Bradesco Parser
function parseBradesco(fullText: string): { transactions: ParsedTransaction[], periodStart: string | null } {
  // Extract period
  const periodMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/);
  let periodStart: string | null = null;
  if (periodMatch) {
    periodStart = periodMatch[1];
  }

  const lines = fullText.split('\n');
  const transactions: ParsedTransaction[] = [];
  let currentDate: string | null = null;
  let currentTypeHeader = '';
  let txIndex = 1;

  for (const line of lines) {
    const trimmed = line.replace('\r', '').trim();
    if (shouldIgnoreBradesco(trimmed)) continue;

    // Check if line starts with date
    const dateMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})(.*)/);
    let restLine = trimmed;
    if (dateMatch) {
      currentDate = dateMatch[1];
      restLine = dateMatch[2].trim();
    }

    if (!currentDate) continue;

    // Check if the line ends with transaction value and balance
    const valMatch = restLine.match(/(.*?)\s+(?:(\d+)\s+)?(-?[\d.,]+)\s+([\d.,]+)$/);
    if (valMatch) {
      const textPart = valMatch[1].trim();
      const doc = valMatch[2] || '';
      const valStr = valMatch[3];

      const cleanVal = valStr.replace(/\./g, '').replace(',', '.');
      const valFloat = parseFloat(cleanVal);
      
      let debit: number | null = null;
      let credit: number | null = null;
      if (!isNaN(valFloat)) {
        if (valFloat < 0) {
          debit = Math.abs(valFloat);
        } else {
          credit = valFloat;
        }
      }

      // Ignore SALDO lines
      const isSaldo = textPart.toUpperCase().includes('SALDO') || currentTypeHeader.toUpperCase().includes('SALDO');

      if (!isSaldo) {
        // Convert currentDate "DD/MM/YYYY" to ISO "YYYY-MM-DD"
        const [d, m, y] = currentDate.split('/');
        const isoDate = `${y}-${m}-${d}`;

        // Classify type using currentTypeHeader and textPart
        let docType: ParsedTransaction['tipo_documento'] = 'OUTROS';
        const typeText = (currentTypeHeader + ' ' + textPart).toUpperCase();
        const docUpper = doc.toUpperCase();

        if (typeText.includes('PIX') || docUpper.includes('PIX')) {
          docType = 'PIX';
        } else if (
          typeText.includes('IOF') || 
          typeText.includes('IMP.OP') || 
          typeText.includes('IMPOSTO OP') || 
          typeText.includes('IMP S/ OPER') ||
          typeText.includes('IMPOSTO S/ OPER')
        ) {
          docType = 'IOF';
        } else if (
          typeText.includes('CHEQUE') || 
          typeText.includes('CHQ') || 
          typeText.includes('CH.') || 
          typeText.startsWith('CH ') || 
          typeText.includes(' CH ') || 
          docUpper.includes('CHEQUE') || 
          docUpper.includes('CHQ')
        ) {
          docType = 'CHEQUE';
        } else if (
          typeText.includes('TARIFA') || 
          typeText.includes('TAR.') || 
          typeText.includes('TAR CONTA') || 
          typeText.includes('MANUTENCAO CONTA') || 
          typeText.includes('MANUT.CONTA') || 
          typeText.includes('MANUT CONTA') || 
          typeText.includes('COBRANCA TARIFA') || 
          typeText.includes('TAR BANC') || 
          typeText.includes('TAXA SERVICO') ||
          typeText.includes('TAR PAQ') ||
          typeText.includes('TAR EXTRATO')
        ) {
          docType = 'TARIFA';
        } else if (
          typeText.includes('CARTAO DEBITO') ||
          typeText.includes('CARTÃO DÉBITO') ||
          typeText.includes('CARTAO DÉBITO') ||
          typeText.includes('CARTÃO DEBITO') ||
          typeText.includes('COMPRA DEBITO') ||
          typeText.includes('COMPRA DÉBITO') ||
          typeText.includes('DEB.CARTAO') ||
          typeText.includes('DÉB.CARTÃO') ||
          typeText.includes('DEB CARTAO') ||
          typeText.includes('DÉB CARTÃO') ||
          typeText.includes('MAESTRO') ||
          typeText.includes('VISA ELECTRON') ||
          typeText.includes('ELO DEBITO') ||
          typeText.includes('ELO DÉBITO') ||
          (typeText.includes('DEBITO') && (typeText.includes('CARTAO') || typeText.includes('CARTÃO')))
        ) {
          docType = 'CARTÃO DE DÉBITO';
        } else if (
          typeText.includes('CARTAO CREDITO') ||
          typeText.includes('CARTÃO CRÉDITO') ||
          typeText.includes('CARTAO') || 
          typeText.includes('CARTÃO') || 
          typeText.includes('COMPRAS') || 
          typeText.includes('SIPAG') ||
          typeText.includes('MASTERCARD') ||
          typeText.includes('CABAL') ||
          typeText.includes('ELO') ||
          typeText.includes('VISA') ||
          typeText.includes('CIELO')
        ) {
          docType = 'CARTÃO DE CRÉDITO';
        } else if (
          typeText.includes('TRANSFERENCIA') || 
          typeText.includes('TRANSFERÊNCIA') || 
          typeText.includes('TRANSF') || 
          typeText.includes('TED') || 
          typeText.includes('DOC')
        ) {
          docType = 'TRANSFERÊNCIA';
        } else if (typeText.includes('DEP') || typeText.includes('DEPOSITO') || typeText.includes('DEPÓSITO')) {
          docType = 'DEPÓSITO';
        } else if (
          typeText.includes('BOLETO') || 
          typeText.includes('TÍTULO') || 
          typeText.includes('TITULO') || 
          typeText.includes('LIQUIDAÇÃO') || 
          typeText.includes('LIQUIDACAO')
        ) {
          docType = 'BOLETO';
        }

        transactions.push({
          id_temp: txIndex++,
          data: isoDate,
          documento: doc,
          tipo_documento: docType,
          historico: textPart,
          valor_debito: debit,
          valor_credito: credit
        });
      }
    } else {
      // If the line has no value, it is a header describing the next transaction type
      if (restLine && !restLine.toUpperCase().includes('SALDO')) {
        currentTypeHeader = restLine;
      }
    }
  }

  return { transactions, periodStart };
}

// MAIN PARSER INTERFACE
export const parsePdfFile = async (
  file: File, 
  model: 'auto' | 'sicoob' | 'bradesco' = 'auto'
): Promise<{ 
  transactions: ParsedTransaction[], 
  periodStart: string | null, 
  detectedModel: 'sicoob' | 'bradesco' 
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
        
        // Access pdfjsLib from window (loaded via CDN)
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error('Biblioteca PDF.js não carregada. Verifique sua conexão.');
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        const pagesText: string[] = [];
        const stepTolerance = 6.0;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const items = content.items as any[];
          
          // Filter out empty items and sort all items on the page by vertical position (y) descending
          const sortedItems = items
            .filter(item => item.str && item.str.trim())
            .sort((a, b) => b.transform[5] - a.transform[5]);

          const groupedLines: { yMin: number; yMax: number; lastY: number; items: any[] }[] = [];
          let currentLine: typeof groupedLines[0] | null = null;

          for (const item of sortedItems) {
            const y = item.transform[5];
            
            if (!currentLine) {
              currentLine = { yMin: y, yMax: y, lastY: y, items: [item] };
              groupedLines.push(currentLine);
            } else {
              const distance = Math.abs(currentLine.lastY - y);
              if (distance <= stepTolerance) {
                currentLine.items.push(item);
                currentLine.lastY = y;
                currentLine.yMin = Math.min(currentLine.yMin, y);
                currentLine.yMax = Math.max(currentLine.yMax, y);
              } else {
                currentLine = { yMin: y, yMax: y, lastY: y, items: [item] };
                groupedLines.push(currentLine);
              }
            }
          }

          let pageLines: string[] = [];
          for (const line of groupedLines) {
            // Sort items horizontally within the grouped line
            const horizontalSorted = line.items.sort((a, b) => a.transform[4] - b.transform[4]);
            const lineText = horizontalSorted.map(item => item.str).join(' ').replace(/\s+/g, ' ');
            if (lineText.trim()) {
              pageLines.push(lineText);
            }
          }
          pagesText.push(pageLines.join('\n'));
        }

        const fullText = pagesText.join('\n');

        // Auto-detection logic
        let detectedModel: 'sicoob' | 'bradesco' = 'sicoob';
        if (model === 'auto') {
          const textUpper = fullText.toUpperCase();
          if (textUpper.includes('BRADESCO') || textUpper.includes('RENTAB.INVEST') || textUpper.includes('INVEST FÁCIL')) {
            detectedModel = 'bradesco';
          } else {
            detectedModel = 'sicoob';
          }
        } else {
          detectedModel = model;
        }

        console.log(`Using bank statement parser model: ${detectedModel}`);
        
        let result;
        if (detectedModel === 'bradesco') {
          result = parseBradesco(fullText);
        } else {
          result = parseSicoob(fullText);
        }

        resolve({ 
          transactions: result.transactions, 
          periodStart: result.periodStart, 
          detectedModel 
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
