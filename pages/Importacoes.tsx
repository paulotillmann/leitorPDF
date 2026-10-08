import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Trash2, 
  Save, 
  Database, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  FileText, 
  RefreshCw, 
  SlidersHorizontal,
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Percent,
  Landmark
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { parsePdfFile, ParsedTransaction, BankModel } from '../lib/pdfParser';
import { registrarNotificacao } from '../lib/notificacoes';

const bankModelLabels: Record<BankModel, string> = {
  sicoob: 'Sicoob',
  bradesco: 'Bradesco',
  nubank: 'Nubank',
  caixa: 'Caixa'
};

const Importacoes: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Model selector state
  const [selectedModel, setSelectedModel] = useState<'auto' | BankModel>('auto');
  const [activeModel, setActiveModel] = useState<BankModel | null>(null);
  
  // Data State
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [periodText, setPeriodText] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loaded' | 'synced' | 'dirty' | 'fetched'>('idle');
  const [referenteExtrato, setReferenteExtrato] = useState('');
  const [hasDbRecords, setHasDbRecords] = useState(false);
  
  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Auto-hide messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Load existing records from Supabase on mount
  useEffect(() => {
    fetchFromSupabase();
  }, []);

  // Fetch current data from Supabase
  const fetchFromSupabase = async (showNotification = false) => {
    try {
      setParsing(true);
      
      let allData: any[] = [];
      let start = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('temp_extrato_bancario')
          .select('*')
          .order('data', { ascending: true })
          .range(start, start + step - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          start += step;
          if (data.length < step) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      if (allData.length > 0) {
        // Map database records to local representation
        const mapped: ParsedTransaction[] = allData.map((item: any, index: number) => ({
          id_temp: index + 1,
          data: item.data,
          documento: item.documento || '',
          tipo_documento: item.tipo_documento,
          historico: item.historico,
          valor_debito: item.valor_debito ? parseFloat(item.valor_debito) : null,
          valor_credito: item.valor_credito ? parseFloat(item.valor_credito) : null,
          referente_extrato: item.referente_extrato || ''
        }));
        setTransactions(mapped);
        setSyncStatus('fetched');
        setPeriodText('Carregado do Banco de Dados');
        setHasDbRecords(true);
        if (showNotification) {
          setSuccessMsg(`${mapped.length} registros carregados do banco de dados com sucesso!`);
        }
      } else {
        setTransactions([]);
        setSyncStatus('idle');
        setPeriodText(null);
        setHasDbRecords(false);
        if (showNotification) {
          setSuccessMsg('O banco de dados está vazio.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao buscar dados do Supabase: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith('.pdf')) {
        await processFile(droppedFile);
      } else {
        setErrorMsg("Por favor, selecione apenas arquivos em formato PDF.");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  // Main Parsing Process
  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParsing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setCurrentPage(1);

    try {
      const result = await parsePdfFile(selectedFile, selectedModel);
      
      // USER RULE: Não importar as linhas de SALDO
      const filteredTransactions = result.transactions.filter(
        tx => tx.tipo_documento !== 'SALDO'
      );

      setTransactions(filteredTransactions);
      setActiveModel(result.detectedModel);
      setPeriodText(result.periodStart ? `Período: Carga inicial de ${result.periodStart}` : 'Período não identificado');
      setSyncStatus('loaded');
      
      const modelName = bankModelLabels[result.detectedModel];
      setSuccessMsg(`Extrato extraído com sucesso usando o layout ${modelName}! ${filteredTransactions.length} lançamentos de movimentação (saldos ignorados).`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Falha ao ler o arquivo PDF: ${err.message}`);
      setFile(null);
      setActiveModel(null);
    } finally {
      setParsing(false);
    }
  };

  // Clear PDF upload from screen
  const handleClearUpload = () => {
    setFile(null);
    setTransactions([]);
    setPeriodText(null);
    setSyncStatus('idle');
    setActiveModel(null);
    setReferenteExtrato('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    // Reload database records
    fetchFromSupabase();
  };

  // Save parsed transactions to Supabase
  const handleSaveToSupabase = async () => {
    if (transactions.length === 0) {
      setErrorMsg("Não há dados para salvar.");
      return;
    }

    setSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Prepare transactions for insertion (ensure we do not include any SALDO rows)
      const dataToInsert = transactions.map(tx => ({
        data: tx.data,
        tipo_documento: tx.tipo_documento,
        documento: tx.documento || null,
        historico: tx.historico,
        valor_debito: tx.valor_debito,
        valor_credito: tx.valor_credito,
        referente_extrato: referenteExtrato.trim() || null
      }));

      // 2. Insert into Supabase in chunks of 200 rows to prevent payload size limits
      const chunkSize = 200;
      let totalInserted = 0;

      for (let i = 0; i < dataToInsert.length; i += chunkSize) {
        const chunk = dataToInsert.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('temp_extrato_bancario')
          .insert(chunk);

        if (error) throw error;
        totalInserted += chunk.length;
      }

      setSyncStatus('synced');
      setHasDbRecords(true);
      setSuccessMsg(`${totalInserted} registros salvos na tabela temporária do Supabase com sucesso!`);

      // Record IMPORTACAO_EXTRATO notification
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let userName = 'Usuário';
        let userEmail = session?.user?.email || null;
        let userId = session?.user?.id || null;

        if (userId) {
          const { data: profile } = await supabase
            .from('usuarios')
            .select('nome, email')
            .eq('id', userId)
            .single();

          if (profile) {
            userName = profile.nome;
            if (profile.email) userEmail = profile.email;
          }
        }

        const fileName = file ? file.name : 'extrato.pdf';
        await registrarNotificacao({
          tipo_evento: 'IMPORTACAO_EXTRATO',
          usuario_id: userId,
          usuario_nome: userName,
          usuario_email: userEmail,
          nome_arquivo: fileName,
          descricao: `Importação do arquivo "${fileName}" realizada com sucesso (${totalInserted} lançamentos).`,
          detalhes: {
            total_lancamentos: totalInserted,
            referente_extrato: referenteExtrato,
            modelo: activeModel || selectedModel
          }
        });
      } catch (notifErr) {
        console.error('Erro ao registrar notificação de importação:', notifErr);
      }
      
      // Wait 5 seconds and release for a new import
      setTimeout(() => {
        setFile(null);
        setTransactions([]);
        setPeriodText(null);
        setSyncStatus('idle');
        setActiveModel(null);
        setReferenteExtrato('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchFromSupabase();
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao salvar no Supabase: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // USER REQUIREMENT: Botão manual para Limpar o Banco de dados
  const handleClearDatabase = async () => {
    if (!confirm("Deseja realmente APAGAR TODOS os registros da tabela temporária no Supabase? Esta ação não pode ser desfeita.")) {
      return;
    }

    setClearing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Deletes all rows where ID is not null (safely deletes everything in Supabase)
      const { error } = await supabase
        .from('temp_extrato_bancario')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setSuccessMsg("Tabela temporária no Supabase limpa com sucesso!");
      setTransactions([]);
      setFile(null);
      setPeriodText(null);
      setSyncStatus('idle');
      setReferenteExtrato('');
      setHasDbRecords(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao limpar o banco de dados: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  // Helper formatting values
  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const exportToExcel = () => {
    // Generate clean data for Excel export
    const dataToExport = filteredTransactions.map(tx => ({
      'Data': formatDateBR(tx.data),
      'Tipo Documento': tx.tipo_documento,
      'Documento': tx.documento || '',
      'Ref. Extrato': tx.referente_extrato || referenteExtrato || '',
      'Histórico': tx.historico,
      'Valor Débito (R$)': tx.valor_debito || '',
      'Valor Crédito (R$)': tx.valor_credito || '',
    }));

    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Create a new workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transações");

    // Generate date string for filename
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Save/Download Excel file
    XLSX.writeFile(wb, `extrato_exportado_${dateStr}.xlsx`);
  };

  // Quantity Calculations by Category
  const pixCount = transactions.filter(t => t.tipo_documento === 'PIX').length;
  const creditCardsCount = transactions.filter(t => t.tipo_documento === 'CARTÃO DE CRÉDITO').length;
  const debitCardsCount = transactions.filter(t => t.tipo_documento === 'CARTÃO DE DÉBITO').length;
  const iofCount = transactions.filter(t => t.tipo_documento === 'IOF').length;
  const chequeCount = transactions.filter(t => t.tipo_documento === 'CHEQUE').length;
  const tarifaCount = transactions.filter(t => t.tipo_documento === 'TARIFA').length;
  const boletosCount = transactions.filter(t => t.tipo_documento === 'BOLETO').length;
  const transfCount = transactions.filter(t => t.tipo_documento === 'TRANSFERÊNCIA').length;
  const depositoCount = transactions.filter(t => t.tipo_documento === 'DEPÓSITO').length;
  const othersCount = transactions.filter(t => t.tipo_documento === 'OUTROS').length;

  // Filtered dataset
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.historico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.referente_extrato || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = 
      selectedType === 'ALL' || 
      tx.tipo_documento === selectedType;

    return matchesSearch && matchesType;
  });

  // Pagination calculation
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helper to count transactions of each type
  const getTabCount = (type: string) => {
    if (type === 'ALL') return transactions.length;
    return transactions.filter(tx => tx.tipo_documento === type).length;
  };

  // Badge Color Styles for Document Types
  const getBadgeStyle = (type: ParsedTransaction['tipo_documento']) => {
    switch (type) {
      case 'PIX':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'TRANSFERÊNCIA':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'DEPÓSITO':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'CARTÃO DE CRÉDITO':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CARTÃO DE DÉBITO':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'IOF':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CHEQUE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TARIFA':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'BOLETO':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col space-y-6 w-full max-w-none px-6 md:px-12 py-6"
    >
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 border-b border-gray-200 pb-5">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-teal-600 font-mono">
            <span>Supabase Database</span>
            <span>•</span>
            <span>leitorPDF</span>
          </div>
          <h1 className="font-poppins text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Importações
          </h1>
          <p className="text-gray-500 font-sans text-sm">
            Extraia transações de extratos bancários PDF e sincronize com a tabela temporária do Supabase.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing || syncing || clearing}
            className="flex items-center space-x-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-xs-salvy"
            title="Selecionar arquivo PDF para importação"
          >
            <Upload className="h-4 w-4" />
            <span>Importar Extrato PDF</span>
          </button>

          <button
            onClick={() => fetchFromSupabase(true)}
            disabled={parsing || syncing || clearing}
            className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs-salvy"
            title="Carregar registros salvos na tabela temporária"
          >
            <RefreshCw className={`h-4 w-4 ${parsing ? 'animate-spin' : ''}`} />
            <span>Consultar Banco</span>
          </button>

          <button
            onClick={handleClearDatabase}
            disabled={clearing || parsing || syncing}
            className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors shadow-xs-salvy"
            title="Limpar todos os registros do banco Supabase"
          >
            <Trash2 className={`h-4 w-4 ${clearing ? 'animate-pulse' : ''}`} />
            <span>Limpar Banco</span>
          </button>
        </div>
      </div>

      {/* Message Toasts */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3"
          >
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">Houve um erro no processamento</h4>
              <p className="text-xs text-red-700 mt-1">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3"
          >
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-800">Ação concluída com sucesso</h4>
              <p className="text-xs text-green-700 mt-1">{successMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seletor de Modelo de Extrato */}
      <div className="w-full bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs-salvy">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Modelo de Extrato Bancário
          </label>
          <p className="text-xs text-gray-400">
            Selecione o modelo do extrato antes de fazer o upload, ou use a autodetecção baseada nas palavras-chave do arquivo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 shadow-xs-salvy transition-colors"
          >
            <option value="auto">Autodetectar Modelo (Recomendado)</option>
            <option value="sicoob">Sicoob</option>
            <option value="bradesco">Bradesco</option>
            <option value="nubank">Nubank</option>
            <option value="caixa">Caixa</option>
          </select>
          {activeModel && (
            <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 mr-1.5 animate-ping"></span>
              Layout: {bankModelLabels[activeModel]}
            </span>
          )}
        </div>
      </div>

      {/* 2. Drag & Drop Upload Section */}
      <div className="w-full">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        {file && (
          <div className="w-full bg-white border border-gray-300 rounded-xl p-5 flex items-center justify-between shadow-xs-salvy">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-brand-900 truncate max-w-md">{file.name}</h3>
                <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span>•</span>
                  <span className="font-medium text-teal-600">{periodText}</span>
                  {syncStatus === 'loaded' && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center rounded-full bg-yellow-50 px-1.5 py-0.5 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Aguardando Carga</span>
                    </>
                  )}
                  {syncStatus === 'synced' && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Importado</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {(syncStatus === 'loaded' || syncStatus === 'synced') && (
              <div className="flex-1 max-w-md mx-6">
                <input
                  type="text"
                  placeholder="Referente ao extrato (ex: Bradesco Maio 2026)..."
                  value={referenteExtrato}
                  onChange={(e) => setReferenteExtrato(e.target.value)}
                  disabled={syncStatus === 'synced' || syncing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200"
                />
              </div>
            )}

            <div className="flex items-center space-x-3">
              {syncStatus === 'loaded' && (
                <button
                  onClick={handleSaveToSupabase}
                  disabled={syncing || !referenteExtrato.trim()}
                  className="flex items-center space-x-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-xs-salvy disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-600"
                >
                  {syncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{syncing ? 'Salvando...' : 'Salvar no Banco'}</span>
                </button>
              )}

              <button
                onClick={handleClearUpload}
                disabled={syncing}
                className="flex items-center space-x-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium transition-colors"
              >
                <span>Remover</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. KPI / Metrics Summary Section */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Total Transactions */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">Total</span>
              <h2 className="text-xl font-bold font-mono text-teal-700">{transactions.length}</h2>
            </div>
            <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <FileCheck className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Pix */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Pix</span>
              <h2 className="text-xl font-bold font-mono text-purple-700">{pixCount}</h2>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* C. Débito */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">C. Débito</span>
              <h2 className="text-xl font-bold font-mono text-indigo-700">{debitCardsCount}</h2>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* C. Crédito */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">C. Crédito</span>
              <h2 className="text-xl font-bold font-mono text-blue-700">{creditCardsCount}</h2>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* IOF */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">IOF</span>
              <h2 className="text-xl font-bold font-mono text-amber-700">{iofCount}</h2>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Percent className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Cheque */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Cheque</span>
              <h2 className="text-xl font-bold font-mono text-emerald-700">{chequeCount}</h2>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Landmark className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Tarifa */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">Tarifa</span>
              <h2 className="text-xl font-bold font-mono text-rose-700">{tarifaCount}</h2>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Receipt className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Boletos */}
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold text-yellow-700 uppercase tracking-wider">Boletos</span>
              <h2 className="text-xl font-bold font-mono text-yellow-800">{boletosCount}</h2>
            </div>
            <div className="h-9 w-9 rounded-lg bg-yellow-50 text-yellow-700 flex items-center justify-center shrink-0">
              <FileText className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>
      )}

      {/* 4. Filter & Grid Section */}
      {transactions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs-salvy">
          {/* Controls toolbar */}
          <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gray-50/50">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              {/* Search Input */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar histórico ou doc..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
                />
              </div>

              {/* Tab Filter */}
              <div className="flex flex-wrap items-center gap-1.5 scrollbar-thin">
                {[
                  { key: 'ALL', label: 'Todos' },
                  { key: 'PIX', label: 'Pix' },
                  { key: 'CARTÃO DE DÉBITO', label: 'C. Débito' },
                  { key: 'CARTÃO DE CRÉDITO', label: 'C. Crédito' },
                  { key: 'IOF', label: 'IOF' },
                  { key: 'CHEQUE', label: 'Cheque' },
                  { key: 'TARIFA', label: 'Tarifa' },
                  { key: 'BOLETO', label: 'Boletos' },
                  { key: 'TRANSFERÊNCIA', label: 'Transf.' },
                  { key: 'DEPÓSITO', label: 'Depósitos' },
                  { key: 'OUTROS', label: 'Outros' }
                ].map(tab => {
                  const count = getTabCount(tab.key);
                  return (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setSelectedType(tab.key);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-all duration-150 ${
                        selectedType === tab.key
                          ? 'bg-[#181410] border-[#181410] text-white shadow-xs-salvy'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        selectedType === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Export to Excel Button */}
            <button
              onClick={exportToExcel}
              disabled={!hasDbRecords}
              className="flex items-center justify-center space-x-2 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 text-sm font-semibold transition-all duration-150 shadow-xs-salvy whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-50 disabled:border-green-100 disabled:text-green-600/60"
              title={hasDbRecords ? "Exportar dados filtrados para planilha Excel" : "Nenhum registro no banco de dados para exportar"}
            >
              <FileSpreadsheet className={`h-4 w-4 ${hasDbRecords ? 'text-green-600' : 'text-green-600/40'}`} />
              <span>Exportar Excel</span>
            </button>
          </div>

          {/* Table container */}
          <div className="w-full overflow-x-auto">
            {parsing ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                <span className="text-sm font-medium text-gray-500">Lendo e decodificando extrato PDF...</span>
              </div>
            ) : currentItems.length > 0 ? (
              <table className="w-full border-collapse text-left text-sm text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <th scope="col" className="px-6 py-4 font-mono w-[100px]">Data</th>
                    <th scope="col" className="px-6 py-4">Tipo Doc.</th>
                    <th scope="col" className="px-6 py-4 font-mono w-[120px]">Documento</th>
                    <th scope="col" className="px-6 py-4">Ref. Extrato</th>
                    <th scope="col" className="px-6 py-4">Histórico</th>
                    <th scope="col" className="px-6 py-4 text-right">Valor Débito</th>
                    <th scope="col" className="px-6 py-4 text-right">Valor Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map((tx) => (
                    <tr 
                      key={tx.id_temp} 
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-3.5 font-mono text-xs whitespace-nowrap font-medium text-brand-900">
                        {formatDateBR(tx.data)}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getBadgeStyle(tx.tipo_documento)}`}>
                          {tx.tipo_documento}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs whitespace-nowrap text-gray-500">
                        {tx.documento || '-'}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-500 whitespace-nowrap font-medium">
                        {tx.referente_extrato || referenteExtrato || '-'}
                      </td>
                      <td className="px-6 py-3.5 text-gray-700 max-w-sm lg:max-w-md truncate" title={tx.historico}>
                        {tx.historico}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-medium text-red-600 whitespace-nowrap">
                        {tx.valor_debito ? `-${formatCurrency(tx.valor_debito)}` : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-medium text-green-600 whitespace-nowrap">
                        {tx.valor_credito ? `+${formatCurrency(tx.valor_credito)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <Filter className="h-10 w-10 text-gray-300" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-brand-900">Nenhum registro encontrado</h4>
                  <p className="text-xs text-gray-500">Tente ajustar a sua busca ou trocar os filtros aplicados.</p>
                </div>
              </div>
            )}
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Mostrando <span className="font-semibold text-gray-700">{indexOfFirstItem + 1}</span> a{' '}
                <span className="font-semibold text-gray-700">
                  {Math.min(indexOfLastItem, totalItems)}
                </span>{' '}
                de <span className="font-semibold text-gray-700">{totalItems}</span> lançamentos
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  // Show current page, and pages around it
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`h-8 w-8 rounded-lg text-xs font-semibold border transition-all ${
                          currentPage === page
                            ? 'bg-[#181410] border-[#181410] text-white shadow-xs-salvy'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 3 || 
                    page === currentPage + 3
                  ) {
                    return <span key={page} className="text-gray-400 text-xs px-1">...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State on Initial Load */}
      {transactions.length === 0 && !parsing && (
        <div className="w-full bg-[#ffffff] border border-[#cbcbcb] rounded-[5px] p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 shadow-featured-icon-light">
            <Database className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h2 className="font-poppins text-lg font-semibold text-brand-900">
              Nenhum dado importado
            </h2>
            <p className="text-gray-500 font-sans text-xs leading-relaxed">
              Faça o upload de um extrato Sicoob em PDF ou clique em <strong>"Consultar Banco"</strong> para ler dados previamente importados.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Importacoes;
