// supabaseClient.js - Finale Version
// Verwendet das CDN aus dem <script> Tag

console.log('[Supabase Init] Starte Initialisierung...');

// Warte bis Supabase CDN geladen ist
function waitForSupabaseCDN() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100;
        
        const check = setInterval(() => {
            attempts++;
            
            // Prüfe ob window.supabase (vom CDN) verfügbar ist
            if (window.supabase && window.supabase.createClient) {
                clearInterval(check);
                console.log('[Supabase Init] ✅ CDN geladen');
                resolve(window.supabase);
            } else if (attempts >= maxAttempts) {
                clearInterval(check);
                reject(new Error('Supabase CDN nicht geladen nach ' + maxAttempts + ' Versuchen'));
            }
        }, 50);
    });
}

// Initialisiere Supabase
(async () => {
    try {
        // Warte auf CDN
        const supabaseLib = await waitForSupabaseCDN();
        console.log('[Supabase Init] 📦 Supabase Library:', supabaseLib);
        
        // Credentials
        const supabaseUrl = "https://yvdptnkmgfxkrszitweo.supabase.co";
        const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2ZHB0bmttZ2Z4a3Jzeml0d2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDAwMzQsImV4cCI6MjA2NjI3NjAzNH0.Kd6D6IQ_stUMrcbm2TN-7ACjFJvXNmkeNehQHavTmJo";
        
        const trackingUrl = "https://lhxcnrogjjskgaclqxtm.supabase.co";
        const trackingKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoeGNucm9nampza2dhY2xxeHRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MjU0MzUsImV4cCI6MjA2ODEwMTQzNX0.vOr_Esi9IIesFixkkvYQjYEqghrKCMeqbrPKW27zqww";
        
        // Erstelle Clients mit der CDN Library
        const supabaseClient = supabaseLib.createClient(supabaseUrl, supabaseKey);
        const trackingClient = supabaseLib.createClient(trackingUrl, trackingKey);
        
        // Teste ob Client funktioniert
        if (typeof supabaseClient.from !== 'function') {
            throw new Error('Supabase Client ist ungültig - .from() Methode fehlt');
        }
        
        // Mache global verfügbar
        window.supabase = supabaseClient;
        window.trackingSupabase = trackingClient;
        
        // Für ES6 Module
        window.supabaseExports = {
            supabase: supabaseClient,
            trackingSupabase: trackingClient
        };
        
        console.log('[Supabase Init] ✅ Supabase Client erfolgreich erstellt');
        console.log('[Supabase Init] 🔍 Client Test:', typeof supabaseClient.from);
        console.log('[Supabase Init] 🔍 window.supabase:', window.supabase);
        
        // Dispatch Event
        window.dispatchEvent(new CustomEvent('supabaseReady', {
            detail: {
                supabase: supabaseClient,
                trackingSupabase: trackingClient
            }
        }));
        
        console.log('[Supabase Init] 🎉 Event "supabaseReady" dispatched');
        
    } catch (error) {
        console.error('[Supabase Init] ❌ Fehler:', error);
        console.error('[Supabase Init] ❌ Stack:', error.stack);
    }
})();

// Exports für ES6 Module
export const supabase = new Proxy({}, {
    get(target, prop) {
        if (!window.supabase) {
            console.warn('[Supabase Export] ⚠️ Supabase noch nicht bereit, verwende window.supabase stattdessen');
            return undefined;
        }
        return window.supabase[prop];
    }
});

export const trackingSupabase = new Proxy({}, {
    get(target, prop) {
        if (!window.trackingSupabase) {
            console.warn('[Supabase Export] ⚠️ TrackingSupabase noch nicht bereit');
            return undefined;
        }
        return window.trackingSupabase[prop];
    }
});

export const getSupabase = () => window.supabase;
export const getTrackingSupabase = () => window.trackingSupabase;