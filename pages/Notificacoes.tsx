import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Search, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  UploadCloud, 
  FileText, 
  User, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  ShieldAlert,
  Filter, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NotificacaoRecord } from '../lib/notificacoes';

interface NotificacoesProps {
  currentUserProfile?: any;
}

const Notificacoes: React.FC<NotificacoesProps> = ({ currentUserProfile }) => {
  const [notificacoes, setNotificacoes] = useState<NotificacaoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'LOGON' | 'LOGOFF' | 'IMPORTACAO_EXTRATO'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const itemsPerPage = 15;

  // Auto-hide messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Fetch notifications & set up Realtime subscription
  useEffect(() => {
    fetchNotificacoes();

    // Subscribe to realtime changes in notificacoes table
    const subscription = supabase
      .channel('notificacoes-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        (payload) => {
          const newNotif = payload.new as NotificacaoRecord;
          setNotificacoes((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchNotificacoes = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotificacoes(data || []);
      if (isManualRefresh) {
        setSuccessMsg('Lista de notificações atualizada!');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao buscar notificações: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClearNotificacoes = async () => {
    if (!currentUserProfile?.is_admin) {
      setErrorMsg('Apenas administradores podem limpar a lista de notificações.');
      return;
    }

    if (!confirm('Deseja realmente APAGAR todas as notificações salvas no sistema?')) {
      return;
    }

    try {
      setClearing(true);
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      setNotificacoes([]);
      setSuccessMsg('Histórico de notificações limpo com sucesso!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro ao limpar notificações: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  // Date Formatter BR
  const formatDateTimeBR = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Metrics counts
  const totalCount = notificacoes.length;
  const logonCount = notificacoes.filter(n => n.tipo_evento === 'LOGON').length;
  const logoffCount = notificacoes.filter(n => n.tipo_evento === 'LOGOFF').length;
  const importCount = notificacoes.filter(n => n.tipo_evento === 'IMPORTACAO_EXTRATO').length;

  // Filtered dataset
  const filteredNotificacoes = notificacoes.filter(item => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      item.usuario_nome.toLowerCase().includes(search) ||
      (item.usuario_email || '').toLowerCase().includes(search) ||
      item.descricao.toLowerCase().includes(search) ||
      (item.nome_arquivo || '').toLowerCase().includes(search);

    const matchesTab = 
      selectedTab === 'ALL' || 
      item.tipo_evento === selectedTab;

    return matchesSearch && matchesTab;
  });

  // Pagination calculation
  const totalItems = filteredNotificacoes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNotificacoes.slice(indexOfFirstItem, indexOfLastItem);

  const getEventBadge = (tipo: string) => {
    switch (tipo) {
      case 'LOGON':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <LogIn className="h-3.5 w-3.5" />
            <span>LOGON</span>
          </span>
        );
      case 'LOGOFF':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            <LogOut className="h-3.5 w-3.5" />
            <span>LOGOFF</span>
          </span>
        );
      case 'IMPORTACAO_EXTRATO':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <UploadCloud className="h-3.5 w-3.5" />
            <span>IMPORTAÇÃO DE EXTRATO</span>
          </span>
        );
      case 'SISTEMA_ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 border border-cyan-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>SISTEMA ONLINE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
            <Bell className="h-3.5 w-3.5" />
            <span>{tipo}</span>
          </span>
        );
    }
  };

  // Admin Guard: Only administrators can view this screen
  if (!currentUserProfile?.is_admin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-xs-salvy mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="font-poppins text-2xl font-bold text-brand-900 mb-2">
          Acesso Restrito
        </h2>
        <p className="text-gray-500 font-sans text-sm max-w-md leading-relaxed mb-6">
          Apenas usuários com perfil de <strong>Administrador</strong> possuem permissão para visualizar os registros de auditoria e notificações de sistema.
        </p>
        <div className="inline-flex items-center space-x-2 rounded-full bg-gray-100 px-4 py-1.5 text-xs text-gray-600 font-mono">
          <span>Seu perfil: {currentUserProfile?.nome || 'Usuário'}</span>
          <span>•</span>
          <span className="text-red-600 font-bold uppercase">Não Administrador</span>
        </div>
      </motion.div>
    );
  }

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
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-blue-600 font-mono">
            <span>Registro de Atividades</span>
            <span>•</span>
            <span>Auditoria de Acesso & Importações</span>
          </div>
          <h1 className="font-poppins text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Notificações
          </h1>
          <p className="text-gray-500 font-sans text-sm">
            Histórico completo de acessos ao sistema (logon/logoff) e importações de extratos bancários efetuadas.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchNotificacoes(true)}
            disabled={refreshing || loading}
            className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs-salvy"
            title="Atualizar lista de notificações"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          {currentUserProfile?.is_admin && (
            <button
              onClick={handleClearNotificacoes}
              disabled={clearing || loading}
              className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors shadow-xs-salvy"
              title="Limpar todas as notificações salvas no banco de dados"
            >
              <Trash2 className="h-4 w-4" />
              <span>Limpar Notificações</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Notifications */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3"
          >
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <span className="text-sm text-green-800 font-medium">{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3"
          >
            <Bell className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm text-red-800 font-medium">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. KPI / Metrics Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Notificações */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total de Eventos</span>
            <h2 className="text-3xl font-bold font-mono text-blue-700">{totalCount}</h2>
            <p className="text-[10px] text-gray-400">Notificações gravadas</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Bell className="h-6 w-6" />
          </div>
        </div>

        {/* Logons */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Logons Efetuados</span>
            <h2 className="text-3xl font-bold font-mono text-emerald-700">{logonCount}</h2>
            <p className="text-[10px] text-gray-400">Entradas no sistema</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <LogIn className="h-6 w-6" />
          </div>
        </div>

        {/* Logoffs */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Logoffs Efetuados</span>
            <h2 className="text-3xl font-bold font-mono text-slate-700">{logoffCount}</h2>
            <p className="text-[10px] text-gray-400">Saídas do sistema</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <LogOut className="h-6 w-6" />
          </div>
        </div>

        {/* Importações de Extratos */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between shadow-xs-salvy hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Extratos Importados</span>
            <h2 className="text-3xl font-bold font-mono text-teal-700">{importCount}</h2>
            <p className="text-[10px] text-gray-400">Arquivos PDF processados</p>
          </div>
          <div className="h-12 w-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <UploadCloud className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Grid Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs-salvy">
        {/* Controls toolbar */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar por usuário, arquivo ou descrição..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: 'Todos os Eventos' },
                { key: 'LOGON', label: 'Logon' },
                { key: 'LOGOFF', label: 'Logoff' },
                { key: 'IMPORTACAO_EXTRATO', label: 'Importações PDF' },
                { key: 'SISTEMA_ONLINE', label: 'Sistema Online' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSelectedTab(tab.key as any);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedTab === tab.key
                      ? 'bg-[#181410] border-[#181410] text-white shadow-xs-salvy'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-gray-500">Carregando histórico de notificações...</span>
            </div>
          ) : currentItems.length > 0 ? (
            <table className="w-full border-collapse text-left text-sm text-gray-600">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th scope="col" className="px-6 py-4 font-mono w-[180px]">Data &amp; Hora</th>
                  <th scope="col" className="px-6 py-4 w-[210px]">Tipo de Evento</th>
                  <th scope="col" className="px-6 py-4">Usuário</th>
                  <th scope="col" className="px-6 py-4">Nome do Arquivo</th>
                  <th scope="col" className="px-6 py-4">Descrição do Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs whitespace-nowrap font-medium text-gray-800">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{formatDateTimeBR(item.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEventBadge(item.tipo_evento)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-brand-900 text-xs flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {item.usuario_nome}
                        </span>
                        {item.usuario_email && (
                          <span className="text-[11px] text-gray-400 font-mono pl-5">
                            {item.usuario_email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">
                      {item.nome_arquivo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                          <FileText className="h-3.5 w-3.5 text-teal-600" />
                          {item.nome_arquivo}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {item.descricao}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Bell className="h-10 w-10 text-gray-300" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-brand-900">Nenhuma notificação encontrada</h4>
                <p className="text-xs text-gray-500">Nenhum evento registrado corresponde aos filtros selecionados.</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Mostrando <span className="font-semibold text-gray-700">{indexOfFirstItem + 1}</span> a{' '}
              <span className="font-semibold text-gray-700">
                {Math.min(indexOfLastItem, totalItems)}
              </span>{' '}
              de <span className="font-semibold text-gray-700">{totalItems}</span> registros
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Notificacoes;
