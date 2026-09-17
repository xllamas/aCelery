package com.acelery.acelery

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    private var shortcuts: HomeShortcuts? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // `acelery/serving`: Dart starts and stops [ServingService] as network
        // sharing turns on and off (lib/src/serving.dart), and the service's
        // "Stop sharing" button asks Dart to turn sharing off.
        val serving = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        serving.setMethodCallHandler { call, result ->
            when (call.method) {
                "start" -> {
                    askForNotifications()
                    try {
                        ServingService.start(this, call.argument<String>("address"))
                        result.success(null)
                    } catch (e: RuntimeException) {
                        // Android 12+ refuses to start one from the background
                        // (ForegroundServiceStartNotAllowedException).
                        result.error("start_failed", e.toString(), null)
                    }
                }
                "stop" -> {
                    ServingService.stop(this)
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
        channel = serving

        shortcuts = HomeShortcuts(this, flutterEngine.dartExecutor.binaryMessenger)
            .also { it.onIntent(intent, notify = false) }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // A home screen shortcut tapped while aCelery is already running.
        setIntent(intent)
        shortcuts?.onIntent(intent, notify = true)
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        // The server lives in this engine. Once it is gone, a notification
        // saying the phone is shared would be false.
        channel = null
        shortcuts?.dispose()
        shortcuts = null
        ServingService.stop(this)
        super.cleanUpFlutterEngine(flutterEngine)
    }

    /**
     * Android 13 hides a foreground service's notification unless this is
     * granted. The service runs either way; the notification is what tells the
     * user the phone can be reached, so it is asked for when sharing starts.
     */
    private fun askForNotifications() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        ) return
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 0)
    }

    companion object {
        private const val CHANNEL = "acelery/serving"
        private var channel: MethodChannel? = null

        /** Asks Dart to turn sharing off. False when there is no engine to ask. */
        fun requestStopSharing(): Boolean {
            val serving = channel ?: return false
            serving.invokeMethod("stopSharing", null)
            return true
        }
    }
}
