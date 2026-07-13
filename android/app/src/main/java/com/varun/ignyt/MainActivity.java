package com.varun.ignyt;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.varun.ignyt.healthconnect.HealthConnectPlugin; // ADDED
import com.varun.ignyt.auth.AuthPlugin; // ADDED for Google Sign-In / IGNYT account

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class); // ADDED — must be before super.onCreate()
        registerPlugin(AuthPlugin.class); // ADDED — must be before super.onCreate()
        super.onCreate(savedInstanceState);
    }
}
