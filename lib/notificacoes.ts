import { supabase } from './supabase';

export interface NotificacaoRecord {
  id: string;
  tipo_evento: 'LOGON' | 'LOGOFF' | 'IMPORTACAO_EXTRATO' | string;
  usuario_id: string | null;
  usuario_nome: string;
  usuario_email: string | null;
  descricao: string;
  nome_arquivo: string | null;
  detalhes: Record<string, any> | null;
  created_at: string;
}

export interface RegistrarNotificacaoInput {
  tipo_evento: 'LOGON' | 'LOGOFF' | 'IMPORTACAO_EXTRATO' | string;
  usuario_id?: string | null;
  usuario_nome: string;
  usuario_email?: string | null;
  descricao: string;
  nome_arquivo?: string | null;
  detalhes?: Record<string, any> | null;
}

export const registrarNotificacao = async (input: RegistrarNotificacaoInput) => {
  try {
    const { error } = await supabase.from('notificacoes').insert({
      tipo_evento: input.tipo_evento,
      usuario_id: input.usuario_id || null,
      usuario_nome: input.usuario_nome,
      usuario_email: input.usuario_email || null,
      descricao: input.descricao,
      nome_arquivo: input.nome_arquivo || null,
      detalhes: input.detalhes || null,
    });

    if (error) {
      console.error('Erro ao gravar notificação:', error);
    }
  } catch (err) {
    console.error('Exceção ao registrar notificação:', err);
  }
};
