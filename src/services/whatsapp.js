const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v23.0';

async function enviarMensagemWhatsApp({ destinatario, mensagem }) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error('Configure WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID.');
  }

  if (!destinatario || !mensagem) {
    throw new Error('Destinatário e mensagem são obrigatórios.');
  }

  // A Cloud API espera o número internacional sem "+" nem espaços.
  const to = String(destinatario).replace(/\D/g, '');
  if (to.length < 8 || to.length > 15) {
    throw new Error('Destinatário inválido. Use o número com código do país, DDD e número.');
  }

  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: String(mensagem)
        }
      })
    }
  );

  const resultado = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Não registrar token nem cabeçalhos no log.
    const detalhe = resultado?.error?.message || `HTTP ${response.status}`;
    const codigo = resultado?.error?.code ? ` (código ${resultado.error.code})` : '';
    throw new Error(`WhatsApp Cloud API recusou o envio: ${detalhe}${codigo}`);
  }

  const messageId = resultado?.messages?.[0]?.id;
  if (!messageId) {
    throw new Error('A API respondeu sem informar o identificador da mensagem.');
  }

  return {
    idMensagem: messageId,
    destinatario: to
  };
}

module.exports = { enviarMensagemWhatsApp };
