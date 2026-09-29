# Burger POS & KDS - Documentação de Arquitetura Local-First

## 1. Visão Geral do Sistema
O **Burger POS & KDS** é uma solução de alta performance para food trucks de hambúrguer, projetada para operar em cenários de conectividade zero ou instável entre dois dispositivos móveis (iOS / Android):

```
+-------------------------------------------------------------+
|             DISPOSITIVO 1: FRENTE DE CAIXA (MASTER)         |
|  - SQLite Local (Fonte Primária da Verdade)                 |
|  - WebSocket Server (Porta 8080)                            |
|  - Gerador de QR Code com IP Local                          |
|  - Dashboard Financeiro & Insights 100% Offline             |
|  - Outbox Pattern Sync Worker (Background)                  |
+-------------------------------------------------------------+
                              ▲
                              │  Comunicação Local (Wi-Fi / Hotspot)
                              │  Zero Dependência de Internet
                              ▼
+-------------------------------------------------------------+
|             DISPOSITIVO 2: COZINHA / KDS (CLIENT)           |
|  - Leitor de QR Code (Câmera / expo-camera)                 |
|  - WebSocket Client com Auto-Reconnect & Backoff            |
|  - Módulo Chapa / Carnes Consolidado em Tempo Real          |
|  - Fila FIFO com Indicadores de Urgência por Cores          |
+-------------------------------------------------------------+
                              │
                              │  Quando houver internet disponível
                              ▼
+-------------------------------------------------------------+
|                    SUPABASE (CLOUD POSTGRES)                |
|  - Tabelas espelho: orders e order_items                    |
|  - Resolução de conflitos: Client-Wins (Caixa tem prioridade)|
+-------------------------------------------------------------+
```

---

## 2. Protocolo de Comunicação WebSocket (Zero Latência)
Mensagens trocadas no barramento TCP/WebSocket local na porta `8080`:

| Tipo de Mensagem | Origem | Destino | Descrição |
|---|---|---|---|
| `INITIAL_SYNC` | Caixa | Cozinha | Envia todos os pedidos ativos assim que a cozinha se conecta. |
| `NEW_ORDER` | Caixa | Cozinha | Dispara instantaneamente um pedido recém-criado no Caixa. |
| `UPDATE_ORDER_STATUS` | Cozinha | Caixa | Altera o status (`queued` -> `preparing` -> `ready`). |
| `ORDER_STATUS_CHANGED`| Caixa | Todos | Notifica todas as telas conectadas sobre a mudança de status. |
| `ORDER_DELIVERED` | Caixa | Cozinha | Informa que o pedido pronto foi entregue ao cliente. |
| `PING` / `PONG` | Ambos | Ambos | Heartbeat periódico para detectar quedas silenciosas de rede. |

### Formato do QR Code de Descoberta
O Caixa gera um QR Code legível pela câmera da Cozinha:
```json
{
  "host": "192.168.43.1",
  "port": 8080,
  "role": "kds",
  "timestamp": 1727650800000
}
```

---

## 3. Controle de Chapa / Carnes (Algoritmo Dinâmico)
A tela de Cozinha consolida em tempo real o total de carnes necessárias na grelha:

$$\text{Total Carnes a Grelhar} = \sum_{\text{pedidos} \in \{\text{'queued'}, \text{'preparing'}\}} \sum_{\text{itens}} (\text{quantity} \times \text{patty\_count})$$

- **Aguardando Preparo (`queued`)**: Carnes cujos pedidos ainda não foram para a chapa.
- **Na Chapa (`preparing`)**: Carnes em processo ativo de grelha.
- **Pedidos Prontos (`ready`) ou Entregues (`delivered`)**: Saem imediatamente do somatório da chapa.

---

## 4. Padrão Outbox Pattern (Sincronização em Nuvem)
1. **Gravação Local Imediata**: Toda inserção ou atualização no Caixa grava primeiro no SQLite com `synced = 0`.
2. **Monitoramento de Rede**: O listener do `@react-native-community/netinfo` vigia mudanças na conectividade.
3. **Disparo do Worker**:
   - Assim que a internet se torna disponível, busca todos os registros com `synced = 0`.
   - Executa batch `upsert` no Supabase nas tabelas `orders` e `order_items`.
   - Atualiza atomicamente os registros no SQLite para `synced = 1`.
4. **Política de Conflito**: `Client-Wins` — a verdade do food truck físico sempre prevalece.

---

## 5. Prevenção de Suspensão de Tela (Keep Awake)
O hook `useKeepAwake()` do `expo-keep-awake` é mantido ativo para impedir que o sistema operacional coloque a tela para dormir durante o horário de pico no food truck.
