package com.foodtruck.localhub

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

class LocalHubModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LocalHub")

    AsyncFunction("startServer") { port: Int ->
      synchronized(serverLock) {
        val existing = server
        if (existing != null && existing.isServerRunning && currentPort == port) {
          return@AsyncFunction true
        }

        if (existing != null) {
          try {
            existing.stop(500)
          } catch (_: Exception) {}
          server = null
        }

        val newServer = LocalHubWebSocketServer(port)
        currentPort = port
        server = newServer
        newServer.start()

        val started = newServer.awaitStart(2000L)
        if (!started) {
          try {
            newServer.stop(500)
          } catch (_: Exception) {}
          if (server === newServer) {
            server = null
          }
        }
        return@AsyncFunction started
      }
    }

    AsyncFunction("stopServer") {
      synchronized(serverLock) {
        val existing = server
        if (existing != null) {
          try {
            existing.stop(1000)
          } catch (_: Exception) {}
          server = null
        }
        return@AsyncFunction true
      }
    }

    Function("isRunning") {
      synchronized(serverLock) {
        return@Function server?.isServerRunning == true
      }
    }

    Function("getConnectedClientsCount") {
      synchronized(serverLock) {
        val openCount = server?.getOpenConnectionsCount() ?: 0
        return@Function maxOf(0, openCount - 1)
      }
    }

    Function("getLocalIps") {
      return@Function detectLocalIps()
    }

    Function("getPrimaryHotspotIp") {
      return@Function detectLocalIps().firstOrNull() ?: ""
    }
  }

  private data class IpCandidate(val ip: String, val priority: Int)

  private fun detectLocalIps(): List<String> {
    val candidates = mutableListOf<IpCandidate>()
    try {
      val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
      for (iface in interfaces) {
        if (!iface.isUp || iface.isLoopback) continue

        val name = (iface.name ?: "").lowercase()
        if (
          name.startsWith("rmnet") ||
          name.startsWith("ccmni") ||
          name.startsWith("pdp") ||
          name.startsWith("tun") ||
          name.startsWith("ppp") ||
          name.startsWith("dummy") ||
          name.startsWith("v4-")
        ) {
          continue
        }

        for (addr in Collections.list(iface.inetAddresses)) {
          if (addr is Inet4Address && !addr.isLoopbackAddress && !addr.isLinkLocalAddress && addr.isSiteLocalAddress) {
            val hostAddress = addr.hostAddress ?: continue
            val priority = when {
              name.startsWith("ap") ||
                name.startsWith("swlan") ||
                name.startsWith("softap") ||
                name == "wlan1" ||
                name == "wlan2" ||
                hostAddress.startsWith("192.168.43.") -> 1
              name.startsWith("wlan") -> 2
              else -> 3
            }
            candidates.add(IpCandidate(hostAddress, priority))
          }
        }
      }
    } catch (_: Exception) {}

    return candidates
      .sortedBy { it.priority }
      .map { it.ip }
      .distinct()
  }

  companion object {
    private val serverLock = Any()

    @Volatile
    private var server: LocalHubWebSocketServer? = null

    @Volatile
    private var currentPort: Int = 8080
  }
}
