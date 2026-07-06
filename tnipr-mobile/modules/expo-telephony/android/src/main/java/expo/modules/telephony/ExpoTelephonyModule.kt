package expo.modules.telephony

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.TrafficStats
import android.os.Build
import android.telephony.*
import androidx.core.app.ActivityCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoTelephonyModule : Module() {

  private var lastRxBytes: Long = -1
  private var lastTxBytes: Long = -1
  private var lastSampleMs: Long = -1

  override fun definition() = ModuleDefinition {
    Name("ExpoTelephony")

    /**
     * Returns the current cellular signal metrics from the registered cell.
     * Includes RSRP, RSRQ, SINR (LTE/5G) and calculates live DL/UL throughput
     * from TrafficStats byte counters.
     */
    AsyncFunction("getSignalStrength") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("ERR_NO_CONTEXT", "No React context available", null)
        return@AsyncFunction
      }

      val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager ?: run {
        promise.reject("ERR_NO_TM", "TelephonyManager unavailable", null)
        return@AsyncFunction
      }

      val hasPermission = ActivityCompat.checkSelfPermission(
        context, Manifest.permission.READ_PHONE_STATE
      ) == PackageManager.PERMISSION_GRANTED

      val result = mutableMapOf<String, Any?>()

      // ── Throughput from TrafficStats ──────────────────────────────────────
      val nowMs   = System.currentTimeMillis()
      val rxBytes = TrafficStats.getMobileRxBytes()
      val txBytes = TrafficStats.getMobileTxBytes()

      if (lastRxBytes >= 0 && lastSampleMs > 0) {
        val elapsedSec = (nowMs - lastSampleMs) / 1000.0
        if (elapsedSec > 0) {
          val dlKbps = ((rxBytes - lastRxBytes) * 8 / 1000.0 / elapsedSec).toLong()
          val ulKbps = ((txBytes - lastTxBytes) * 8 / 1000.0 / elapsedSec).toLong()
          result["dl_throughput"] = if (dlKbps >= 0) dlKbps else null
          result["ul_throughput"] = if (ulKbps >= 0) ulKbps else null
        }
      }
      lastRxBytes   = rxBytes
      lastTxBytes   = txBytes
      lastSampleMs  = nowMs

      // ── Signal strength ───────────────────────────────────────────────────
      if (!hasPermission) {
        result["error"] = "READ_PHONE_STATE permission not granted"
        promise.resolve(result)
        return@AsyncFunction
      }

      val cellInfoList: List<CellInfo> = try {
        tm.allCellInfo ?: emptyList()
      } catch (e: Exception) {
        emptyList()
      }

      for (info in cellInfoList) {
        if (!info.isRegistered) continue

        when {
          // ── 5G NR ──
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && info is CellInfoNr -> {
            val ss = info.cellSignalStrength as? CellSignalStrengthNr ?: continue
            val identity = info.cellIdentity as? CellIdentityNr
            
            val rsrp  = ss.ssRsrp.takeIf { it != Int.MIN_VALUE }
            val rsrq  = ss.ssRsrq.takeIf { it != Int.MIN_VALUE }
            val sinr  = ss.ssSinr.takeIf { it != Int.MIN_VALUE }
            
            result["rsrp"]       = rsrp
            result["rsrq"]       = rsrq
            result["sinr"]       = sinr
            result["technology"] = "5G"
            result["pci"]        = identity?.pci?.takeIf { it != Int.MAX_VALUE }
            result["tac"]        = identity?.tac?.takeIf { it != Int.MAX_VALUE }
            break
          }

          // ── 4G LTE ──
          info is CellInfoLte -> {
            val ss   = info.cellSignalStrength
            val identity = info.cellIdentity
            
            val rsrp = ss.rsrp.takeIf { it != Int.MIN_VALUE && it < 0 }
            val rsrq = ss.rsrq.takeIf { it != Int.MIN_VALUE && it < 0 }
            // rssnr is in units of 0.1 dB on older APIs; divide by 10
            val rssnrRaw = ss.rssnr.takeIf { it != Int.MIN_VALUE }
            val sinr = rssnrRaw?.let {
              if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) it.toDouble()
              else it / 10.0
            }
            
            result["rsrp"]       = rsrp
            result["rsrq"]       = rsrq
            result["sinr"]       = sinr
            result["technology"] = "4G"
            result["pci"]        = identity.pci.takeIf { it != Int.MAX_VALUE }
            result["ci"]         = identity.ci.takeIf { it != Int.MAX_VALUE }
            result["tac"]        = identity.tac.takeIf { it != Int.MAX_VALUE }
            break
          }

          // ── 3G WCDMA ──
          info is CellInfoWcdma -> {
            val ss = info.cellSignalStrength
            result["rscp"]       = ss.dbm.takeIf { it != Int.MIN_VALUE }
            result["technology"] = "3G"
            break
          }

          // ── 2G GSM ──
          info is CellInfoGsm -> {
            val ss = info.cellSignalStrength
            result["dbm"]        = ss.dbm.takeIf { it != Int.MIN_VALUE }
            result["technology"] = "2G"
            break
          }
        }
      }

      promise.resolve(result)
    }
  }
}
