import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

/* The upload key. Play re-signs with its own app-signing key, so this one only
   proves an upload came from us. android/key.properties names the keystore and
   holds its passwords; it is gitignored, like the keystore, and never leaves
   this machine:

       storeFile=/Users/xavier/upload-keystore.jks
       storePassword=...
       keyAlias=android_key
       keyPassword=...

   Without it a release build falls back to the debug key, so `flutter run
   --release` still works on a checkout that has no key -- and Play refuses a
   debug-signed upload outright, so the fallback cannot reach the store. */
val keyProperties = Properties().apply {
    val file = rootProject.file("key.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val hasUploadKey = keyProperties.getProperty("storeFile") != null

android {
    namespace = "com.acelery.acelery"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // The store identity, permanent once the first build is uploaded to
        // Play. `_v2` because com.acelery.acelery belongs to the earlier
        // listing, whose signing key predates Play App Signing and cannot be
        // matched; a package name is never freed, even by deleting the app.
        // namespace above stays com.acelery.acelery: it names the code (R,
        // MainActivity), not the listing, and the two are independent.
        applicationId = "com.acelery.acelery_v2"
        // Flutter's defaults: min 24, target 36. The version comes from
        // pubspec.yaml; versionCode must rise with every upload.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasUploadKey) {
            create("upload") {
                storeFile = file(keyProperties.getProperty("storeFile"))
                storePassword = keyProperties.getProperty("storePassword")
                keyAlias = keyProperties.getProperty("keyAlias")
                keyPassword = keyProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasUploadKey) {
                signingConfigs.getByName("upload")
            } else {
                logger.warn("android/key.properties not found: signing the release " +
                    "build with the debug key, which Play will not accept.")
                signingConfigs.getByName("debug")
            }
        }
    }
}

flutter {
    source = "../.."
}
