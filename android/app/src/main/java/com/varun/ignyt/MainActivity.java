package com.varun.ignyt;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.varun.ignyt.healthconnect.HealthConnectPlugin; // ADDED
import com.varun.ignyt.auth.AuthPlugin; // ADDED for Google Sign-In / IGNYT account
import com.varun.ignyt.cloudsync.CloudSyncPlugin; // ADDED for Firestore profile/settings sync
import com.varun.ignyt.share.SharePlugin; // ADDED for post-workout share cards

public class MainActivity extends BridgeActivity {
    // Process-lifetime flag: the artificial hold + fade-out below is only applied on the
    // first onCreate() of a cold start. A config-change recreation (rotation) still calls
    // installSplashScreen() (required each time) but skips the hold, so the splash never
    // reappears on anything but a genuine cold start.
    private static boolean sColdStartHandled = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        registerPlugin(HealthConnectPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(AuthPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(CloudSyncPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(SharePlugin.class); // ADDED — must be before super.onCreate()
        super.onCreate(savedInstanceState);

        if (!sColdStartHandled) {
            sColdStartHandled = true;
            // Hold the native splash just long enough to bridge into the WebView's own
            // boot-splash overlay (index.html #boot-splash), which owns the rest of the
            // ~2s branded hold + logo/app-name/loading-spinner. Then fade the native splash
            // out instead of a hard cut, so there's no visible seam between the two.
            final long start = System.currentTimeMillis();
            final long minDurationMs = 350;
            splashScreen.setKeepOnScreenCondition(() -> System.currentTimeMillis() - start < minDurationMs);
            splashScreen.setOnExitAnimationListener(view -> view.getView().animate()
                .alpha(0f)
                .setDuration(300)
                .withEndAction(view::remove)
                .start());
        }

        // Prevents a white flash between the native splash fading out and the WebView's
        // own CSS finishing its first paint — without this the WebView shows its platform
        // default (white) background for a frame or two on cold start.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.parseColor("#121216"));
        }
    }
}
