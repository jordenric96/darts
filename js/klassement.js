// js/klassement.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

let competitieRegels = { pts_win: 2, pts_draw: 1, pts_loss: 0 }; // Fallback
let alleTeams = [];
let alleMatchen = [];
let divisies = [];
let ingelogdTeamId = null;

window.addEventListener('DOMContentLoaded', async () => {
    if (!compId) {
        alert("Geen competitie geselecteerd.");
        return;
    }
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `competitie.html?id=${compId}`;
    
    // Kijk of we ingelogd zijn, zodat we jouw ploeg in het roze kunnen markeren
    const pasjeData = localStorage.getItem(`darts_user_${compId}`);
    if (pasjeData) {
        ingelogdTeamId = JSON.parse(pasjeData).teamId;
    }

    await laadData();
});

async function laadData() {
    try {
        // 1. Haal de regels op van DEZE competitie
        const { data: comp } = await supabaseClient.from('competitions').select('pts_win, pts_draw, pts_loss').eq('id', compId).single();
        if (comp) competitieRegels = comp;

        // 2. Haal ploegen op
        const { data: teams } = await supabaseClient.from('teams').select('*').eq('competition_id', compId);
        alleTeams = teams || [];

        // 3. Haal matchen op die al een score hebben
        const { data: matches } = await supabaseClient.from('matches').select('*').eq('competition_id', compId).not('home_score', 'is', null);
        alleMatchen = matches || [];

        // 4. Bepaal de reeksen (divisies)
        divisies = [...new Set(alleTeams.map(t => t.division))].sort();
        
        const select = document.getElementById('select-divisie');
        select.innerHTML = divisies.map(d => `<option value="${d}">${d}</option>`).join('');
        
        // Als je ingelogd bent, zet de dropdown direct op jóuw reeks
        if (ingelogdTeamId) {
            const mijnPloeg = alleTeams.find(t => t.id === ingelogdTeamId);
            if (mijnPloeg) select.value = mijnPloeg.division;
        }

        renderKlassement();

    } catch (err) {
        console.error("Fout bij laden data:", err);
        document.getElementById('klassement-body').innerHTML = `<tr><td colspan="7">Fout bij laden data.</td></tr>`;
    }
}

function renderKlassement() {
    const actieveDivisie = document.getElementById('select-divisie').value;
    const tbody = document.getElementById('klassement-body');

    // 1. Filter ploegen van deze reeks en bereid hun statistieken voor
    let stand = alleTeams
        .filter(t => t.division === actieveDivisie)
        .map(t => ({
            id: t.id,
            naam: t.name,
            gespeeld: 0,
            gewonnen: 0,
            gelijk: 0,
            verloren: 0,
            voor: 0,
            tegen: 0,
            punten: 0
        }));

    // 2. Overloop alle afgewerkte matchen en tel de punten op
    const matchenInDivisie = alleMatchen.filter(m => m.division === actieveDivisie);

    matchenInDivisie.forEach(match => {
        const home = stand.find(t => t.id === match.home_team_id);
        const away = stand.find(t => t.id === match.away_team_id);

        if (!home || !away) return; // Foutieve match data overslaan

        home.gespeeld++;
        away.gespeeld++;

        home.voor += match.home_score;
        home.tegen += match.away_score;
        away.voor += match.away_score;
        away.tegen += match.home_score;

        if (match.home_score > match.away_score) {
            // Thuis wint
            home.gewonnen++; home.punten += competitieRegels.pts_win;
            away.verloren++; away.punten += competitieRegels.pts_loss;
        } else if (match.home_score < match.away_score) {
            // Uit wint
            away.gewonnen++; away.punten += competitieRegels.pts_win;
            home.verloren++; home.punten += competitieRegels.pts_loss;
        } else {
            // Gelijkspel
            home.gelijk++; home.punten += competitieRegels.pts_draw;
            away.gelijk++; away.punten += competitieRegels.pts_draw;
        }
    });

    // 3. Sorteer het klassement! 
    // Prioriteit: 1. Punten | 2. Aantal Gewonnen | 3. Doelsaldo (+/-) | 4. Alfabetisch
    stand.sort((a, b) => {
        if (b.punten !== a.punten) return b.punten - a.punten;
        if (b.gewonnen !== a.gewonnen) return b.gewonnen - a.gewonnen;
        
        const saldoA = a.voor - a.tegen;
        const saldoB = b.voor - b.tegen;
        if (saldoB !== saldoA) return saldoB - saldoA;

        return a.naam.localeCompare(b.naam);
    });

    // 4. Toon het op het scherm
    if (stand.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7">Geen ploegen in deze reeks.</td></tr>`;
        return;
    }

    tbody.innerHTML = stand.map((ploeg, index) => {
        const isMyTeam = ploeg.id === ingelogdTeamId;
        const rowClass = isMyTeam ? "my-team-row" : "";
        const saldoTekst = `${ploeg.voor}/${ploeg.tegen}`;

        return `
            <tr class="${rowClass}">
                <td style="color: #aaa;">${index + 1}</td>
                <td class="col-ploeg">${ploeg.naam}</td>
                <td>${ploeg.gespeeld}</td>
                <td>${ploeg.gewonnen}</td>
                <td>${ploeg.verloren}</td>
                <td style="font-size: 0.8rem; color: #888;">${saldoTekst}</td>
                <td class="col-ptn">${ploeg.punten}</td>
            </tr>
        `;
    }).join('');
}
