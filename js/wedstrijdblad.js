const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('compId');
const matchId = urlParams.get('matchId');

let mijnPloegId = null;

window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-back').onclick = () => window.history.back();

    // Haal op met welk pasje we kijken (bepaalt wie het gemiddelde mag zien)
    const pasje = localStorage.getItem(`darts_user_${compId}`);
    if (pasje) {
        mijnPloegId = JSON.parse(pasje).teamId;
    }

    if (!compId || !matchId) {
        alert("Oeps! Match niet gevonden.");
        return;
    }

    await laadWedstrijd();
});

async function laadWedstrijd() {
    try {
        // 1. Haal de limieten van de competitie op
        const { data: comp } = await supabaseClient.from('competitions').select('default_high_finish, default_short_leg').eq('id', compId).single();
        document.getElementById('lbl-hf').innerText = comp.default_high_finish;
        document.getElementById('lbl-sl').innerText = comp.default_short_leg;

        // 2. Haal match gegevens op
        const { data: match } = await supabaseClient.from('matches').select('*, home:teams!home_team_id(name), away:teams!away_team_id(name)').eq('id', matchId).single();
        
        document.getElementById('thuis-naam').innerText = match.home.name;
        document.getElementById('uit-naam').innerText = match.away.name;

        // Vul al in als er al een score stond
        if (match.home_score !== null) document.getElementById('thuis-score').value = match.home_score;
        if (match.away_score !== null) document.getElementById('uit-score').value = match.away_score;

        // 3. Haal spelers op voor beide ploegen
        const { data: spelers } = await supabaseClient.from('players').select('*').in('team_id', [match.home_team_id, match.away_team_id]).order('name');
        
        renderSpelers('stats-thuis', spelers.filter(p => p.team_id === match.home_team_id), match.home_team_id);
        renderSpelers('stats-uit', spelers.filter(p => p.team_id === match.away_team_id), match.away_team_id);

    } catch (err) {
        console.error("Fout:", err);
    }
}

function renderSpelers(containerId, ploegSpelers, teamId) {
    const container = document.getElementById(containerId);
    const isMijnPloeg = (teamId === mijnPloegId);

    container.innerHTML = ploegSpelers.map(p => `
        <div class="player-stat-card" data-player="${p.id}" data-team="${teamId}">
            <h4>👤 ${p.name}</h4>
            
            <div class="stat-grid">
                <div>
                    <label>Aantal 180's</label>
                    <input type="number" class="inp-180" min="0" placeholder="0">
                </div>
                <div>
                    <label>High Finishes</label>
                    <input type="text" class="inp-hf" placeholder="Bv. 102, 140">
                </div>
            </div>
            
            <div style="margin-bottom: 10px;">
                <label style="font-size: 0.75rem; color: #aaa; text-transform: uppercase;">Short Legs</label>
                <input type="text" class="inp-sl" placeholder="Bv. 14, 18" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: white;">
            </div>

            ${isMijnPloeg ? `
                <div class="private-field">
                    <label>🔒 Jouw Gemiddelde (Privé)</label>
                    <input type="number" step="0.01" class="inp-avg" placeholder="Bv. 55.40" style="margin-top: 5px;">
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function indienen() {
    const sHome = document.getElementById('thuis-score').value;
    const sAway = document.getElementById('uit-score').value;

    if (sHome === "" || sAway === "") {
        alert("Vul eerst de einduitslag in bovenaan!");
        return;
    }

    try {
        // 1. Sla de matchscore op en zet status in de wachtrij
        await supabaseClient.from('matches').update({
            home_score: parseInt(sHome),
            away_score: parseInt(sAway),
            status: 'pending_approval',
            submitted_by_team_id: mijnPloegId
        }).eq('id', matchId);

        // 2. Loop door alle ingevulde stat-kaarten
        const statData = [];
        document.querySelectorAll('.player-stat-card').forEach(card => {
            const i180 = card.querySelector('.inp-180').value;
            const iHf = card.querySelector('.inp-hf').value.trim();
            const iSl = card.querySelector('.inp-sl').value.trim();
            
            const avgField = card.querySelector('.inp-avg');
            const iAvg = avgField && avgField.value ? parseFloat(avgField.value) : null;

            if (i180 > 0 || iHf || iSl || iAvg) {
                statData.push({
                    match_id: matchId,
                    team_id: card.getAttribute('data-team'),
                    player_id: card.getAttribute('data-player'),
                    score_180s: i180 ? parseInt(i180) : 0,
                    high_finishes: iHf || null,
                    short_legs: iSl || null,
                    average: iAvg
                });
            }
        });

        if (statData.length > 0) {
            // Sla de statistieken op in de database
            await supabaseClient.from('match_player_stats').upsert(statData, { onConflict: 'match_id, player_id' });
        }

        alert("Uitslag ingediend! De tegenstander moet dit nu bevestigen.");
        window.location.href = `kalender.html?id=${compId}`;

    } catch (err) {
        console.error("Fout bij opslaan:", err);
        alert("Er liep iets mis bij het opslaan van de score.");
    }
}
