const WebSocket = require('ws');
const http = require('http');

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`\n======================================================`);
  console.log(`🍔 BURGER POS & KDS - SERVIDOR LOCAL ATIVO NA PORTA ${PORT}`);
  console.log(`======================================================\n`);
});

const clients = new Set();
let ordersStore = [];

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  clients.add(ws);
  console.log(`[+] Dispositivo conectado (${clientIp}) | Total conectados: ${clients.size}`);

  // Enviar sincronização inicial dos pedidos
  ws.send(JSON.stringify({
    id: `sync_${Date.now()}`,
    timestamp: Date.now(),
    type: 'INITIAL_SYNC',
    payload: {
      orders: ordersStore,
      serverTime: Date.now(),
    }
  }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log(`[EVENTO] ${msg.type}`);

      if (msg.type === 'NEW_ORDER' && msg.payload) {
        ordersStore.push(msg.payload);
      } else if (msg.type === 'UPDATE_ORDER_STATUS' && msg.payload) {
        const orderId = msg.payload.order_id || msg.payload.orderId;
        const target = ordersStore.find(o => o.id === orderId);
        if (target) {
          target.status = msg.payload.status;
        }
      }

      // Re-transmitir o evento em tempo real para todos os clientes conectados
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data.toString());
        }
      }
    } catch (err) {
      console.error('[ERRO] Mensagem inválida recebida:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[-] Dispositivo desconectado | Restantes: ${clients.size}`);
  });

  ws.on('error', (err) => {
    clients.delete(ws);
    console.error('[-] Erro no socket cliente:', err.message);
  });
});
