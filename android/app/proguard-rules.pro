# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ADDED for R8/minification (first enabled for release builds during Play Store prep).
# Capacitor's Bridge instantiates plugins via reflection at runtime -- without these keep
# rules, R8 could strip or rename classes/methods that reflection depends on, producing a
# build that succeeds but crashes or silently breaks plugins at runtime. Standard rules for
# any Capacitor Android app, plus this project's own custom plugins.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.varun.ignyt.**.* extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# WebView <-> JS bridge: keep any @JavascriptInterface-annotated methods reachable.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ---------------------------------------------------------------------------------------
# @capacitor-firebase/authentication ships handlers for EVERY provider it supports --
# Facebook, Twitter, Play Games and so on -- in one artifact, whether or not the app uses
# them. IGNYT uses email and Apple only, so the Facebook SDK is not a dependency and R8
# fails the release build on classes that are referenced but will never be loaded.
#
# -dontwarn, NOT -keep. There is nothing to keep: the classes genuinely are not in the APK.
# The handler that references them is only constructed when its provider is invoked, which
# cannot happen without Facebook sign-in being configured. Keeping them would ask R8 to
# preserve classes that do not exist.
#
# Added when Firebase arrived with the Kotlin 2.1 bump; debug builds never showed it because
# they do not minify.
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton
