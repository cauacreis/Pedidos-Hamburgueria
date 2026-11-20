package com.foodtruck.localhub

import android.util.Log
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import org.json.JSONArray
import org.json.JSONObject
import java.net.InetSocketAddress
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class LocalHubWebSocketServer(port: Int) : WebSocketServer(InetSocketAddress("0.0.0.0", port)) {
  private val startLatch = CountDownLatch(1)
  private val ordersLock = Any()
  private val ordersStore = LinkedHashMap<String, JSONObject>()

  @Volatile
  var startedSuccessfully = false
    private set

  @Volatile
  var isServerRunning = false
    private set

  init {
    isReuseAddr = true
    connectionLostTimeout = 30
  }

  override fun onStart() {
    startedSuccessfully = true
    isServerRunning = true
    startLatch.countDown()
    Log.i(TAG, "LocalHub WebSocketServer iniciado na porta $port")
  }

  fun awaitStart(timeoutMs: Long = 2000L): Boolean {
    return try {
      startLatch.await(timeoutMs, TimeUnit.MILLISECONDS)
      startedSuccessfully
    } catch (_: InterruptedException) {
      Thread.currentThread().interrupt()
      false
    }
  }

  fun getOpenConnectionsCount(): Int {
    return try {
      connections.count { it != null && it.isOpen }
    } catch (_: Exception) {
      0
    }
  }

  override fun onOpen(conn: WebSocket?, handshake: ClientHandshake?) {
    if (conn == null) return

    try {
      val snapshotArray = JSONArray()
      synchronized(ordersLock) {
        for (order in ordersStore.values) {
          snapshotArray.put(order)
        }
      }
      val now = System.currentTimeMillis()
      val initSync = JSONObject().apply {
        put("id", "sync_$now")
        put("timestamp", now)
        put("type", "INITIAL_SYNC")
        put("payload", JSONObject().apply {
          put("orders", snapshotArray)
          put("serverTime", now)
        })
      }
      if (conn.isOpen) {
        conn.send(initSync.toString())
      }
    } catch (e: Exception) {
      Log.w(TAG, "Erro ao enviar INITIAL_SYNC: ${e.message}")
    }

    broadcastClientCount()
  }

  override fun onMessage(conn: WebSocket?, message: String?) {
    if (message.isNullOrBlank()) return

    try {
      val msg = JSONObject(message)
      val type = msg.optString("type", "")

      if (type == "PING") {
        val now = System.currentTimeMillis()
        val pong = JSONObject().apply {
          put("id", "pong_$now")
          put("timestamp", now)
          put("type", "PONG")
        }.toString()
        if (conn != null && conn.isOpen) {
          conn.send(pong)
        }
        return
      }

      if (type == "INITIAL_SYNC") {
        val payload = msg.optJSONObject("payload")
        val incomingOrders = payload?.optJSONArray("orders")
        val mergedSyncString: String

        synchronized(ordersLock) {
          if (incomingOrders != null) {
            for (i in 0 until incomingOrders.length()) {
              val incoming = incomingOrders.optJSONObject(i) ?: continue
              val orderId = incoming.optString("id", "")
              if (orderId.isEmpty()) continue
              val existing = ordersStore[orderId]
              if (existing != null) {
                val keys = incoming.keys()
                while (keys.hasNext()) {
                  val key = keys.next()
                  existing.put(key, incoming.get(key))
                }
              } else {
                ordersStore[orderId] = incoming
              }
            }
          }

          val mergedArray = JSONArray()
          for (order in ordersStore.values) {
            mergedArray.put(order)
          }
          val now = System.currentTimeMillis()
          mergedSyncString = JSONObject().apply {
            put("id", "sync_$now")
            put("timestamp", now)
            put("type", "INITIAL_SYNC")
            put("payload", JSONObject().apply {
              put("orders", mergedArray)
              put("serverTime", now)
            })
          }.toString()
        }

        sendToOtherConnections(conn, mergedSyncString)
        return
      }

      val payload = msg.optJSONObject("payload")
      if (type == "NEW_ORDER" && payload != null) {
        val orderId = payload.optString("id", "")
        if (orderId.isNotEmpty()) {
          synchronized(ordersLock) {
            ordersStore[orderId] = payload
          }
        }
      } else if ((type == "UPDATE_ORDER_STATUS" || type == "ORDER_STATUS_CHANGED") && payload != null) {
        val orderId = payload.optString("order_id", "").ifEmpty { payload.optString("orderId", "") }
        val status = payload.optString("status", "")
        if (orderId.isNotEmpty() && status.isNotEmpty()) {
          synchronized(ordersLock) {
            ordersStore[orderId]?.put("status", status)
          }
        }
      } else if (type == "ORDER_DELETED" && payload != null) {
        synchronized(ordersLock) {
          val orderIds = payload.optJSONArray("order_ids")
          if (orderIds != null) {
            for (i in 0 until orderIds.length()) {
              val id = orderIds.optString(i, "")
              if (id.isNotEmpty()) {
                ordersStore.remove(id)
              }
            }
          }
          val singleId = payload.optString("order_id", "")
          if (singleId.isNotEmpty()) {
            ordersStore.remove(singleId)
          }
        }
      }

      sendToOtherConnections(conn, message)
    } catch (e: Exception) {
      Log.w(TAG, "Mensagem ignorada no LocalHub: ${e.message}")
    }
  }

  override fun onClose(conn: WebSocket?, code: Int, reason: String?, remote: Boolean) {
    broadcastClientCount(excludeConn = conn)
  }

  override fun onError(conn: WebSocket?, ex: Exception?) {
    Log.w(TAG, "Erro no LocalHub WebSocket: ${ex?.message ?: "desconhecido"}")
    if (conn == null) {
      isServerRunning = false
      startLatch.countDown()
    }
  }

  private fun sendToOtherConnections(sender: WebSocket?, rawMessage: String) {
    val snapshot = try {
      connections.filter { it != null && it.isOpen && it !== sender }
    } catch (_: Exception) {
      emptyList()
    }
    for (client in snapshot) {
      try {
        if (client.isOpen) {
          client.send(rawMessage)
        }
      } catch (_: Exception) {}
    }
  }

  private fun broadcastClientCount(excludeConn: WebSocket? = null) {
    val openConns = try {
      connections.filter { it != null && it.isOpen && it !== excludeConn }
    } catch (_: Exception) {
      emptyList()
    }
    val peerCount = maxOf(0, openConns.size - 1)
    val now = System.currentTimeMillis()
    val payload = JSONObject().apply {
      put("id", "count_$now")
      put("timestamp", now)
      put("type", "CLIENT_COUNT")
      put("payload", JSONObject().apply {
        put("count", peerCount)
      })
    }.toString()

    for (client in openConns) {
      try {
        if (client.isOpen) {
          client.send(payload)
        }
      } catch (_: Exception) {}
    }
  }

  companion object {
    private const val TAG = "LocalHubWS"
  }
}
