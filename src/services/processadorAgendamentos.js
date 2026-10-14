
const supabase = require('../config/supabase');

// Busca agendamentos vencidos sem alterar seus status.
// Útil para consulta e diagnóstico.
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
    console.error(
      'Erro ao buscar agendamentos pendentes:',
      error.message
    );

    throw new Error(
      'Não foi possível buscar os agendamentos pendentes.'
    );
  }

  return data;
}

// Reserva os agendamentos vencidos por meio da função SQL.
// A função SQL deve existir no Supabase com o nome
// reservar_agendamentos_pendentes.
async function reservarAgendamentosPendentes() {
  const { data, error } = await supabase.rpc(
    'reservar_agendamentos_pendentes',
    { quantidade: 10 }
  );

  if (error) {
    console.error(
      'Erro ao reservar agendamentos:',
      error.message
    );

    throw new Error(
      'Não foi possível reservar os agendamentos pendentes.'
    );
  }

  return data;
}

module.exports = {
  buscarAgendamentosPendentes,
  reservarAgendamentosPendentes
};
