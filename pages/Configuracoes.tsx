import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  ShieldAlert, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Save, 
  AlertCircle,
  Phone,
  Mail,
  User,
  Shield,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  is_authorized: boolean;
  is_admin: boolean;
  created_at: string;
}

interface ConfiguracoesProps {
  currentUserProfile: any;
}

const Configuracoes: React.FC<ConfiguracoesProps> = ({ currentUserProfile }) => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Fetch users from database
  const fetchUsuarios = async () => {
    if (!currentUserProfile?.is_admin) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsuarios(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      setActionError('Falha ao carregar a lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [currentUserProfile]);

  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Format phone for visual
  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Toggle Authorization
  const handleToggleAuthorization = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUserProfile?.id) {
      alert('Você não pode revogar seu próprio acesso.');
      return;
    }

    try {
      setActionError('');
      const { error } = await supabase
        .from('usuarios')
        .update({ is_authorized: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      // Update state
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, is_authorized: !currentStatus } : u));
      setActionSuccess(`Status de autorização atualizado com sucesso.`);
      
      // Auto-clear success message
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError('Não foi possível alterar a autorização do usuário.');
    }
  };

  // Toggle Admin Role
  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUserProfile?.id) {
      alert('Você não pode alterar seu próprio privilégio de administrador.');
      return;
    }

    const confirmMsg = currentStatus 
      ? 'Deseja remover as permissões de administrador deste usuário?' 
      : 'Deseja conceder permissões de administrador a este usuário?';

    if (!confirm(confirmMsg)) return;

    try {
      setActionError('');
      const { error } = await supabase
        .from('usuarios')
        .update({ is_admin: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      // Update state
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentStatus } : u));
      setActionSuccess('Nível de acesso atualizado com sucesso.');
      
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError('Não foi possível alterar a função do usuário.');
    }
  };

  // Open Edit Modal
  const openEditModal = (user: Usuario) => {
    setEditingUser(user);
    setEditNome(user.nome);
    setEditTelefone(formatPhone(user.telefone));
    setActionError('');
  };

  // Save User Changes
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSavingEdit(true);
    setActionError('');

    try {
      const cleanedPhone = editTelefone.replace(/\D/g, '');
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: editNome,
          telefone: cleanedPhone,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Update state
      setUsuarios(prev => prev.map(u => u.id === editingUser.id ? { ...u, nome: editNome, telefone: cleanedPhone } : u));
      setEditingUser(null);
      setActionSuccess('Dados do usuário atualizados com sucesso.');
      
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError('Falha ao atualizar os dados do usuário.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete User using Postgres RPC
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userId === currentUserProfile?.id) {
      alert('Você não pode excluir a sua própria conta.');
      return;
    }

    if (!confirm(`ATENÇÃO: Deseja realmente excluir permanentemente o usuário "${userName}" do sistema? Esta ação é irreversível e excluirá o login de acesso dele.`)) {
      return;
    }

    try {
      setActionError('');
      // Call RPC delete_user(user_id)
      const { error } = await supabase.rpc('delete_user', { user_id: userId });

      if (error) throw error;

      // Update state
      setUsuarios(prev => prev.filter(u => u.id !== userId));
      setActionSuccess('Usuário excluído com sucesso.');
      
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError('Falha ao excluir o usuário.');
    }
  };

  // Filter users based on search
  const filteredUsuarios = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quick stats calculations
  const totalUsers = usuarios.length;
  const pendingUsers = usuarios.filter(u => !u.is_authorized).length;
  const adminUsers = usuarios.filter(u => u.is_admin).length;
  const activeUsers = usuarios.filter(u => u.is_authorized).length;

  // Render Admin View
  if (currentUserProfile?.is_admin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col space-y-6 w-full max-w-none px-[80px] py-6 md:py-8 text-gray-800"
      >
        {/* Header Title */}
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
            <span>LEITOR PDF</span>
            <span>•</span>
            <span>Configurações</span>
          </div>
          <h1 className="font-poppins text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
            Gestão de Usuários
          </h1>
          <p className="text-gray-500 font-sans text-sm md:text-base">
            Gerencie as permissões de acesso, funções e dados dos usuários do sistema.
          </p>
        </div>

        {/* Global Feedback Banners */}
        {actionError && (
          <div className="flex items-center space-x-3 p-4 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="flex items-center space-x-3 p-4 rounded bg-green-50 border border-green-200 text-green-700 text-sm">
            <Check className="h-5 w-5 text-green-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Dashboard quick stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total */}
          <div className="bg-white p-5 rounded-[5px] border border-[#cbcbcb] shadow-xs-salvy flex items-center space-x-4">
            <div className="p-3 bg-brand-50 rounded-lg text-brand-900">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider font-mono">Total Usuários</p>
              <h3 className="text-2xl font-bold font-mono text-brand-900">{loading ? '...' : totalUsers}</h3>
            </div>
          </div>

          {/* Card 2: Ativos */}
          <div className="bg-white p-5 rounded-[5px] border border-[#cbcbcb] shadow-xs-salvy flex items-center space-x-4">
            <div className="p-3 bg-green-50 rounded-lg text-green-600">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider font-mono">Autorizados</p>
              <h3 className="text-2xl font-bold font-mono text-green-600">{loading ? '...' : activeUsers}</h3>
            </div>
          </div>

          {/* Card 3: Pendentes */}
          <div className="bg-white p-5 rounded-[5px] border border-[#cbcbcb] shadow-xs-salvy flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${pendingUsers > 0 ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-gray-50 text-gray-400'}`}>
              <UserMinus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider font-mono">Aguardando</p>
              <h3 className={`text-2xl font-bold font-mono ${pendingUsers > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{loading ? '...' : pendingUsers}</h3>
            </div>
          </div>

          {/* Card 4: Admins */}
          <div className="bg-white p-5 rounded-[5px] border border-[#cbcbcb] shadow-xs-salvy flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider font-mono">Administradores</p>
              <h3 className="text-2xl font-bold font-mono text-blue-600">{loading ? '...' : adminUsers}</h3>
            </div>
          </div>
        </div>

        {/* Main Grid Card */}
        <div className="bg-white border border-[#cbcbcb] rounded-[5px] shadow-xs-salvy overflow-hidden flex flex-col">
          
          {/* Filters Bar */}
          <div className="p-4 border-b border-[#cbcbcb] bg-[#f9f9f9] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuário por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-[5px] border border-[#cbcbcb] bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition-all"
              />
            </div>

            <button
              onClick={fetchUsuarios}
              className="text-xs text-brand-700 hover:text-brand-900 font-semibold flex items-center space-x-1 p-2 hover:bg-gray-200/50 rounded transition-colors"
            >
              Recarregar tabela
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                <span className="text-sm text-gray-500 font-mono">Carregando usuários...</span>
              </div>
            ) : filteredUsuarios.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-1.5 font-sans">
                <Users className="h-10 w-10 mx-auto text-gray-300" />
                <p className="font-semibold text-sm">Nenhum usuário encontrado</p>
                <p className="text-xs">Tente ajustar a sua busca ou recarregar os dados.</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-sm text-gray-700">
                <thead>
                  <tr className="bg-[#f0ede9]/30 border-b border-[#cbcbcb] font-mono text-xs font-semibold text-brand-850 uppercase tracking-wider select-none">
                    <th className="px-6 py-4">Nome / Cadastro</th>
                    <th className="px-6 py-4">E-mail</th>
                    <th className="px-6 py-4">WhatsApp</th>
                    <th className="px-6 py-4 text-center">Acesso Autorizado</th>
                    <th className="px-6 py-4 text-center">Administrador</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cbcbcb] bg-white">
                  {filteredUsuarios.map((u) => {
                    const isSelf = u.id === currentUserProfile?.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors font-sans">
                        
                        {/* Name */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-brand-900">{u.nome}</div>
                          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                            Criado em: {formatDate(u.created_at)}
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                          {u.email}
                        </td>

                        {/* Phone */}
                        <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                          {formatPhone(u.telefone)}
                        </td>

                        {/* Authorized Status Switch */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleAuthorization(u.id, u.is_authorized)}
                            disabled={isSelf}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              u.is_authorized ? 'bg-green-500' : 'bg-gray-200'
                            } ${isSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={isSelf ? "Você não pode desautorizar a si mesmo" : "Clique para alterar"}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                u.is_authorized ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Administrator Status Switch */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleAdmin(u.id, u.is_admin)}
                            disabled={isSelf}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              u.is_admin ? 'bg-blue-500' : 'bg-gray-200'
                            } ${isSelf ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={isSelf ? "Você não pode alterar sua própria função" : "Clique para alterar"}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                u.is_admin ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-gray-400 hover:text-brand-900 hover:bg-gray-100 rounded transition-colors"
                              title="Editar dados"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteUser(u.id, u.nome)}
                              disabled={isSelf}
                              className={`p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ${
                                isSelf ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              title={isSelf ? "Você não pode se excluir" : "Excluir usuário"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* User Edit Modal */}
        <AnimatePresence>
          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[5px] border border-[#cbcbcb] shadow-2-salvy w-full max-w-md overflow-hidden flex flex-col"
              >
                {/* Modal Title */}
                <div className="px-6 py-4 border-b border-[#cbcbcb] bg-[#f9f9f9] flex items-center justify-between">
                  <h3 className="font-poppins font-bold text-brand-900 text-lg">
                    Editar Usuário
                  </h3>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSaveEdit}>
                  <div className="p-6 space-y-4">
                    {/* User email (readonly) */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
                        E-mail de Cadastro
                      </label>
                      <div className="flex items-center space-x-2 py-2.5 px-3 rounded bg-gray-100 border border-gray-200 text-xs font-mono text-gray-500">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span>{editingUser.email}</span>
                      </div>
                    </div>

                    {/* Name input */}
                    <div className="space-y-1">
                      <label htmlFor="edit-name" className="text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-450" />
                        <input
                          id="edit-name"
                          type="text"
                          required
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-[5px] border border-[#cbcbcb] text-sm text-gray-805 placeholder-gray-400 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                        />
                      </div>
                    </div>

                    {/* Phone input */}
                    <div className="space-y-1">
                      <label htmlFor="edit-phone" className="text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
                        WhatsApp / Telefone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-450" />
                        <input
                          id="edit-phone"
                          type="text"
                          value={editTelefone}
                          onChange={(e) => setEditTelefone(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-[5px] border border-[#cbcbcb] text-sm text-gray-850 placeholder-gray-400 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="px-6 py-4 bg-[#f9f9f9] border-t border-[#cbcbcb] flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 text-xs font-semibold rounded bg-white hover:bg-gray-50 border border-[#cbcbcb] text-gray-650 hover:text-gray-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="px-4 py-2 text-xs font-semibold rounded bg-brand-900 hover:bg-brand-800 text-white flex items-center space-x-1.5 transition-all shadow-sm"
                    >
                      {savingEdit ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Salvar Alterações</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    );
  }

  // Render Regular User View
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col space-y-6 w-full max-w-none px-[80px] py-6 md:py-8 text-gray-800"
    >
      {/* Title section in Poppins */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
          <span>LEITOR PDF</span>
          <span>•</span>
          <span>Configurações</span>
        </div>
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
          Minha Conta
        </h1>
        <p className="text-gray-500 font-sans text-sm md:text-base">
          Consulte as informações do seu perfil de acesso no sistema.
        </p>
      </div>

      {/* Profile Details Card */}
      <div className="w-full bg-[#ffffff] border border-[#cbcbcb] rounded-[5px] p-8 max-w-2xl shadow-xs-salvy space-y-6">
        
        <div className="flex items-center space-x-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-900 border border-[#cbcbcb] shadow-featured-icon-light">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-poppins text-xl font-semibold text-brand-900">
              {currentUserProfile?.nome || 'Usuário'}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono mt-0.5">
              <span>Membro desde:</span>
              <span>{formatDate(currentUserProfile?.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#cbcbcb]">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">Endereço de E-mail</span>
            <div className="text-sm font-mono text-gray-700 bg-gray-50 border border-gray-150 p-2.5 rounded">
              {currentUserProfile?.email}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">Telefone / WhatsApp</span>
            <div className="text-sm font-mono text-gray-700 bg-gray-50 border border-gray-150 p-2.5 rounded">
              {formatPhone(currentUserProfile?.telefone)}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">Status do Cadastro</span>
            <div className="flex items-center space-x-1.5 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 p-2.5 rounded">
              <Check className="h-4 w-4" />
              <span>Acesso Autorizado</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">Nível de Permissão</span>
            <div className="flex items-center space-x-1.5 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-150 p-2.5 rounded">
              <User className="h-4 w-4 text-gray-400" />
              <span>Usuário Comum</span>
            </div>
          </div>
        </div>

        {/* Helper Alert Banner */}
        <div className="flex items-start space-x-3 p-4 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs mt-6">
          <ShieldAlert className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1.5 leading-relaxed">
            <p className="font-semibold">Painel de Segurança</p>
            <p>Seus privilégios atuais não permitem gerenciar permissões de outros usuários do sistema. Se precisar alterar alguma informação cadastral ou conceder novas permissões, entre em contato com o administrador <strong>Paulo Tillmann (paulogtillmann@gmail.com)</strong>.</p>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default Configuracoes;
