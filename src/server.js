
require('dotenv').config();

const express = require('express');
const supabase = require('./config/supabase');
const { enviarMensagemWhatsApp } = require('./services/whatsapp');

const {
  buscarAgendamentosPendentes,
  reservarAgendamentosPendentes,
  processarAgendamentos
} = require('./services/processadorAgendamentos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ==========================================
// 1. CADASTRAR AGENDAMENTO
// POST /api/agendamentos
// ==========================================

app.post('/api/agendamentos', async (req, res) => {
  try {
    const { destinatario, mensagem, data_agendada } = req.body;

    if (
      typeof destinatario !== 'string' ||
      !destinatario.trim() ||
      typeof mensagem !== 'string' ||
      !mensagem.trim() ||
      typeof data_agendada !== 'string' ||
      !data_agendada.trim()
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Informe destinatário, mensagem e data agendada em formatos válidos.'
      });
    }

    const dataAgendada = new Date(data_agendada);

    if (Number.isNaN(dataAgendada.getTime())) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'A data agendada é inválida.'
      });
    }

    if (dataAgendada <= new Date()) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'A data agendada deve ser futura.'
      });
    }

    const { data, error } = await supabase
      .from('agendamentos')
      .insert({
        destinatario: destinatario.trim(),
        mensagem: mensagem.trim(),
        data_agendada: dataAgendada.toISOString()
      })
      .select('id, destinatario, mensagem, data_agendada, status')
      .single();

    if (error) {
      console.error('Erro ao cadastrar agendamento:', error.message);

      return res.status(500).json({
        sucesso: false,
        mensagem: 'Não foi possível cadastrar o agendamento.'
      });
    }

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Agendamento cadastrado com sucesso!',
      agendamento: data
    });
  } catch (error) {
    console.error('Erro inesperado:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao cadastrar agendamento.'
    });
  }
});

// ==========================================
// 2. LISTAR AGENDAMENTOS
// GET /api/agendamentos
// ==========================================

app.get('/api/agendamentos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('id, destinatario, mensagem, data_agendada, status, criada_em')
      .order('data_agendada', { ascending: true });

    if (error) {
      console.error('Erro ao listar agendamentos:', error.message);

      return res.status(500).json({
        sucesso: false,
        mensagem: 'Não foi possível listar os agendamentos.'
      });
    }

    return res.json({
      sucesso: true,
      total: data.length,
      agendamentos: data
    });
  } catch (error) {
    console.error('Erro inesperado:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao listar agendamentos.'
    });
  }
});

// ==========================================
// 3. CANCELAR AGENDAMENTO
// PATCH /api/agendamentos/:id/cancelar
// ==========================================

app.patch('/api/agendamentos/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelada' })
      .eq('id', id)
      .eq('status', 'agendada')
      .select('id, destinatario, mensagem, data_agendada, status')
      .maybeSingle();

    if (error) {
      console.error('Erro ao cancelar agendamento:', error.message);

      return res.status(500).json({
        sucesso: false,
        mensagem: 'Não foi possível cancelar o agendamento.'
      });
    }

    if (!data) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Agendamento não encontrado ou não pode ser cancelado.'
      });
    }

    return res.json({
      sucesso: true,
      mensagem: 'Agendamento cancelado com sucesso!',
      agendamento: data
    });
  } catch (error) {
    console.error('Erro inesperado:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao cancelar agendamento.'
    });
  }
});

// ==========================================
// 4. EDITAR AGENDAMENTO
// PATCH /api/agendamentos/:id
// ==========================================

app.patch('/api/agendamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { destinatario, mensagem, data_agendada } = req.body;

    const campos = {};

    if (destinatario !== undefined) {
      if (
        typeof destinatario !== 'string' ||
        !destinatario.trim()
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'O destinatário deve ser um texto válido.'
        });
      }

      campos.destinatario = destinatario.trim();
    }

    if (mensagem !== undefined) {
      if (
        typeof mensagem !== 'string' ||
        !mensagem.trim()
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'A mensagem deve ser um texto válido.'
        });
      }

      campos.mensagem = mensagem.trim();
    }

    if (data_agendada !== undefined) {
      if (
        typeof data_agendada !== 'string' ||
        !data_agendada.trim()
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Informe uma data válida.'
        });
      }

      const data = new Date(data_agendada);

      if (
        Number.isNaN(data.getTime()) ||
        data <= new Date()
      ) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Informe uma data futura válida.'
        });
      }

      campos.data_agendada = data.toISOString();
    }

    if (Object.keys(campos).length === 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Informe pelo menos um campo para alterar.'
      });
    }

    const { data, error } = await supabase
      .from('agendamentos')
      .update(campos)
      .eq('id', id)
      .eq('status', 'agendada')
      .select('id, destinatario, mensagem, data_agendada, status')
      .maybeSingle();

    if (error) {
      console.error('Erro ao editar agendamento:', error.message);

      return res.status(500).json({
        sucesso: false,
        mensagem: 'Não foi possível editar o agendamento.'
      });
    }

    if (!data) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Agendamento não encontrado ou não pode ser editado.'
      });
    }

    return res.json({
      sucesso: true,
      mensagem: 'Agendamento atualizado com sucesso!',
      agendamento: data
    });
  } catch (error) {
    console.error('Erro inesperado:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao editar agendamento.'
    });
  }
});

