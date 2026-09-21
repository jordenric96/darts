const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

let alleMatchen = [];
let alleTeams = [];
let mijnPloegId = null;

window.addEventListener('DOMContentLoaded', async () => {
    if (!compId) {
        alert("Geen competitie gevonden.");
        return;
    }
    
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `competitie.html?id=${compId}`;

    // Haal het pasje op om te weten voor wie we de actieknoppen moeten tonen
    const pasjeData = localStorage.getItem(`darts_user_${compId}`);
    if (pasjeData) {
        mijnPloegId = JSON.parse(pasjeData).teamId;
    }

    await laadKalenderData();
});

async function laadKalenderData() {
    try {
        // 1. Haal alle ploegen op (voor de namen en reeksen)
        const { data: teams } = await supabaseClient.from('teams').select('id, name, division').eq('competition_id', compId);
        alleTeams = teams || [];

        // 2. Haal alle matchen op
        const { data: matches } = await supabaseClient.from('matches').select('*').eq('competition_id', compId);
        alleMatchen = matches || [];

        // 3. Vul de dropdown met alle unieke reeksen
        const divisies = [...new Set(alleTeams.map(t => t.division))].sort();
        const select = document.getElementById('select-divisie');
        select.innerHTML = divisies.map(d => `<option value="${d}">${d}</option>`).join('');

        // Zet de dropdown direct op de reeks van de ingelogde speler (indien bekend)
        if (mijnPloegId) {
            const mijnPloeg = alleTeams.find(t => t.id === mijnPloegId);
            if (mijnPloeg) select.value = mijnPloeg.division;
        }

        renderKalender();

    } catch (err) {
        console.error("Fout bij laden:", err);
        document.getElementById('kalender-container').innerHTML = `<p style="color:red; text-align:center;">Kon kalender niet laden.</p>`;
    }
}

function renderKalender() {
    const actieveDivisie = document.getElementById('select-divisie').value;
    const container = document.getElementById('kalender-container');
    
    // Filter teams van deze divisie
    const teamsInDivisie = alleTeams.filter(t => t.division === actieveDivisie).map(t => t.id);
    
    // Zoek de matchen die bij deze divisie horen (waarbij de thuisploeg in deze reeks zit)
    const matchenInDivisie = alleMatchen.filter(m => teamsInDivisie.includes(m.home_team_id));

    if (matchenInDivisie.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #aaa;">Nog geen matchen gepland in deze reeks.</p>`;
        return;
    }

    container.innerHTML = matchenInDivisie.map(match => {
        const homeTeam = alleTeams.find(t => t.id === match.home_team_id);
        const awayTeam = alleTeams.find(t => t.id === match.away_team_id);
        
        if (!homeTeam || !awayTeam) return '';

        const isMyMatch = (match.home_team_id === mijnPloegId || match.away_team_id === mijnPloegId);
        const cardClass = isMyMatch ? "match-card my-match-border" : "match-card";
        
        let actieBlok = '';

        // LOGICA VOOR DE KNOPPEN EN SCORES
        if (match.status === 'approved' || (match.home_score !== null && match.status !== 'pending_approval')) {
            // Match is definitief afgehandeld
            actieBlok = `<div class="score-display">${match.home_score} - ${match.away_score}</div>`;
        
        } else if (match.status === 'pending_approval') {
            // Score is ingevuld door 1 ploeg, wacht op het vierogenprincipe
            if (match.submitted_by_team_id === mijnPloegId) {
                // Jij hebt ingevuld, je wacht op de tegenstander
                actieBlok = `<div class="status-badge status-waiting">Wachten op bevestiging tegenstander ⏳</div>`;
            } else if (isMyMatch) {
                // Tegenstander heeft ingevuld, jij moet bevestigen!
                actieBlok = `<button class="btn-action btn-confirm" onclick="openWedstrijdblad('${match.id}')">Score Bevestigen ✅</button>`;
            } else {
                // Match van een andere ploeg die nog niet is afgerond
                actieBlok = `<div class="status-badge">Score in verwerking...</div>`;
            }
        
        } else {
            // Nog geen score ingevuld
            if (isMyMatch) {
                actieBlok = `<button class="btn-action btn-fill" onclick="openWedstrijdblad('${match.id}')">Score Invullen ✏️</button>`;
            } else {
                actieBlok = `<div class="status-badge">Nog niet gespeeld</div>`;
            }
        }

        return `
            <div class="${cardClass}">
                <div class="match-teams">
                    <div class="team-name" style="text-align: right;">${homeTeam.name}</div>
                    <div class="vs-badge">VS</div>
                    <div class="team-name" style="text-align: left;">${awayTeam.name}</div>
                </div>
                <div class="match-action">
                    ${actieBlok}
                </div>
            </div>
        `;
    }).join('');
}

function openWedstrijdblad(matchId) {
    window.location.href = `wedstrijdblad.html?compId=${compId}&matchId=${matchId}`;
}
