package com.acelery.acelery

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/**
 * Keeps aCelery's server reachable with the screen off, for as long as
 * "Share on this network" is on.
 *
 * Without it the server stopped answering as soon as the screen went off. On a
 * Xiaomi running HyperOS, the vendor freezer suspended the whole process
 * (`dumpsys greezer`: "FZ ... reason : screen off"). Stock Android cuts the
 * network off in Doze instead. A foreground service is how an app tells the
 * system that the user asked for ongoing work, and its notification doubles as
 * a reminder that the phone can be reached from the network.
 *
 * The service holds no server of its own: the server lives in the Flutter
 * engine, which belongs to [MainActivity]. So this lasts only as long as that
 * engine does, and [MainActivity] stops it when the engine goes.
 *
 * Type `connectedDevice`: Android defines it as interaction with external
 * devices over a network connection, and unlike `dataSync` it has no daily
 * time limit.
 */
class ServingService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_SHARING) {
            // The notification's button. Sharing is a Dart setting, so Dart
            // turns it off, and stops this service as a consequence.
            // With no engine to ask there is no server to keep alive.
            if (!MainActivity.requestStopSharing()) stopSelf()
            return START_NOT_STICKY
        }

        val notification = buildNotification(intent?.getStringExtra(EXTRA_ADDRESS))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        // Not sticky: restarted by the system after a kill, this service would
        // come back with no engine and no server behind it.
        return START_NOT_STICKY
    }

    private fun buildNotification(address: String?): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "Sharing on the network",
                    // Low: always visible in the shade, never a sound.
                    NotificationManager.IMPORTANCE_LOW,
                ).apply {
                    description = "Shown while other devices can connect to aCelery."
                },
            )
        }

        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this,
            1,
            Intent(this, ServingService::class.java).setAction(ACTION_STOP_SHARING),
            PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return builder
            .setSmallIcon(R.drawable.ic_stat_serving)
            .setContentTitle("aCelery is shared on this network")
            .setContentText(
                if (address != null) "Approved devices can connect at $address"
                else "Approved devices can connect to your apps and databases",
            )
            .setOngoing(true)
            .setContentIntent(open)
            .addAction(
                Notification.Action.Builder(null, "Stop sharing", stop).build(),
            )
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // Show it at once rather than after Android's 10 s grace
                    // period: the point is that the user knows.
                    setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
                }
            }
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "sharing"
        private const val NOTIFICATION_ID = 8123
        private const val ACTION_STOP_SHARING = "com.acelery.acelery.STOP_SHARING"
        private const val EXTRA_ADDRESS = "address"

        fun start(context: Context, address: String?) {
            val intent = Intent(context, ServingService::class.java)
                .putExtra(EXTRA_ADDRESS, address)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, ServingService::class.java))
        }
    }
}
