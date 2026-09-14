<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Competitie Hub</title>
    
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#1a202c">
    
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>

    <header class="top-header">
        <button class="btn-back" onclick="window.location.href='index.html'">⬅</button>
        <h2 id="comp-titel" style="color: var(--c-cyan);">Laden...</h2>
    </header>

    <main>
        <!-- LAATSTE NIEUWS / MEDEDELINGEN BANNER -->
        <div id="news-section" class="news-banner" style="display: none;">
            <div class="news-title">🚨 Laatste Nieuws & Mededelingen</div>
            <p id="news-content" class="news-text">Laden...</p>
        </div>

        <!-- HET BLOKKEN-MENU (SPELERS HUB) -->
        <div class="menu-grid" id="menu-grid" style="display: none;">
            
            <a href="#" id="link-klassement" class="menu-block">
                <span class="menu-icon">🏆</span>
                <span class="menu-text">Klassement</span>
            </a>
            
            <a href="#" id="link-kalender" class="menu-block">
                <span class="menu-icon">📅</span>
                <span class="menu-text">Kalender</span>
            </a>
            
            <a href="#" id="link-ploegen" class="menu-block">
                <span class="menu-icon">📍</span>
                <span class="menu-text">Ploegen</span>
            </a>

            <a href="#" id="link-beker" class="menu-block">
                <span class="menu-icon">🎯</span>
                <span class="menu-text">Beker</span>
            </a>
            
            <a href="#" id="link-stats" class="menu-block">
                <span class="menu-icon">📊</span>
                <span class="menu-text">Statistieken</span>
            </a>

            <a href="#" id="link-bestuur" class="menu-block">
                <span class="menu-icon">✉️</span>
                <span class="menu-text">Bestuur</span>
            </a>

        </div>
    </main>

    <!-- Scripts inladen -->
    <script src="js/supabase.js"></script>
    <script src="js/competitie.js"></script>
</body>
</html>
