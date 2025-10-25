// api/payment.js - Para Vercel Serverless Functions

const SIGILOPAY_ENDPOINT = 'https://api.sigilopay.com/v1/pix/cashin/';
const SIGILOPAY_TOKEN = process.env.SIGILOPAY_TOKEN || 'lucasgomesofc77_y7tz3fryncxcfukf';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Responder OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Pegar o valor da query string
    const { amount, nome, cpf, tel, email, pedido, postback } = req.query;

    // Validar valor
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro amount obrigatório'
      });
    }

    const valor = parseFloat(amount.toString().replace(',', '.'));
    
    if (isNaN(valor) || valor < 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Valor inválido'
      });
    }

    const valorFinal = Math.round(valor * 100) / 100;

    // Validar token
    if (!SIGILOPAY_TOKEN || SIGILOPAY_TOKEN === 'lucasgomesofc77_y7tz3fryncxcfukf') {
      return res.status(401).json({
        success: false,
        error: 'Token SigiloPay não configurado'
      });
    }

    // Montar payload
    const payload = {
      amount: valorFinal,
      client: {
        name: nome || 'Cliente',
        document: cpf ? cpf.replace(/\D/g, '') : '',
        telefone: tel ? tel.replace(/\D/g, '') : '',
        email: email || ''
      },
      product: {
        name_product: pedido ? `Pedido #${pedido}` : 'Doação Ellen',
        valor_product: valorFinal.toFixed(2)
      }
    };

    if (postback) {
      payload.postbackUrl = postback;
    }

    // Fazer requisição para SigiloPay
    const response = await fetch(SIGILOPAY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SIGILOPAY_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Verificar resposta
    if (!response.ok || !data.paymentCode) {
      const errorMsg = data.message || 'sem paymentCode';
      return res.status(response.status).json({
        success: false,
        error: `Falha SigiloPay (HTTP ${response.status}): ${errorMsg}`
      });
    }

    // Retornar sucesso
    return res.status(200).json({
      success: true,
      paymentCode: data.paymentCode,
      amount: valorFinal,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.paymentCode)}`
    });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      success: false,
      error: `Erro no servidor: ${error.message}`
    });
  }
}
