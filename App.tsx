import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Database, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  Settings, 
  LogOut, 
  HardHat, 
  Info,
  Layers,
  CircleAlert
} from 'lucide-react';
import Inicio from './pages/Inicio';
import Importacoes from './pages/Importacoes';
import Notificacoes from './pages/Notificacoes';
import logoTechnocode from './logo/logo_technocode-black.png';
import Login from './pages/Login';
import Configuracoes from './pages/Configuracoes';
import { supabase } from './lib/supabase';
import { registrarNotificacao } from './lib/notificacoes';
import { Loader2 } from 'lucide-react';

// Simple Hash Router Hook
const useRouter = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#inicio');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      setCurrentHash(hash || '#inicio');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (hash: string) => {
    window.location.hash = hash;
  };

  return { currentHash, navigate };
};

// Generic Under Construction Component for Notification & Settings
interface UnderConstructionViewProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

const UnderConstructionView: React.FC<UnderConstructionViewProps> = ({ 
  title, 
  description, 
  icon, 
  iconBgColor, 
  iconColor 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col space-y-6 w-full max-w-none px-[80px] py-6 md:py-8"
    >
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-brand-600 font-mono">
          <span>LEITOR PDF</span>
          <span>•</span>
          <span>{title}</span>
        </div>
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
          {title}
        </h1>
      </div>

      <div className="w-full bg-[#ffffff] border border-[#cbcbcb] rounded-[5px] p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
        <div className={`relative flex h-24 w-24 items-center justify-center rounded-full ${iconBgColor} ${iconColor} shadow-featured-icon-light`}>
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${iconBgColor.replace('bg-', 'bg-')} opacity-20`}></span>
          {icon}
        </div>

        <div className="space-y-3 max-w-md">
          <h2 className="font-poppins text-xl font-semibold text-brand-900">
            Módulo em Construção
          </h2>
          <p className="text-gray-500 font-sans text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center space-x-2 rounded-full bg-yellow-50 px-4 py-1.5 border border-[#cbcbcb]">
          <HardHat className="h-4 w-4 text-yellow-600 animate-bounce" />
          <span className="text-xs font-medium text-yellow-700 font-sans">
            Breve lançamento
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const App: React.FC = () => {
  const { currentHash, navigate } = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);

  useEffect(() => {
    fetchNotificationsCount();

    // Realtime listener for notificacoes table
    const subscription = supabase
      .channel('app-notificacoes-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes' },
        () => {
          fetchNotificationsCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchNotificationsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        setNotificationsCount(count);
      }
    } catch (err) {
      console.error('Erro ao contar notificações:', err);
    }
  };
  
  // Auth States
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      handleSession(currentSession);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      handleSession(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSession = async (currentSession: any) => {
    if (!currentSession) {
      setSession(null);
      setUserProfile(null);
      setLoadingSession(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (error || !profile) {
        await supabase.auth.signOut();
        setSession(null);
        setUserProfile(null);
      } else if (!profile.is_authorized) {
        await supabase.auth.signOut();
        setSession(null);
        setUserProfile(null);
      } else {
        setSession(currentSession);
        setUserProfile(profile);
      }
    } catch (err) {
      console.error('Erro de autenticação:', err);
      setSession(null);
      setUserProfile(null);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleLoginSuccess = async (newSession: any) => {
    setLoadingSession(true);
    await handleSession(newSession);
  };

  // Map hashes to human-readable names for top bar header
  const getHeaderTitle = () => {
    switch (currentHash) {
      case '#inicio':
        return 'Início';
      case '#importacoes':
        return 'Importações';
      case '#notificacoes':
        return 'Notificações';
      case '#configuracoes':
        return 'Configurações';
      default:
        return 'Dashboard';
    }
  };

  // Render correct sub-screen based on current hash route
  const renderContent = () => {
    switch (currentHash) {
      case '#inicio':
        return <Inicio key="inicio" />;
      case '#importacoes':
        return <Importacoes key="importacoes" />;
      case '#notificacoes':
        return <Notificacoes key="notificacoes" currentUserProfile={userProfile} />;
      case '#configuracoes':
        return <Configuracoes key="configuracoes" currentUserProfile={userProfile} />;
      default:
        return <Inicio key="default" />;
    }
  };

  if (loadingSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#08080a] text-[#f4f2ee]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <span className="text-sm font-mono font-semibold">Carregando aplicação...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-800 font-sans antialiased">
      {/* 1. SIDEBAR */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 flex h-full flex-col border-r border-[#cbcbcb] bg-[#f9f9f9] shadow-xs-salvy select-none shrink-0"
      >
        {/* Sidebar Menu Options & Logo Area */}
        <nav className="flex-1 p-3 flex flex-col">
          {/* Logo inside Sidebar Menu Area */}
          <div className="flex w-full items-center justify-center min-h-[100px] mb-6 mt-2">
            <AnimatePresence mode="wait">
              {sidebarCollapsed ? (
                <motion.div
                  key="collapsed-logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 border border-[#cbcbcb]"
                >
                  <Layers className="h-5 w-5 text-brand-900" />
                </motion.div>
              ) : (
                <motion.img
                  key="expanded-logo"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  src={logoTechnocode}
                  alt="Technocode Logo"
                  className="h-[96px] w-auto max-w-[220px] object-contain"
                />
              )}
            </AnimatePresence>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1.5">
          {/* Menu Option: Início */}
          <button
            onClick={() => navigate('#inicio')}
            className={`group flex w-full items-center rounded-[5px] p-3 text-sm font-semibold transition-all duration-200 ease-out hover:scale-[1.02] ${
              currentHash === '#inicio'
                ? 'bg-[#181410] text-white'
                : 'text-gray-600 hover:bg-gray-200/50 hover:text-brand-900'
            }`}
          >
            <Home className={`h-5 w-5 shrink-0 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-sans"
              >
                Início
              </motion.span>
            )}
          </button>

          {/* Menu Option: Importações */}
          <button
            onClick={() => navigate('#importacoes')}
            className={`group flex w-full items-center rounded-[5px] p-3 text-sm font-semibold transition-all duration-200 ease-out hover:scale-[1.02] ${
              currentHash === '#importacoes'
                ? 'bg-[#181410] text-white'
                : 'text-gray-600 hover:bg-gray-200/50 hover:text-brand-900'
            }`}
          >
            <Database className={`h-5 w-5 shrink-0 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-sans"
              >
                Importações
              </motion.span>
            )}
          </button>

          {/* Menu Option: Notificações (Apenas Administradores) */}
          {userProfile?.is_admin && (
            <button
              onClick={() => navigate('#notificacoes')}
              className={`group flex w-full items-center justify-between rounded-[5px] p-3 text-sm font-semibold transition-all duration-200 ease-out hover:scale-[1.02] ${
                currentHash === '#notificacoes'
                  ? 'bg-[#181410] text-white'
                  : 'text-gray-600 hover:bg-gray-200/50 hover:text-brand-900'
              }`}
            >
              <div className="flex items-center">
                <Bell className={`h-5 w-5 shrink-0 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-sans"
                  >
                    Notificações
                  </motion.span>
                )}
              </div>
              {!sidebarCollapsed && notificationsCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  currentHash === '#notificacoes'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {notificationsCount}
                </span>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* Floating Collapse Button on the right border */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-[20px] z-30 flex h-6 w-6 items-center justify-center rounded-full border border-[#cbcbcb] bg-white text-gray-500 hover:text-brand-900 hover:bg-gray-50 shadow-xs-salvy transition-all duration-200"
        title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </motion.aside>

      {/* 2. MAIN CONTAINER AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP BAR / HEADER */}
        <header className="flex h-16 w-full items-center justify-end bg-white px-6 shadow-md z-10">

          {/* Header Right: Icons */}
          <div className="flex items-center space-x-3">
            {/* User profile name */}
            {userProfile && (
              <div className="flex flex-col items-end mr-3 text-right">
                <span className="text-xs font-semibold text-brand-900 leading-none">
                  {userProfile.nome}
                </span>
                <span className="text-[9px] text-gray-400 font-mono mt-0.5 uppercase tracking-wider">
                  {userProfile.is_admin ? 'Administrador' : 'Usuário'}
                </span>
              </div>
            )}

            {/* Notifications Button (Apenas Administradores) */}
            {userProfile?.is_admin && (
              <button
                onClick={() => navigate('#notificacoes')}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-brand-900 transition-colors shadow-xs-salvy ${
                  currentHash === '#notificacoes' ? 'bg-brand-50 text-brand-900' : ''
                }`}
                title="Notificações (Apenas Administrador)"
              >
                <Bell className="h-5 w-5" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm font-mono">
                    {notificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={() => navigate('#configuracoes')}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-brand-900 transition-colors shadow-xs-salvy ${
                currentHash === '#configuracoes' ? 'bg-brand-50 text-brand-900' : ''
              }`}
              title="Configurações"
            >
              <Settings className="h-5 w-5" />
            </button>

            {/* Divider line */}
            <div className="h-6 w-[1px] bg-[#cbcbcb]" />

            {/* Exit/Sign Out Button */}
            <button
              onClick={async () => {
                if (userProfile) {
                  await registrarNotificacao({
                    tipo_evento: 'LOGOFF',
                    usuario_id: userProfile.id,
                    usuario_nome: userProfile.nome,
                    usuario_email: userProfile.email,
                    descricao: `O usuário ${userProfile.nome} realizou logoff do sistema.`,
                  });
                }
                await supabase.auth.signOut();
                navigate('#inicio');
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50 hover:text-brand-900 transition-colors shadow-xs-salvy"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT ROUTING WITH TRANSITION PANEL */}
        <main className="flex-1 overflow-y-auto bg-white">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default App;