import React from 'react';
import { motion } from 'framer-motion';
import { HardHat, LayoutDashboard, ArrowRight } from 'lucide-react';

const Inicio: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col space-y-6 w-full max-w-none px-[80px] py-6 md:py-8"
    >
      {/* Title section in Poppins */}
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-blue-600 font-mono">
          <span>LEITOR PDF</span>
          <span>•</span>
          <span>Início</span>
        </div>
        <h1 className="font-poppins text-3xl font-bold tracking-tight text-brand-900 md:text-4xl">
          Painel Inicial
        </h1>
        <p className="text-gray-500 font-sans text-sm md:text-base">
          Bem-vindo ao centro de operações da sua operadora corporativa.
        </p>
      </div>

      {/* Main Container Card using shadow-1-salvy & brand curves */}
      <div className="w-full bg-[#ffffff] border border-[#cbcbcb] rounded-[5px] p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-600 shadow-featured-icon-light">
          {/* Animated pulsing ring */}
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></span>
          <LayoutDashboard className="h-12 w-12" />
        </div>

        <div className="space-y-3 max-w-md">
          <h2 className="font-poppins text-xl font-semibold text-brand-900">
            Página em Construção
          </h2>
          <p className="text-gray-500 font-sans text-sm leading-relaxed">
            Esta seção está recebendo os últimos ajustes no painel de controle. Em breve você poderá gerenciar suas linhas móveis, eSIMs e auditorias por aqui.
          </p>
        </div>

        {/* Small construction badge */}
        <div className="flex items-center space-x-2 rounded-full bg-yellow-50 px-4 py-1.5 border border-[#cbcbcb]">
          <HardHat className="h-4 w-4 text-yellow-600 animate-bounce" />
          <span className="text-xs font-medium text-yellow-700 font-sans">
            Módulo em desenvolvimento
          </span>
        </div>

        {/* Decorative dummy cards to give an app layout feel (app.salvy-like) */}
        <div className="w-full pt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#cbcbcb] mt-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#f6e4e4] border border-[#cbcbcb] shadow-xs-salvy opacity-60">
            <div className="text-left">
              <p className="text-xs text-gray-400 font-mono">Consumo Médio</p>
              <h3 className="font-mono text-lg font-bold text-brand-900">-- GB</h3>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#edf2e7] border border-[#cbcbcb] shadow-xs-salvy opacity-60">
            <div className="text-left">
              <p className="text-xs text-gray-400 font-mono">Linhas Ativas</p>
              <h3 className="font-mono text-lg font-bold text-brand-900">-- Chips</h3>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Inicio;
