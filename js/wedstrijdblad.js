const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('compId');
const matchId = urlParams.get('matchId');

let matchData = null;
let mijnPloegId = null;

window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-back').onclick = () => window.history.back();
    
    // Kijk in het pasje voor wie de speler speelt
    const pasje = localStorage.getItem(`darts_user_${compId}`);
    if (pasje) mijnPloegId = JSON.parse(pasje).teamId;

    await laadWedstrijd();
});

async function laadWedstrijd() {
    // Haal match info op
    const { data: match } = await supabaseClient.from('matches').select('*, home:teams!home_team_id(name, division), away:teams!away_team_id(name)').eq('id', matchId).single();
    matchData = match;

    document.getElementById('name-home').innerText = match.home.name;
    document.getElementById('name-away').innerText = match.away.name;

    // Haal regels op voor deze specifieke divisie
    const { data: regels } = await supabaseClient.from('division_settings').select('*').eq('competition_id', compId).eq('division_name', match.home.division).single();
    
    const hfLimit = regels ? regels.high_finish_limit : 100;
    const slLimit = regels ? regels.short_leg_limit : 20;
    
    document.getElementById('lbl-hf').innerText = hfLimit;
    document.getElementById('lbl-sl').innerText = slLimit;

    // Haal spelers op van beide ploegen
    const { data: players } = await supabaseClient.from('players').select('*').in('team_id', [match.home_team_id, match.away_team_id]);
    
    renderSpelerStats('stats-home', players.filter(p => p.team_id === match.home_team_id), match.home_team_id);
    renderSpelerStats('stats-away', players.filter(p => p.team_id === match.away_team_id), match.away_team_id);
}

function renderSpelerStats(containerId, spelers, teamId) {
    const container = document.getElementById(containerId);
    const isMijnPloeg = (teamId === mijnPloegId); // Controle of dit jouw ploeg is

    container.innerHTML = spelers.map(p => `
        <div class="stat-card" data-player="${p.id}" data-team="${teamId}">
            <h4>👤 ${p.name}</h4>
            
            <div class="stat-row">
                <div>
                    <label>Aantal 180's</label>
                    <input type="number" class="inp-180" min="0" placeholder="0">
                </div>
                <div>
                    <label>High Finishes</label>
                    <input type="text" class="inp-hf" placeholder="bv. 112, 140">
                </div>
            </div>
            
            <div class="stat-row" style="grid-template-columns: 1fr;">
                <div>
                    <label>Short Legs</label>
                    <input type="text" class="inp-sl" placeholder="bv. 14, 17">
                </div>
            </div>

            <!-- PRIVÉ VELD: Gemiddelde. Enkel zichtbaar voor eigen ploeg -->
            ${isMijnPloeg ? `
                <div class="private-field">
                    <label>🔒 Jouw Gemiddelde (Privé)</label>
                    <input type="number" step="0.01" class="inp-avg" placeholder="bv. 55.40">
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function dienScoreIn() {
    const scoreHome = document.getElementById('score-home').value;
    const scoreAway = document.getElementById('score-away').value;

    if (scoreHome === "" || scoreAway === "") {
        alert("Vul de einduitslag in bovenaan!");
        return;
    }

    // 1. Sla eindscore op en zet match op "Pending" (Wachten op goedkeuring tegenstander)
    await supabaseClient.from('matches').update({
        home_score: parseInt(scoreHome),
        away_score: parseInt(scoreAway),
        submitted_by_team_id: mijnPloegId,
        status: 'pending_approval'
    }).eq('id', matchId);

    // 2. Loop door alle stat-cards en sla ze op
    const cards = document.querySelectorAll('.stat-card');
    const statsData = [];

    cards.forEach(card => {
        const playerId = card.getAttribute('data-player');
        const teamId = card.getAttribute('data-team');
        
        const i180 = card.querySelector('.inp-180').value;
        const iHf = card.querySelector('.inp-hf').value;
        const iSl = card.querySelector('.inp-sl').value;
        
        // Avg bestaat enkel in de HTML als het jouw ploeg is
        const avgInput = card.querySelector('.inp-avg');
        const iAvg = avgInput && avgInput.value ? parseFloat(avgInput.value) : null;

        if (i180 > 0 || iHf || iSl || iAvg) {
            statsData.push({
                match_id: matchId,
                player_id: playerId,
                team_id: teamId,
                score_180s: i180 ? parseInt(i180) : 0,
                high_finishes: iHf || null,
                short_legs: iSl || null,
                average: iAvg
            });
        }
    });

    if (statsData.length > 0) {
        await supabaseClient.from('match_player_stats').insert(statsData);
    }

    alert("Wedstrijdblad succesvol ingediend! Wachten op bevestiging van tegenstander.");
    window.location.href = `kalender.html?id=${compId}`;
}
