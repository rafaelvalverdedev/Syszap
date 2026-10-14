module.exports = app;
require('dotenv').config();

const express = require('express');
const supabase = require('../src/config/supabase');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('WhatsApp Agendador está funcionando!');
});

app.get('/api/teste-banco', async (req, res) => {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Erro ao consultar Supabase:', error.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: 'Não foi possível consultar o banco.'
    });
  }

  return res.json({
    sucesso: true,
    mensagem: 'Conexão com Supabase funcionando!',
    registros: data.length
  });
});

module.exports = app;
