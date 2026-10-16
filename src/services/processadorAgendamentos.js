const supabase = require('../config/supabase');
const { enviarMensagemWhatsApp } = require('./whatsapp');

async function buscarAgendamentosPendentes() {
  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from('agendamentos')
    .select('id, destinatario, mensagem, data_agendada, status')
    .eq('status', 'agendada')
    .lte('data_agendada', agora)
    .order('data_agendada', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Erro ao buscar agendamentos:', error.message);
    throw new Error('Não foi possível buscar os agendamentos.');
  }

  return data;
}

async function recuperarAgendamentosTravados() {
  const { data, error } = await supabase.rpc('recuperar_agendamentos_travados');

  if (error) {
    console.error('Erro ao recuperar agendamentos:', error.message);
    throw new Error('Não foi possível recuperar os agendamentos.');
  }

  return data;
}

async function reservarAgendamentosPendentes() {
  await recuperarAgendamentosTravados();

  const { data, error } = await supabase.rpc(
    'reservar_agendamentos_pendentes',
    { quantidade: 10 }
  );

  if (error) {
    console.error('Erro ao reservar agendamentos:', error.message);
    throw new Error('Não foi possível reservar os agendamentos.');
  }

  return data;
}

async function processarAgendamentos() {
  // Validar antes de reservar para não deixar registros em "processando"
  // se as credenciais da Cloud API estiverem ausentes.
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID antes de processar.');
  }

  const agendamentos = await reservarAgendamentosPendentes();
  const resultados = [];

  for (const agendamento of agendamentos) {
    try {
      const envio = await enviarMensagemWhatsApp({
        destinatario: agendamento.destinatario,
        mensagem: agendamento.mensagem
      });

      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({
          status: 'enviada',
          id_mensagem_whatsapp: envio.idMensagem,
          erro: null,
          enviada_em: new Date().toISOString(),
          processando_em: null
        })
        .eq('id', agendamento.id)
        .eq('status', 'processando');

      if (updateError) {
        // A mensagem pode já ter sido entregue; não tentar reenviá-la automaticamente.
        console.error(`Mensagem enviada, mas não foi possível atualizar o agendamento ${agendamento.id}:`, updateError.message);
        resultados.push({
          id: agendamento.id,
          sucesso: false,
          mensagem: 'Envio aceito pela API, mas falhou a atualização do banco. Verifique manualmente para evitar duplicidade.'
        });
        continue;
      }

      resultados.push({
        id: agendamento.id,
        sucesso: true,
        id_mensagem_whatsapp: envio.idMensagem
      });
    } catch (error) {
      const detalhe = String(error.message || 'Falha desconhecida').slice(0, 1000);

      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({
          status: 'falhou',
          erro: detalhe,
          processando_em: null
        })
        .eq('id', agendamento.id)
        .eq('status', 'processando');

      if (updateError) {
        console.error(`Falha ao registrar erro do agendamento ${agendamento.id}:`, updateError.message);
      }

      console.error(`Falha no envio do agendamento ${agendamento.id}:`, detalhe);
      resultados.push({
        id: agendamento.id,
        sucesso: false,
        erro: detalhe
      });
    }
  }

  return {
    total: agendamentos.length,
    enviados: resultados.filter((item) => item.sucesso).length,
    falhas: resultados.filter((item) => !item.sucesso).length,
    resultados
  };
}

module.exports = {
  buscarAgendamentosPendentes,
  recuperarAgendamentosTravados,
  reservarAgendamentosPendentes,
  processarAgendamentos
};
