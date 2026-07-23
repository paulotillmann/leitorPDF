import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { registrarNotificacao } from '../lib/notificacoes';
import logoWhite from '../logo/technocode-logo-white.png';

interface LoginProps {
  onLoginSuccess: (session: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatPhoneNumber = (value: string) => {
    // Basic phone formatter for Brazilian format (XX) XXXXX-XXXX
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setTelefone(formatted);
  };

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!validateEmail(email)) {
      setErrorMsg('Por favor, insira um e-mail válido.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Sign Up Flow
        if (!nome.trim()) {
          setErrorMsg('O nome é obrigatório.');
          setLoading(false);
          return;
        }
        if (!agreeTerms) {
          setErrorMsg('Você precisa concordar com os Termos e Políticas.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('As senhas não coincidem.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome,
              telefone: telefone.replace(/\D/g, ''),
            }
          }
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data?.user) {
          setSuccessMsg('Cadastro realizado com sucesso! Aguarde a liberação do administrador Paulo Tillmann.');
          // Reset form
          setNome('');
          setTelefone('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setAgreeTerms(false);
          setIsRegister(false);
        }
      } else {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          const rawMessage = error.message || '';
          let userFriendlyMessage = rawMessage;
          if (rawMessage === 'Invalid login credentials') {
            userFriendlyMessage = 'E-mail ou senha incorretos.';
          } else if (rawMessage.includes('Database error querying schema')) {
            userFriendlyMessage = 'Erro interno no banco de dados do Supabase. Os campos do administrador foram corrigidos. Por favor, recarregue a página e tente novamente.';
          } else if (!rawMessage || rawMessage === '{}' || typeof rawMessage === 'object') {
            userFriendlyMessage = 'Erro de conexão ou credenciais inválidas. Verifique os dados inseridos.';
          }
          setErrorMsg(userFriendlyMessage);
          setLoading(false);
          return;
        }

        if (data?.session) {
          // Verify if user is authorized in the public.usuarios table
          const { data: profile, error: profileError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          if (profileError || !profile) {
            // Sign out because profile doesn't exist yet (or database fetch failed)
            await supabase.auth.signOut();
            setErrorMsg('Não foi possível verificar seu perfil de acesso.');
          } else if (!profile.is_authorized) {
            // Sign out since access is pending admin approval
            await supabase.auth.signOut();
            setErrorMsg('Seu acesso ainda não foi autorizado pelo administrador. Por favor, aguarde.');
          } else {
            // Success! Register LOGON notification
            await registrarNotificacao({
              tipo_evento: 'LOGON',
              usuario_id: profile.id,
              usuario_nome: profile.nome,
              usuario_email: profile.email,
              descricao: `O usuário ${profile.nome} realizou logon no sistema.`,
            });
            onLoginSuccess(data.session);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocorreu um erro no processamento da solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen bg-[#08080a] text-[#f4f2ee] font-sans antialiased overflow-hidden selection:bg-brand-500 selection:text-brand-900">
      
      {/* LEFT COLUMN: FORM PANEL */}
      <div className="w-full lg:w-[45%] flex flex-col justify-between p-8 md:p-12 lg:p-16 z-10 bg-[#0c0c0f]/80 backdrop-blur-md border-r border-white/5">
        
        {/* Top Header - White logo displayed on mobile view when right column is hidden */}
        <div className="flex items-center space-x-3 lg:hidden mb-12">
          <img src={logoWhite} alt="Technocode logo" className="h-10 w-auto object-contain" />
          <span className="font-poppins text-lg font-bold tracking-wider text-white">TECHNOCODE</span>
        </div>

        {/* Dummy container to push forms to center on large screens */}
        <div className="hidden lg:block h-8"></div>

        {/* Main Content Area */}
        <div className="w-full max-w-md mx-auto space-y-8 my-auto">
          
          {/* Titles */}
          <div className="space-y-3">
            <h1 className="font-poppins text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
              Extração de dados de PDF
            </h1>
            <p className="text-gray-400 font-sans text-sm md:text-base">
              {isRegister 
                ? 'Solicite acesso preenchendo o formulário abaixo.' 
                : 'Importar e exportar dados.'}
            </p>
          </div>

          {/* Social login style buttons (disabled / style elements like model) */}
          {!isRegister && (
            <div className="grid grid-cols-2 gap-4">
              <button type="button" className="flex items-center justify-center space-x-2 py-3 px-4 rounded-[5px] bg-[#141419] border border-white/5 hover:bg-[#1c1c24] transition-all cursor-not-allowed opacity-60">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.68 14.93 1 12 1 7.37 1 3.4 3.66 1.48 7.56l3.77 2.92C6.15 7.19 8.84 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.55z" />
                  <path fill="#FBBC05" d="M5.25 14.76c-.25-.76-.39-1.57-.39-2.41s.14-1.65.39-2.41L1.48 7.02C.54 8.92 0 11.05 0 13.3c0 2.25.54 4.38 1.48 6.28l3.77-2.92c-.25-.76-.39-1.57-.39-2.41z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.3 1.09-3.8 1.09-3.16 0-5.85-2.15-6.8-5.02L.89 16.2C2.81 20.1 6.78 23 12 23z" />
                </svg>
                <span className="text-xs font-semibold text-white">Google</span>
              </button>
              <button type="button" className="flex items-center justify-center space-x-2 py-3 px-4 rounded-[5px] bg-[#141419] border border-white/5 hover:bg-[#1c1c24] transition-all cursor-not-allowed opacity-60">
                <svg className="h-4 w-4 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.82M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.69-1.12 1.84-.98 2.94.1.08 2.15-.52 2.81-1.33" />
                </svg>
                <span className="text-xs font-semibold text-white">Apple</span>
              </button>
            </div>
          )}

          {!isRegister && (
            <div className="flex items-center my-6">
              <div className="flex-1 h-[1px] bg-white/10"></div>
              <span className="px-3 text-xs text-gray-500 font-mono">OU</span>
              <div className="flex-1 h-[1px] bg-white/10"></div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* Notifications Alert Panel */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start space-x-3 p-4 rounded-[5px] bg-red-950/40 border border-red-500/20 text-red-300 text-sm"
                >
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start space-x-3 p-4 rounded-[5px] bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-sm"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inputs Grid */}
            <div className="space-y-4">
              {isRegister && (
                <>
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="nome" className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
                      <input
                        id="nome"
                        type="text"
                        placeholder="Insira seu nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3 rounded-[5px] bg-[#0f0f12] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-sans text-sm"
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="telefone" className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                      WhatsApp / Telefone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
                      <input
                        id="telefone"
                        type="text"
                        placeholder="(34) 99999-9999"
                        value={telefone}
                        onChange={handlePhoneChange}
                        className="w-full pl-11 pr-4 py-3 rounded-[5px] bg-[#0f0f12] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-sans text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
                  <input
                    id="email"
                    type="email"
                    placeholder="exemplo@dominio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-[5px] bg-[#0f0f12] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-sans text-sm"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="senha" className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
                  <input
                    id="senha"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-10 py-3 rounded-[5px] bg-[#0f0f12] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-sans text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {isRegister && (
                /* Confirm Password Input */
                <div className="space-y-1.5">
                  <label htmlFor="confirmar-senha" className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-500" />
                    <input
                      id="confirmar-senha"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-[5px] bg-[#0f0f12] border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-sans text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox (Terms & Conditions) */}
            {isRegister && (
              <label className="flex items-center space-x-2.5 pt-2 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-brand-500 focus:ring-brand-500/20 focus:ring-offset-gray-950"
                />
                <span className="text-xs text-gray-400 leading-none">
                  Eu aceito os <span className="text-white underline font-medium">Termos &amp; Políticas de Privacidade</span>
                </span>
              </label>
            )}

            {/* Continue / Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-[5px] bg-brand-500 hover:bg-brand-400 text-brand-900 hover:scale-[1.01] font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50 mt-6 shadow-lg shadow-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-brand-900" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>{isRegister ? 'Solicitar Acesso' : 'Entrar'}</span>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {isRegister 
                ? 'Já possui uma conta? Acesse aqui' 
                : 'Novo no sistema? Crie sua conta e solicite acesso'}
            </button>
          </div>

        </div>

        {/* Bottom Footer Credits */}
        <div className="text-center text-[10px] text-gray-600 font-mono mt-12">
          &copy; {new Date().getFullYear()} TECHNOCODE. TODOS OS DIREITOS RESERVADOS.
        </div>

      </div>

      {/* RIGHT COLUMN: PREMIUM VISUAL PANEL */}
      <div className="hidden lg:flex w-[55%] relative items-center justify-center p-12 overflow-hidden bg-[#0a0a0d]">
        
        {/* Glow ambient effects */}
        <div className="absolute top-[20%] right-[10%] h-[350px] w-[350px] rounded-full bg-brand-500/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[10%] left-[20%] h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none"></div>
        
        {/* Dynamic mesh gradient overlay */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#08080a]/90 to-[#08080a] z-0"></div>

        {/* Dashboard Card Container */}
        <div className="relative z-10 w-full max-w-[620px] rounded-2xl bg-gradient-to-b from-[#18181f] to-[#0e0e11] border border-white/5 shadow-2xl p-8 backdrop-blur-xl flex flex-col justify-between aspect-[1.1] select-none">
          
          {/* Logo on top right of card */}
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <div className="flex items-center space-x-3">
              <img src={logoWhite} alt="Technocode Logo" className="h-[52px] w-auto object-contain" />
              <span className="font-poppins text-md font-semibold tracking-wider text-white">TECHNOCODE</span>
            </div>
            <div className="flex space-x-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </div>
          </div>

          {/* Central Mock Graphics Area */}
          <div className="relative flex-1 flex items-center justify-center py-6">
            
            {/* Excel Icon Card */}
            <motion.div 
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="absolute left-4 top-[35%] z-20 flex h-14 w-14 items-center justify-center rounded-xl bg-green-950/60 border border-green-500/20 shadow-xl backdrop-blur-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500 text-white font-bold text-lg shadow-inner">
                X
              </div>
            </motion.div>

            {/* Main Data Cards Grid (Matches model exactly) */}
            <div className="grid grid-cols-2 gap-4 w-[75%] ml-auto z-10">
              
              {/* Card 1: Total Stock */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="p-4 rounded-xl bg-[#0f0f13]/80 border border-white/5 space-y-1.5 shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 font-mono uppercase tracking-wider">Total stock available</span>
                  <span className="text-[9px] text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded font-mono font-bold">- 14%</span>
                </div>
                <h3 className="text-xl font-bold font-mono text-white">2.745</h3>
                <span className="text-[9px] text-gray-600 font-sans">From last 376 stock added (7 days)</span>
              </motion.div>

              {/* Card 2: Total Orders */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="p-4 rounded-xl bg-[#0f0f13]/80 border border-white/5 space-y-1.5 shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 font-mono uppercase tracking-wider">Total orders</span>
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono font-bold">+ 2K</span>
                </div>
                <h3 className="text-xl font-bold font-mono text-white">482</h3>
                <span className="text-[9px] text-gray-600 font-sans">From last 18 orders (7 days)</span>
              </motion.div>

              {/* Card 3: Recovery Rate */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="p-4 rounded-xl bg-[#0f0f13]/80 border border-white/5 space-y-1.5 shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 font-mono uppercase tracking-wider">Recovery success rate</span>
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono font-bold">+ 0.25%</span>
                </div>
                <h3 className="text-xl font-bold font-mono text-white">96,72%</h3>
                <span className="text-[9px] text-gray-600 font-sans">From last 6.21% (7 days)</span>
              </motion.div>

              {/* Card 4: Revenue */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="p-4 rounded-xl bg-[#0f0f13]/80 border border-white/5 space-y-1.5 shadow-lg backdrop-blur-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 font-mono uppercase tracking-wider">Revenue generated</span>
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono font-bold">+ $8K</span>
                </div>
                <h3 className="text-xl font-bold font-mono text-white">$ 245k</h3>
                <span className="text-[9px] text-gray-600 font-sans">From last $38K revenue (7 days)</span>
              </motion.div>

            </div>

            {/* Floating Connection Line (Simulating the model graphic path) */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <motion.path 
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.8, duration: 1.2 }}
                d="M 90,175 C 130,175 140,150 180,150" 
                fill="none" 
                stroke="rgba(255, 255, 255, 0.1)" 
                strokeWidth="1.5" 
                strokeDasharray="4 4"
              />
              <motion.circle 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2, duration: 0.3 }}
                cx="180" 
                cy="150" 
                r="3" 
                fill="#538bc5" 
              />
            </svg>

          </div>

          {/* Bottom Card Copy */}
          <div className="flex items-center justify-between pt-6 border-t border-white/5 text-[10px] text-gray-500 font-mono">
            <span>A PONTE ENTRE O SEU PDF E O EXCEL</span>
            <span>v1.0.0</span>
          </div>

        </div>

        {/* Abstract dark concentric background structures mimicking the model image */}
        <div className="absolute -bottom-[20%] -right-[10%] h-[500px] w-[500px] rounded-full border border-white/[0.02] pointer-events-none"></div>
        <div className="absolute -bottom-[10%] -right-[5%] h-[400px] w-[400px] rounded-full border border-white/[0.03] pointer-events-none"></div>
        <div className="absolute -bottom-[0%] -right-[0%] h-[300px] w-[300px] rounded-full border border-white/[0.05] pointer-events-none"></div>

      </div>

    </div>
  );
};

export default Login;
