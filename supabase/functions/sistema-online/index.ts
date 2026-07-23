import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('notificacoes')
      .insert({
        tipo_evento: 'SISTEMA_ONLINE',
        usuario_nome: 'Sistema (Cron)',
        usuario_email: 'cron@sistema.local',
        descricao: 'Aplicativo on-line',
        detalhes: {
          status: 'online',
          origem: 'Edge Function CronJob (06:00)',
          timestamp: new Date().toISOString()
        }
      })
      .select();

    if (error) {
      console.error('Erro ao gravar notificação:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Registro "Aplicativo on-line" incluído com sucesso na tabela de notificações!',
        inserted: data 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Exceção na Edge Function:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
