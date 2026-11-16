package com.wodbud.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Bord à bord sur toutes les versions (imposé à partir d'Android 15) :
        // la page passe sous les barres système et s'en écarte avec
        // --safe-top / --safe-bottom (SystemBars, index.css). Capacitor 9 le
        // fera lui-même ; en 8, c'est à l'app. Après super.onCreate : avant,
        // la fenêtre serait créée avec le thème de démarrage, barre d'action
        // comprise.
        EdgeToEdge.enable(this);
        // Fond du WebView avant le premier rendu : celui de l'app, clair ou
        // sombre comme le téléphone, au lieu du blanc par défaut.
        getBridge().getWebView().setBackgroundColor(ContextCompat.getColor(this, R.color.wb_background));
    }
}
