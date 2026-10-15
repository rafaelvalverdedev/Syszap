
const supabase = require('../config/supabase');

async function buscarAgendamentosPendentes() {
  const agora = new Date().toISOString();

  const { data, error } = await supabase
    .from('agendamentos')
    .select(
      'id, destinatario, mensagem, data_agendada, status'
    )
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
  const { data, error } = await supabase.rpc(
    'recuperar_agendamentos_travados'
  );

  if (error) {
    console.error('Erro ao recuperar agendamentos:', error.message);
    throw new Error('Não foi possível recuperar os agendamentos.');
  }

  return data;
}

async function reservarAgendamentosPendentes() {
  // Primeiro, recupera registros que ficaram presos.
  await recuperarAgendamentosTravados();

  // Depois, reserva os agendamentos vencidos.
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

module.exports = {
  buscarAgendamentosPendentes,
  recuperarAgendamentosTravados,
  reservarAgendamentosPendentes
};
