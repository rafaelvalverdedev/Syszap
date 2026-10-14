require('dotenv').config();

const express = require('express');
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('WhatsApp Agendador está funcionando!');
});

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

app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