// ==========================================
// 5. BUSCAR AGENDAMENTOS VENCIDOS
// GET /api/teste-processador
// ==========================================

app.get('/api/teste-processador', async (req, res) => {
  try {
    const agendamentos = await buscarAgendamentosPendentes();

    return res.json({
      sucesso: true,
      total: agendamentos.length,
      agendamentos
    });
  } catch (error) {
    console.error('Erro no teste do processador:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Não foi possível testar o processador.'
    });
  }
});

// ==========================================
// 6. TESTAR RESERVA DE AGENDAMENTOS
// POST /api/teste-reserva
// ==========================================

app.post('/api/teste-reserva', async (req, res) => {
  try {
    const agendamentos = await reservarAgendamentosPendentes();

    return res.json({
      sucesso: true,
      total: agendamentos.length,
      agendamentos
    });
  } catch (error) {
    console.error('Erro no teste de reserva:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Não foi possível reservar os agendamentos.'
    });
  }
});

// ==========================================
// 7. PÁGINA INICIAL
// GET /
// ==========================================

app.get('/', (req, res) => {
  res.send('WhatsApp Agendador está funcionando!');
});



app.get('/api/cron/verificar', async (req, res) => {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = req.get('authorization');

  if (!segredo) {
    return res.status(500).json({
      sucesso: false,
      mensagem: 'CRON_SECRET não configurado no servidor.'
    });
  }

  if (autorizacao !== `Bearer ${segredo}`) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Não autorizado.'
    });
  }

  try {
    const processamento = await processarAgendamentos();

    return res.json({
      sucesso: true,
      mensagem: 'Verificação do Syszap concluída.',
      horario: new Date().toISOString(),
      processamento
    });
  } catch (error) {
    console.error('Erro no processamento do cron:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Não foi possível processar os agendamentos.',
      detalhe: error.message
    });
  }
});


// ==========================================
// 8. TESTAR CONEXÃO COM O SUPABASE
// GET /api/teste-banco
// ==========================================

app.get('/api/teste-banco', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agendamentos')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Erro Supabase:', error.message);

      return res.status(500).json({
        sucesso: false,
        mensagem: 'Falha ao consultar o banco.'
      });
    }

    return res.json({
      sucesso: true,
      mensagem: 'Conexão com Supabase funcionando!',
      registros: data.length
    });
  } catch (error) {
    console.error('Erro inesperado:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no teste.'
    });
  }
});


app.get('/api/diagnostico-whatsapp', async (req, res) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Variáveis do WhatsApp não configuradas.'
    });
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const resultado = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        sucesso: false,
        mensagem: 'A Meta recusou a consulta.',
        erro: resultado.error?.message || 'Erro não identificado',
        codigo: resultado.error?.code || null
      });
    }

    return res.json({
      sucesso: true,
      numero: resultado.display_phone_number || null,
      nome_verificado: resultado.verified_name || null,
      qualidade: resultado.quality_rating || null
    });
  } catch (error) {
  console.error('Diagnóstico WhatsApp:', error.name, error.message);

  return res.status(500).json({
    sucesso: false,
    mensagem: 'Falha ao consultar a API da Meta.',
    tipo_erro: error.name || 'Erro desconhecido'
  });
}
});



// ==========================================
// TESTE CONTROLADO DE ENVIO WHATSAPP
// POST /api/teste-envio-whatsapp
// Não lê nem altera a fila de agendamentos.
// Requer Authorization: Bearer <CRON_SECRET>
// Envia somente uma mensagem fixa para o número de teste autorizado.
// ==========================================
app.post('/api/teste-envio-whatsapp', async (req, res) => {
  const segredo = process.env.CRON_SECRET;
  const autorizacao = req.get('authorization');

  if (!segredo) {
    return res.status(500).json({
      sucesso: false,
      mensagem: 'CRON_SECRET não configurado no servidor.'
    });
  }

  if (autorizacao !== `Bearer ${segredo}`) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Não autorizado.'
    });
  }

  try {
    const envio = await enviarMensagemWhatsApp({
      destinatario: '5574991947955',
      mensagem: 'Teste de envio do Syszap: a integração com a WhatsApp Cloud API está funcionando.'
    });

    return res.json({
      sucesso: true,
      mensagem: 'A Meta aceitou a mensagem de teste.',
      destinatario: '+55 74 99194-7955',
      id_mensagem_whatsapp: envio.idMensagem
    });
  } catch (error) {
    console.error('Falha no teste de envio WhatsApp:', error.message);
    return res.status(502).json({
      sucesso: false,
      mensagem: 'A API do WhatsApp recusou o envio de teste.',
      detalhe: String(error.message || 'Erro desconhecido').slice(0, 500)
    });
  }
});

// ==========================================
// 9. INICIAR SERVIDOR LOCAL
// ==========================================

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
