// js/kalender.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

let alleMatchen = [];
let teamNamen = {}; // Hierin koppelen we ID's aan ploegnamen

window.addEventListener('DOMContentLoaded', async () => {
    if (!compId) {
        document.getElementById('kalender-container').innerHTML = "<p style='color:red;'>Fout: Geen competitie geselecteerd.</p>";
        return;
    }

    // De terugknop gaat naar de publieke competitie hub
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `competitie.html?id=${compId}`;
    
    await laadData();
});

async function laadData() {
    try {
        // 1. Haal alle ploegen op om de namen te kennen
        const { data: teams, error: teamsError } = await supabaseClient
            .from('teams')
            .select('id, name')
            .eq('competition_id', compId);

        if (teamsError) throw teamsError;

        // Maak een handig 'woordenboek' van id -> naam
        teams.forEach(t => {
            teamNamen[t.id] = t.name;
        });

        // 2. Haal alle matchen op, gesorteerd op speeldag
        const { data: matches, error: matchesError } = await supabaseClient
            .from('matches')
            .select('*')
            .eq('competition_id', compId)
            .order('matchday', { ascending: true });

        if (matchesError) throw matchesError;

        alleMatchen = matches || [];

        if (alleMatchen.length === 0) {
            document.getElementById('kalender-container').innerHTML = "<p style='text-align: center; color: #aaa;'>De kalender is nog niet opgemaakt door het bestuur.</p>";
            document.getElementById('select-divisie').innerHTML = "<option value=''>Geen reeksen gevonden</option>";
            return;
        }

        // 3. Bepaal welke unieke divisies er zijn en vul de dropdown
        const divisies = [...new Set(alleMatchen.map(m => m.division))].sort();
        const select = document.getElementById('select-divisie');
        select.innerHTML = divisies.map(d => `<option value="${d}">${d}</option>`).join('');

        // Toon de kalender voor de eerste divisie in de lijst
        renderKalender();

    } catch (err) {
        console.error("Fout bij laden data:", err);
        document.getElementById('kalender-container').innerHTML = `<p style='color:#ff3b3b;'>Fout bij laden: ${err.message}</p>`;
    }
}

function renderKalender() {
    const container = document.getElementById('kalender-container');
    const geselecteerdeDivisie = document.getElementById('select-divisie').value;
    
    if (!geselecteerdeDivisie) return;

    // Filter de matchen op de gekozen divisie
    const matchenInDivisie = alleMatchen.filter(m => m.division === geselecteerdeDivisie);
    
    // Groepeer ze per speeldag
    const speeldagen = [...new Set(matchenInDivisie.map(m => m.matchday))].sort((a,b) => a - b);

    let html = '';

    speeldagen.forEach(day => {
        const matchenOpDag = matchenInDivisie.filter(m => m.matchday === day);
        
        // Formatteer de datum (van YYYY-MM-DD naar DD-MM-YYYY)
        const rawDate = matchenOpDag[0].play_date;
        const playDate = rawDate ? rawDate.split('-').reverse().join('-') : 'Onbekend';
        
        // Haal het uur op, of gebruik een standaard als het leeg is
        const playTime = matchenOpDag[0].play_time ? matchenOpDag[0].play_time.substring(0, 5) : '';

        html += `
            <div class="matchday-card">
                <div class="matchday-header">
                    <span>Speeldag ${day}</span>
                    <span style="font-size: 0.85rem;">📅 ${playDate} ${playTime ? ' - ⏰ ' + playTime : ''}</span>
                </div>
        `;

        matchenOpDag.forEach(match => {
            const homeName = teamNamen[match.home_team_id] || 'Onbekend';
            const awayName = teamNamen[match.away_team_id] || 'Onbekend';

            html += `
                <div class="match-row">
                    <span class="team-name team-home">${homeName}</span>
                    <span class="vs-badge">VS</span>
                    <span class="team-name team-away">${awayName}</span>
                </div>
            `;
        });

        html += `</div>`; // Sluit de card af
    });

    container.innerHTML = html;
}
