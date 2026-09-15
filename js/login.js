// js/login.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

window.addEventListener('DOMContentLoaded', () => {
    if (!compId) {
        alert("Fout: Geen competitie geselecteerd.");
        return;
    }
    
    // We sturen ze voorlopig terug naar de hub
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `competitie.html?id=${compId}`;
    
    laadPloegen();
});

async function laadPloegen() {
    try {
        const { data: teams, error } = await supabaseClient
            .from('teams')
            .select('id, name, division')
            .eq('competition_id', compId)
            .order('name');
            
        if (error) throw error;
        
        const selectTeam = document.getElementById('select-team');
        let html = '<option value="">Kies je ploeg...</option>';
        teams.forEach(t => {
            html += `<option value="${t.id}">${t.name} (${t.division})</option>`;
        });
        selectTeam.innerHTML = html;
        
    } catch (err) {
        console.error(err);
        toonMelding("Fout bij het ophalen van de ploegen.", "red");
    }
}

async function laadSpelers() {
    const teamId = document.getElementById('select-team').value;
    
    // UI elementen
    const groupPlayer = document.getElementById('group-player');
    const groupPin = document.getElementById('group-pin');
    const btnLogin = document.getElementById('btn-login');
    const msgBox = document.getElementById('msg-box');
    
    // Reset en verberg bij lege selectie
    if (!teamId) {
        groupPlayer.style.display = 'none';
        groupPin.style.display = 'none';
        btnLogin.style.display = 'none';
        msgBox.style.display = 'none';
        return;
    }

    try {
        const { data: players, error } = await supabaseClient
            .from('players')
            .select('id, name')
            .eq('team_id', teamId)
            .order('name');
            
        if (error) throw error;

        const selectPlayer = document.getElementById('select-player');
        let html = '<option value="">Kies je naam...</option>';
        players.forEach(p => {
            html += `<option value="${p.id}">${p.name}</option>`;
        });
        selectPlayer.innerHTML = html;

        // Toon de rest van het formulier!
        groupPlayer.style.display = 'block';
        groupPin.style.display = 'block';
        btnLogin.style.display = 'block';

    } catch (err) {
        console.error(err);
        toonMelding("Fout bij het inladen van spelers.", "red");
    }
}

async function login() {
    const teamId = document.getElementById('select-team').value;
    const playerId = document.getElementById('select-player').value;
    let pin = document.getElementById('inp-pin').value;
    
    if (!teamId || !playerId || !pin) {
        toonMelding("Gelieve alle velden in te vullen.", "red");
        return;
    }

    // Maak de code altijd 4 cijfers lang (bv als de code 0492 is en ze typen 492 in)
    pin = pin.padStart(4, '0');

    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.innerText = "Controleren... ⏳";

    try {
        // Controleer de PIN code rechtstreeks in de database
        const { data: team, error } = await supabaseClient
            .from('teams')
            .select('pin_code, name')
            .eq('id', teamId)
            .single();
            
        if (error) throw error;

        if (team.pin_code !== pin) {
            throw new Error("Foutieve PIN-code! Vraag deze aan je ploegkapitein.");
        }

        // Pak de naam van de speler uit de dropdown voor een persoonlijke welkomstboodschap
        const playerSelect = document.getElementById('select-player');
        const playerName = playerSelect.options[playerSelect.selectedIndex].text;

        // HET DIGITALE PASJE (Opslaan in localStorage)
        const digitaalPasje = {
            teamId: teamId,
            teamName: team.name,
            playerId: playerId,
            playerName: playerName
        };
        
        // Sla het op met een unieke sleutel per competitie
        localStorage.setItem(`darts_user_${compId}`, JSON.stringify(digitaalPasje));

        toonMelding(`Pasje succesvol gekoppeld! Welkom ${playerName}.`, "lime");
        btn.innerText = "✅ Ingelogd";
        
        // Stuur ze na 1,5 seconde naar de publieke competitie pagina
        setTimeout(() => {
            window.location.href = `competitie.html?id=${compId}`;
        }, 1500);

    } catch (err) {
        toonMelding(err.message, "#ff3b3b");
        btn.disabled = false;
        btn.innerText = "Inloggen 🔒";
        document.getElementById('inp-pin').value = ''; // Maak veld weer leeg
    }
}

function toonMelding(tekst, kleur) {
    const msg = document.getElementById('msg-box');
    msg.style.display = 'block';
    msg.innerText = tekst;
    msg.style.background = kleur === "lime" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 59, 59, 0.1)";
    msg.style.color = kleur;
}
