# 🍔 Burger POS & KDS - Food Truck Local-First

Sistema móvel de alta performance para food truck de hambúrguer que funciona **100% offline entre dois celulares** (iOS e Android) conectados na mesma rede Wi-Fi ou Hotspot móvel, com sincronização em nuvem via **Supabase (Outbox Pattern)** quando houver conexão com a internet.

---

## 📱 Papéis e Dispositivos

### Dispositivo 1: Frente de Caixa (Master)
- **Lançamento Rápido:** Seleção ágil de hambúrgueres (com contagem de carnes/blends), bebidas, porções e adicionais.
- **Observações Customizadas:** Ponto da carne, remoção de ingredientes ("Sem picles", "Bem passado").
- **Senha Diária Automática:** Geração sequencial (#01, #02, #03...).
- **Servidor Local WebSocket:** Dispara eventos instantâneos para a cozinha assim que o pedido é salvo no SQLite.
- **QR Code de Conexão:** Exibe modal com QR Code contendo IP local e porta para pareamento em 1 toque.
- **Alerta de Pedido Pronto:** Notificação em destaque na tela quando a cozinha marca o hambúrguer como pronto.
- **Ação de Entrega:** Finaliza o pedido e limpa a fila.
- **Dashboard Offline:** Faturamento do turno, ticket médio, quantidade de hambúrgueres e carnes vendidas, ranking de itens e horários de pico.

### Dispositivo 2: Cozinha / KDS (Client)
- **Pareamento Zero Atrito:** Lê o QR Code do Caixa com a câmera e conecta via WebSocket em milissegundos.
- **Módulo Controle de Chapa / Carnes:** Contador consolidado no topo da tela somando em tempo real quantas carnes estão pendentes na grelha (`queued` + `preparing`).
- **Fila de Pedidos FIFO:** Cards ordenados pelo tempo de espera com indicação de urgência por cores (Normal, Atenção e Urgente).
- **Ações Rápidas na Chapa:** "Iniciar Preparo" $\rightarrow$ "Marcar como Pronto".
- **Resiliência Offline:** Reconexão automática com backoff exponencial se o socket oscilar, lembrando o último IP pareado no `AsyncStorage`.
- **Prevenção de Suspensão de Tela:** `expo-keep-awake` ativo em ambas as telas.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework Mobile | React Native (Expo SDK 52) + TypeScript |
| Banco de Dados Local | SQLite Local (`expo-sqlite`) |
| Comunicação Local | WebSocket Server (Porta 8080) & WebSocket Client com Auto-Reconnect |
| Descoberta de Rede | `expo-camera` (QR Code Scanner) + `react-native-qrcode-svg` |
| Sincronização em Nuvem | Supabase PostgreSQL via **Outbox Pattern** + `@react-native-community/netinfo` |
| Testes Automatizados | Jest + ts-jest (100% dos testes unitários e de integração E2E passando) |

---

## 🚀 Como Executar o Projeto

### 1. Instalação das Dependências
```bash
npm install
```

### 2. Executar os Testes Automatizados
```bash
npm test
```

### 3. Iniciar o Aplicativo Expo
```bash
npm start
```
- Pressione `a` para abrir no emulador Android ou `i` para o simulador iOS.
- Para rodar nos aparelhos físicos, escaneie o QR Code do Expo Go.

---

## 📡 Como Conectar os Dois Celulares no Food Truck

1. **Ative o Roteador Wi-Fi ou Hotspot Móvel:**
   - No celular do Caixa (ou em um roteador 4G/5G portátil), ative o "Ponto de Acesso Pessoal" (Hotspot).
   - Conecte o celular da Cozinha na mesma rede Wi-Fi do Caixa.
2. **Abra o App no Aparelho 1 (Caixa):**
   - Selecione a aba **Frente de Caixa**.
   - Toque no botão verde no topo: **"Conectar Cozinha"**. O app exibirá o QR Code gerado com seu IP local.
3. **Abra o App no Aparelho 2 (Cozinha):**
   - Selecione a aba **Cozinha / KDS**.
   - Toque em **"Escanear QR do Caixa"** e aponte para o QR Code da tela do Caixa.
   - Conexão estabelecida instantaneamente!

---

## ☁️ Sincronização Cloud com Supabase (Outbox Pattern)

O arquivo [`DATABASE_SCHEMA.sql`](./DATABASE_SCHEMA.sql) contém o schema PostgreSQL pronto para execução no Supabase SQL Editor.
- Toda gravação no SQLite é feita com flag `synced = 0`.
- O listener de conectividade monitora a rede. Ao detectar internet, o worker envia os pedidos em lote (`upsert`) e marca os registros locais como `synced = 1`.
- Resolução de conflitos: `Client-Wins` (a integridade dos pedidos locais no caixa é soberana).
