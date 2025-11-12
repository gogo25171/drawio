/**
 * Point d'entrée principal du plugin Code Generator
 * Ce fichier charge tous les composants nécessaires
 */

// Charger le plugin principal avec barre d'outils
(function() {
    // Utiliser la méthode recommandée pour charger les scripts
    var baseUrl = 'plugins/codegen/';
    
    // Scripts à charger dans l'ordre
    var scripts = [
        baseUrl + 'codegen-toolbar.js'
    ];
    
    // Fonction pour charger un script
    function loadScript(url, callback) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;
        
        script.onload = function() {
            console.log('Loaded:', url);
            if (callback) callback();
        };
        
        script.onerror = function() {
            console.error('Error loading:', url);
            if (callback) callback();
        };
        
        document.head.appendChild(script);
    }
    
    // Charger tous les scripts
    function loadScripts(urls, index) {
        if (index >= urls.length) {
            console.log('Code Generator Plugin: All scripts loaded');
            return;
        }
        
        loadScript(urls[index], function() {
            loadScripts(urls, index + 1);
        });
    }
    
    // Démarrer le chargement
    loadScripts(scripts, 0);
})();
