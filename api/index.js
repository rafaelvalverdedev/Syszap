const express = require('express');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('WhatsApp Agendador está funcionando!');
});

module.exports = app;
