// js/competitie.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

window.addEventListener('DOMContentLoaded', async () => {
    const titelVeld = document.getElementById('comp-title');
    
    if (!compId) {
        titelVeld.innerText = "Geen competitie gekozen";
        return;
    }

    // 1. Haal de naam van de competitie op
    try {
        const { data, error } = await supabaseClient
            .from('competitions')
            .select('name')
            .eq('id', compId)
            .single();
            
        if (error) {
            console.error("Fout bij ophalen naam:", error.message);
            titelVeld.innerText = "Competitie (Naam onbekend)";
        } else if (data) {
            titelVeld.innerText = data.name;
        }
    } catch (err) {
        console.error("Systeemfout.", err);
        titelVeld.innerText = "Competitie";
    }

    // 2. Controleer Login Status
    controleerLoginStatus();
});

function controleerLoginStatus() {
    const opgeslagenData = localStorage.getItem(`darts_user_${compId}`);
    const badge = document.getElementById('player-badge');
    const loginKnop = document.getElementById('btn-login-knop');

    if (opgeslagenData) {
        const pasje = JSON.parse(opgeslagenData);
        document.getElementById('badge-name').innerText = pasje.playerName;
        document.getElementById('badge-team').innerText = pasje.teamName;
        
        // Gebruik 'flex' omdat we een flexbox design gebruiken
        badge.style.display = 'flex'; 
        loginKnop.style.display = 'none';
    } else {
        badge.style.display = 'none';
        loginKnop.style.display = 'flex';
    }
}

function uitloggen() {
    const zeker = confirm("Ben je zeker dat je wil uitloggen? Je hebt de code van je ploeg opnieuw nodig om in te loggen.");
    if (zeker) {
        localStorage.removeItem(`darts_user_${compId}`);
        controleerLoginStatus();
    }
}

// Uitklapfunctie voor het Nieuwsbericht
function toggleNieuws() {
    const inhoud = document.getElementById('nieuws-inhoud');
    const pijl = document.getElementById('nieuws-pijl');
    
    if (inhoud.style.display === 'none') {
        inhoud.style.display = 'block';
        pijl.innerText = 'Klap dicht ▲';
    } else {
        inhoud.style.display = 'none';
        pijl.innerText = 'Lees meer ▼';
    }
}

function gaNaarLogin() {
    window.location.href = `login.html?id=${compId}`;
}

function gaNaar(pagina) {
    window.location.href = `${pagina}?id=${compId}`;
}
