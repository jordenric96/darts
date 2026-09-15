// js/login.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

let alleSpelers = [];
let geselecteerdeSpeler = null;

window.addEventListener('DOMContentLoaded', async () => {
    if (!compId) {
        alert("Fout: Geen competitie geselecteerd.");
        return;
    }
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `competitie.html?id=${compId}`;
    
    await laadAlleSpelers();
});

async function laadAlleSpelers() {
    try {
        // Haal in 1 keer alle spelers op mét de naam van hun ploeg
        const { data, error } = await supabaseClient
            .from('players')
            .select(`
                id, 
                name, 
                team_id, 
                teams!inner (name, competition_id)
            `)
            .eq('teams.competition_id', compId);

        if (error) throw error;
        
        // Formatteer de data zodat we er makkelijk in kunnen zoeken
        alleSpelers = data.map(p => ({
            id: p.id,
            naam: p.name,
            teamId: p.team_id,
            teamNaam: p.teams.name
        }));

    } catch (err) {
        console.error("Fout bij laden spelers:", err);
    }
}

// Wordt getriggerd elke keer als je een letter typt
function zoekSpeler() {
    const input = document.getElementById('inp-search').value.toLowerCase().trim();
    const resultBox = document.getElementById('search-results');
    
    // Begin pas te zoeken vanaf 2 getypte letters
    if (input.length < 2) {
        resultBox.style.display = 'none';
        return;
    }

    const matches = alleSpelers.filter(p => p.naam.toLowerCase().includes(input));
    
    if (matches.length === 0) {
        resultBox.innerHTML = '<div class="autocomplete-item" style="color: #888;">Geen speler gevonden...</div>';
    } else {
        resultBox.innerHTML = matches.map(p => `
            <div class="autocomplete-item" onclick="kiesSpeler('${p.id}', '${p.naam.replace(/'/g, "\\'")}', '${p.teamId}', '${p.teamNaam.replace(/'/g, "\\'")}')">
                <div style="font-weight:bold; font-size: 1.05rem;">${p.naam}</div>
                <div style="font-size:0.8rem; color:#aaa;">${p.teamNaam}</div>
            </div>
        `).join('');
    }
    resultBox.style.display = 'block';
}

// Wordt uitgevoerd als de speler zijn naam aanklikt in de lijst
function kiesSpeler(id, naam, teamId, teamNaam) {
    geselecteerdeSpeler = { id, naam, teamId, teamNaam };
    
    // Vul de zoekbalk netjes in en verberg de dropdown
    document.getElementById('inp-search').value = naam;
    document.getElementById('search-results').style.display = 'none';
    
    // Toon het veld voor de PIN code
    document.getElementById('team-hint').innerText = `Jij speelt voor: ${teamNaam}`;
    document.getElementById('group-pin').style.display = 'block';
    document.getElementById('btn-login').style.display = 'block';
    
    // Focus direct op het PIN veld voor gsm gebruikers
    document.getElementById('inp-pin').focus();
}

async function login() {
    if (!geselecteerdeSpeler) return;
    
    let pin = document.getElementById('inp-pin').value;
    if (!pin) {
        toonMelding("Vul de 4-cijferige code in.", "red");
        return;
    }

    pin = pin.padStart(4, '0');

    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.innerText = "Controleren... ⏳";

    try {
        // Veilige kluis-controle via database functie
        const { data: isGeldig, error: rpcError } = await supabaseClient
            .rpc('check_team_pin', { t_id: geselecteerdeSpeler.teamId, p_code: pin });
            
        if (rpcError) throw rpcError;

        if (!isGeldig) throw new Error("Foutieve PIN-code! Vraag deze aan je ploegkapitein.");

        // Pasje aanmaken en opslaan in de telefoon
        const digitaalPasje = {
            teamId: geselecteerdeSpeler.teamId,
            teamName: geselecteerdeSpeler.teamNaam,
            playerId: geselecteerdeSpeler.id,
            playerName: geselecteerdeSpeler.naam
        };
        
        localStorage.setItem(`darts_user_${compId}`, JSON.stringify(digitaalPasje));

        toonMelding(`Pasje gekoppeld! Welkom ${geselecteerdeSpeler.naam}.`, "lime");
        btn.innerText = "✅ Ingelogd";
        
        setTimeout(() => window.location.href = `competitie.html?id=${compId}`, 1500);

    } catch (err) {
        toonMelding(err.message, "#ff3b3b");
        btn.disabled = false;
        btn.innerText = "Inloggen 🔒";
        document.getElementById('inp-pin').value = ''; 
    }
}

function toonMelding(tekst, kleur) {
    const msg = document.getElementById('msg-box');
    msg.style.display = 'block';
    msg.innerText = tekst;
    msg.style.background = kleur === "lime" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 59, 59, 0.1)";
    msg.style.color = kleur;
}
