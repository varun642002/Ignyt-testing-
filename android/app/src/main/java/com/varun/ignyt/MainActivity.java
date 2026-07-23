package com.varun.ignyt;

import android.content.Intent;
import android.content.IntentSender;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.varun.ignyt.healthconnect.HealthConnectPlugin; // ADDED
import com.varun.ignyt.auth.AuthPlugin; // ADDED for Google Sign-In / IGNYT account
import com.varun.ignyt.cloudsync.CloudSyncPlugin; // ADDED for Firestore profile/settings sync
import com.varun.ignyt.share.SharePlugin; // ADDED for post-workout share cards
import com.varun.ignyt.drivebackup.DriveBackupPlugin; // ADDED for Google Drive backup/restore

public class MainActivity extends BridgeActivity {

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
        registerPlugin(HealthConnectPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(AuthPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(CloudSyncPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(SharePlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(DriveBackupPlugin.class); // ADDED — must be before super.onCreate()
        super.onCreate(savedInstanceState);
    }
}
