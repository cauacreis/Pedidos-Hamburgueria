const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}
const DIST_DIR = path.join(__dirname, 'dist');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(DIST_DIR, reqPath === '/' ? 'index.html' : reqPath);

  // Fallback to index.html for SPA if file doesn't exist
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const wss = new WebSocket.Server({ server });

console.log(`\n======================================================`);
console.log(`🍔 BODEGA DO VIDIGAL - POS & KDS LOCAL NA PORTA ${PORT}`);
console.log(`📡 Acesse no navegador: http://localhost:${PORT}`);
console.log(`======================================================\n`);

const clients = new Set();
let ordersStore = [];

function broadcastClientCount() {
  const payload = JSON.stringify({
    id: `count_${Date.now()}`,
    timestamp: Date.now(),
    type: 'CLIENT_COUNT',
    payload: {
      count: clients.size,
    },
  });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  clients.add(ws);
  console.log(`[+] Dispositivo conectado (${clientIp}) | Total conectados: ${clients.size}`);
  broadcastClientCount();

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

      if (msg.type === 'PING') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ id: `pong_${Date.now()}`, timestamp: Date.now(), type: 'PONG' }));
        }
        return;
      }

      console.log(`[EVENTO] ${msg.type}`);

      if (msg.type === 'INITIAL_SYNC' && msg.payload && Array.isArray(msg.payload.orders)) {
        for (const incoming of msg.payload.orders) {
          if (!incoming || !incoming.id) continue;
          const idx = ordersStore.findIndex(o => o.id === incoming.id);
          if (idx >= 0) {
            ordersStore[idx] = { ...ordersStore[idx], ...incoming };
          } else {
            ordersStore.push(incoming);
          }
        }
        const syncMsg = JSON.stringify({
          id: `sync_${Date.now()}`,
          timestamp: Date.now(),
          type: 'INITIAL_SYNC',
          payload: {
            orders: ordersStore,
            serverTime: Date.now(),
          },
        });
        for (const client of clients) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(syncMsg);
          }
        }
        return;
      }

      if (msg.type === 'NEW_ORDER' && msg.payload) {
        const exists = ordersStore.some(o => o.id === msg.payload.id);
        if (!exists) {
          ordersStore.push(msg.payload);
        }
      } else if ((msg.type === 'UPDATE_ORDER_STATUS' || msg.type === 'ORDER_STATUS_CHANGED') && msg.payload) {
        const orderId = msg.payload.order_id || msg.payload.orderId;
        const target = ordersStore.find(o => o.id === orderId);
        if (target) {
          target.status = msg.payload.status;
        }
      } else if (msg.type === 'ORDER_DELETED' && msg.payload) {
        const ids = msg.payload.order_ids || (msg.payload.order_id ? [msg.payload.order_id] : []);
        if (ids.length > 0) {
          ordersStore = ordersStore.filter(o => !ids.includes(o.id));
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
    broadcastClientCount();
  });

  ws.on('error', (err) => {
    clients.delete(ws);
    console.error('[-] Erro no socket cliente:', err.message);
    broadcastClientCount();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[HTTP/WS] Ouvindo em 0.0.0.0:${PORT}`);
  const ips = getLocalIPv4Addresses();
  if (ips.length > 0) {
    console.log('[REDE LOCAL / HOTSPOT] IPs disponíveis neste aparelho:');
    for (const ip of ips) {
      console.log(`  -> ${ip.name}: http://${ip.address}:${PORT} (WS: ${ip.address}:${PORT})`);
    }
  } else {
    console.log('[REDE LOCAL / HOTSPOT] Nenhum IP IPv4 externo detectado.');
  }
});
