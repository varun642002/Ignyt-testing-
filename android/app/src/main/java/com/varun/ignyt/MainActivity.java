package com.varun.ignyt;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.varun.ignyt.healthconnect.HealthConnectPlugin; // ADDED
import com.varun.ignyt.auth.AuthPlugin; // ADDED for Google Sign-In / IGNYT account
import com.varun.ignyt.cloudsync.CloudSyncPlugin; // ADDED for Firestore profile/settings sync
import com.varun.ignyt.share.SharePlugin; // ADDED for post-workout share cards

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(AuthPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(CloudSyncPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(SharePlugin.class); // ADDED — must be before super.onCreate()
        super.onCreate(savedInstanceState);
    }
}
