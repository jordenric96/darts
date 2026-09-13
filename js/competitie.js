// js/competitie.js

// Haal de "?id=..." uit de adresbalk
const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

let teams = [];
let matches = [];

async function laadCompetitieData() {
    if (!compId) {
        document.getElementById('comp-titel').innerText = "Fout: Geen ID";
        return;
    }

    try {
        // 1. Haal de naam van de competitie op
        const { data: compInfo } = await supabaseClient
            .from('competitions')
            .select('name')
            .eq('id', compId)
            .single();
            
        if (compInfo) {
            document.getElementById('comp-titel').innerText = compInfo.name;
        }

        // 2. Haal alle ploegen van deze competitie op
        const { data: teamData } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('competition_id', compId);
        teams = teamData || [];

        // 3. Haal de kalender op (matchen) en sorteer op speeldag
        const { data: matchData } = await supabaseClient
            .from('matches')
            .select('*')
            .eq('competition_id', compId)
            .order('match_day', { ascending: true });
        matches = matchData || [];

        // Gegevens tekenen op het scherm
        renderKlassement();
        renderKalender();
        renderPloegen();

    } catch (err) {
        console.error("Fout bij het laden:", err);
    }
}

// TAB-MENU NAVIGATIE
function switchTab(tabNaam, knopElement) {
    // Verberg alle tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    // Toon de gekozen tab
    document.getElementById('tab-' + tabNaam).classList.add('active');

    // Kleur de juiste knop blauw in het menu onderaan
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    knopElement.classList.add('active');
}

// HTML GENEREREN VOOR DE DATA
function renderKlassement() {
    const container = document.getElementById('klassement-container');
    if (teams.length === 0) { container.innerHTML = "<p>Nog geen ploegen in deze reeks.</p>"; return; }
    
    // Simpele tabel opzet (berekening van echte punten volgt later bij uitslagen)
    let html = '<table class="neon-table"><tr><th>Ploeg</th><th>Ptn</th></tr>';
    teams.forEach(team => {
        html += `<tr><td>${team.name}</td><td>0</td></tr>`; 
    });
    html += '</table>';
    container.innerHTML = html;
}

function renderKalender() {
    const container = document.getElementById('kalender-container');
    if (matches.length === 0) { container.innerHTML = "<p>Kalender is nog niet opgemaakt.</p>"; return; }
    
    let html = '';
    matches.forEach(match => {
        // Zoek de namen van de ploegen op basis van hun ID
        const thuisPloeg = teams.find(t => t.id === match.home_team_id)?.name || "Onbekend";
        const uitPloeg = teams.find(t => t.id === match.away_team_id)?.name || "Onbekend";
        
        let scoreTekst = match.status === 'Gespeeld' ? `${match.home_score} - ${match.away_score}` : '-';
        
        html += `
        <div class="match-card">
            <div class="match-day">Speeldag ${match.match_day} &bull; ${match.match_date || 'Geen datum'}</div>
            <div class="match-teams">${thuisPloeg} <span>vs</span> ${uitPloeg}</div>
            <div style="margin-top: 10px; font-weight: bold; font-size: 1.2rem; color: white;">${scoreTekst}</div>
        </div>`;
    });
    container.innerHTML = html;
}

function renderPloegen() {
    const container = document.getElementById('ploegen-container');
    let html = '';
    teams.forEach(team => {
        html += `
        <div class="ploeg-card">
            <h4>${team.name} <span class="divisie-badge">${team.division || 'Reeks A'}</span></h4>
            <p style="margin: 5px 0; color: #aaa; font-size: 0.9rem;">📍 ${team.home_location || 'Lokaal onbekend'}</p>
            <p style="margin: 0; color: #888; font-size: 0.8rem;">${team.address || ''}</p>
        </div>`;
    });
    container.innerHTML = html;
}

// Start inladen als de pagina opent
window.addEventListener('DOMContentLoaded', laadCompetitieData);
