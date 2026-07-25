package com.varun.ignyt;

import android.content.Intent;
import android.content.IntentSender;
import android.graphics.Color;
import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.varun.ignyt.healthconnect.HealthConnectPlugin; // ADDED
import com.varun.ignyt.auth.AuthPlugin; // ADDED for Google Sign-In / IGNYT account
import com.varun.ignyt.cloudsync.CloudSyncPlugin; // ADDED for Firestore profile/settings sync
import com.varun.ignyt.share.SharePlugin; // ADDED for post-workout share cards
import com.varun.ignyt.notify.NotifyPlugin; // ADDED for background workout/hydration/weekly reminders
import com.varun.ignyt.drivebackup.DriveBackupPlugin; // ADDED for Google Drive backup/restore

public class MainActivity extends BridgeActivity {
    // Process-lifetime flag: the artificial hold + fade-out below is only applied on the
    // first onCreate() of a cold start. A config-change recreation (rotation) still calls
    // installSplashScreen() (required each time) but skips the hold, so the splash never
    // reappears on anything but a genuine cold start.
    private static boolean sColdStartHandled = false;

    /** Google Drive's Authorization API hands back consent as an IntentSender, not a plain
     *  Intent, so it can't go through Capacitor's own startActivityForResult(PluginCall, ...)
     *  helper (Intent-only). DriveBackupPlugin launches it here and gets the result back
     *  through this listener instead. */
    public interface DriveAuthorizeResultListener {
        void onResult(int resultCode, Intent data);
    }

    private static final int RC_DRIVE_AUTHORIZE = 9821;
    private DriveAuthorizeResultListener driveAuthListener;

    public void launchDriveAuthorization(IntentSender intentSender, DriveAuthorizeResultListener listener) {
        this.driveAuthListener = listener;
        try {
            startIntentSenderForResult(intentSender, RC_DRIVE_AUTHORIZE, null, 0, 0, 0, null);
        } catch (IntentSender.SendIntentException e) {
            listener.onResult(RESULT_CANCELED, null);
            this.driveAuthListener = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == RC_DRIVE_AUTHORIZE) {
            DriveAuthorizeResultListener listener = this.driveAuthListener;
            this.driveAuthListener = null;
            if (listener != null) listener.onResult(resultCode, data);
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        registerPlugin(HealthConnectPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(AuthPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(CloudSyncPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(SharePlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(NotifyPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(DriveBackupPlugin.class); // ADDED — must be before super.onCreate()
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
