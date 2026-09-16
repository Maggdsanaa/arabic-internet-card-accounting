package com.maggdsanaa.arabiccardaccounting;

import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.appcompat.app.AppCompatActivity;

public class LauncherActivity extends AppCompatActivity {

    private static final String APP_URL = "https://web-production-f7e5b2.up.railway.app/login";
    private static final int THEME_COLOR = 0xFF1e3a8a; // #1e3a8a

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CustomTabColorSchemeParams colorSchemeParams = new CustomTabColorSchemeParams.Builder()
                .setToolbarColor(THEME_COLOR)
                .setNavigationBarColor(THEME_COLOR)
                .build();

        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                .setShowTitle(false)
                .setDefaultColorSchemeParams(colorSchemeParams)
                .build();

        customTabsIntent.intent.setPackage("com.android.chrome");
        customTabsIntent.launchUrl(this, Uri.parse(APP_URL));
        finish();
    }
}
