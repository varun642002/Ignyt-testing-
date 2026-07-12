package com.varun.ignyt;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.varun.ignyt.healthconnect.HealthConnectPlugin; // ADDED

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class); // ADDED — must be before super.onCreate()
        super.onCreate(savedInstanceState);
    }
}
