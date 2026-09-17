package com.acelery.acelery

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.os.Build
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

/**
 * `acelery/shortcuts`: home screen shortcuts to the user's own apps
 * (lib/src/shell/home_shortcuts.dart).
 *
 * `ACeleryUserAppActivity` had an "Add Shortcut" item that sent the
 * `INSTALL_SHORTCUT` broadcast, which modern launchers ignore. This pins a
 * [ShortcutInfo] instead, so the launcher asks the user and places it.
 *
 * A shortcut opens [MainActivity] rather than an Activity of its own, because
 * the server and every screen live in its one Flutter engine. It carries the
 * app's name as an extra, never as data: a task is matched to an intent by
 * component and data, so a shortcut with no data lands on the running task
 * (singleTop delivers it to `onNewIntent`) instead of starting a second engine
 * whose server would find the port taken.
 */
class HomeShortcuts(private val activity: Activity, messenger: BinaryMessenger) {

    private val channel = MethodChannel(messenger, CHANNEL)

    /** The app a shortcut asked for, until Dart takes it. */
    private var pendingApp: String? = null

    /**
     * The launcher's word that a shortcut is on the home screen, which is when
     * the 2014 app's "Shortcut added" toast becomes true. Some launchers (MIUI
     * with its shortcut permission off) accept the request and never place it,
     * so nothing is said until this arrives.
     */
    private val pinned = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val app = intent.getStringExtra(EXTRA_APP) ?: return
            channel.invokeMethod("pinned", mapOf("app" to app))
        }
    }

    init {
        channel.setMethodCallHandler(::onMethodCall)
        val filter = IntentFilter(ACTION_PINNED)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.registerReceiver(pinned, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            activity.registerReceiver(pinned, filter)
        }
    }

    fun dispose() {
        channel.setMethodCallHandler(null)
        activity.unregisterReceiver(pinned)
    }

    /**
     * Records the app [intent] asks to open, if it came from a shortcut.
     *
     * Dart pulls it rather than having it pushed: on a cold start the IDE is
     * not listening yet, so [notify] only says there is something to take.
     */
    fun onIntent(intent: Intent?, notify: Boolean) {
        if (intent?.action != ACTION_OPEN_APP) return
        // Reopened from recents after the process died: the task still holds
        // the shortcut's intent, but the user was not asking for the app again.
        if (intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0) return
        val app = intent.getStringExtra(EXTRA_APP) ?: return
        intent.removeExtra(EXTRA_APP)
        pendingApp = app
        if (notify) channel.invokeMethod("pending", null)
    }

    private fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "take" -> {
                result.success(pendingApp)
                pendingApp = null
            }
            "pin" -> {
                val app = call.argument<String>("app")
                val icon = call.argument<ByteArray>("icon")
                if (app == null || icon == null) {
                    result.error("bad_args", "pin needs app and icon", null)
                    return
                }
                result.success(pin(app, icon))
            }
            "sync" -> {
                sync(call.argument<List<String>>("apps") ?: emptyList())
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    /**
     * Returns `requested` when the launcher will ask the user, `updated` when
     * the shortcut was already on the home screen, and `unsupported` when
     * there is no way to put it there.
     */
    private fun pin(app: String, iconPng: ByteArray): String {
        val manager = shortcutManager() ?: return "unsupported"
        val bitmap = BitmapFactory.decodeByteArray(iconPng, 0, iconPng.size)
            ?: return "unsupported"

        val info = ShortcutInfo.Builder(activity, idFor(app))
            .setShortLabel(app)
            .setLongLabel(app)
            .setIcon(Icon.createWithAdaptiveBitmap(bitmap))
            .setIntent(
                Intent(activity, MainActivity::class.java)
                    .setAction(ACTION_OPEN_APP)
                    .putExtra(EXTRA_APP, app)
            )
            .build()

        // Asking again for a pinned shortcut would put a second one on some
        // launchers. Refresh it instead, since the icon may have changed.
        val existing = manager.pinnedShortcuts.firstOrNull { it.id == info.id }
        if (existing != null) {
            if (!existing.isEnabled) manager.enableShortcuts(listOf(info.id))
            manager.updateShortcuts(listOf(info))
            return "updated"
        }

        if (!manager.isRequestPinShortcutSupported) return "unsupported"
        val callback = PendingIntent.getBroadcast(
            activity,
            app.hashCode(),
            Intent(ACTION_PINNED).setPackage(activity.packageName).putExtra(EXTRA_APP, app),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val asked = manager.requestPinShortcut(info, callback.intentSender)
        return if (asked) "requested" else "unsupported"
    }

    /**
     * Greys out the shortcuts of apps that have been deleted, and restores
     * them if an app of that name comes back. A pinned shortcut cannot be
     * removed from the home screen by the app, only disabled.
     */
    private fun sync(apps: List<String>) {
        val manager = shortcutManager() ?: return
        val present = apps.map(::idFor).toSet()
        val ours = manager.pinnedShortcuts.filter { it.id.startsWith(ID_PREFIX) }

        val gone = ours.filter { it.isEnabled && it.id !in present }.map { it.id }
        if (gone.isNotEmpty()) manager.disableShortcuts(gone, "This app was deleted")

        val back = ours.filter { !it.isEnabled && it.id in present }.map { it.id }
        if (back.isNotEmpty()) manager.enableShortcuts(back)
    }

    /**
     * Pinning needs API 26. Below that only the ignored broadcast exists, so
     * [pin] reports `unsupported`.
     */
    private fun shortcutManager(): ShortcutManager? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
        return activity.getSystemService(ShortcutManager::class.java)
    }

    companion object {
        private const val CHANNEL = "acelery/shortcuts"
        const val ACTION_OPEN_APP = "com.acelery.acelery.OPEN_APP"
        const val EXTRA_APP = "app"
        private const val ACTION_PINNED = "com.acelery.acelery.SHORTCUT_PINNED"
        private const val ID_PREFIX = "app:"

        private fun idFor(app: String) = ID_PREFIX + app
    }
}
