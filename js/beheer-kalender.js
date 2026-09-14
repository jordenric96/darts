// js/beheer-kalender.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

let excludedDates = [];
let draftMatches = []; // Hierin bewaren we het concept voordat we opslaan

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `beheer-hub.html?id=${compId}`;
    
    const vandaag = new Date().toISOString().split('T')[0];
    document.getElementById('inp-startdatum').value = vandaag;
    renderUitzonderingen();
});

// --- UITZONDERINGEN BEHEREN ---

function voegUitzonderingToe() {
    const dateVal = document.getElementById('inp-uitzondering').value;
    const reasonVal = document.getElementById('inp-reden').value.trim() || 'Vrije week';

    if (!dateVal) return;
    
    if (!excludedDates.some(e => e.date === dateVal)) {
        excludedDates.push({ date: dateVal, reason: reasonVal });
        excludedDates.sort((a, b) => a.date.localeCompare(b.date));
        renderUitzonderingen();
    }
    
    document.getElementById('inp-uitzondering').value = '';
    document.getElementById('inp-reden').value = '';
}

function verwijderUitzondering(dateStr) {
    excludedDates = excludedDates.filter(e => e.date !== dateStr);
    renderUitzonderingen();
}

function renderUitzonderingen() {
    const container = document.getElementById('uitzonderingen-lijst');
    if (excludedDates.length === 0) {
        container.innerHTML = '<span style="color: #aaa; font-size: 0.85rem;">Geen uitzonderingen toegevoegd.</span>';
        return;
    }
    container.innerHTML = excludedDates.map(e => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); padding: 10px 15px; border-radius: 8px; border-left: 3px solid var(--c-pink);">
            <div>
                <div style="font-weight: bold; font-size: 0.95rem;">🚫 ${e.date.split('-').reverse().join('-')}</div>
                <div style="color: #aaa; font-size: 0.8rem; margin-top: 3px;">ℹ️ ${e.reason}</div>
            </div>
            <span style="color: #ff3b3b; cursor: pointer; font-weight: bold; font-size: 1.2rem; padding: 5px;" onclick="verwijderUitzondering('${e.date}')">✕</span>
        </div>
    `).join('');
}

// --- KALENDER PREVIEW GENEREREN ---

async function genereerPreview() {
    const startDatumString = document.getElementById('inp-startdatum').value;
    const startUurString = document.getElementById('inp-startuur').value;
    const intervalWeken = parseInt(document.getElementById('inp-interval').value);
    
    if (!startDatumString || !startUurString) {
        toonMelding("Kies een geldige startdatum en startuur.", "red");
        return;
    }

    try {
        const { data: ploegen, error: ploegenError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('competition_id', compId);

        if (ploegenError) throw ploegenError;
        if (!ploegen || ploegen.length < 2) throw new Error("Er zijn niet genoeg ploegen om een kalender te maken.");

        // Bereken veilige speeldatums
        let validDates = [];
        let testDate = new Date(startDatumString);
        while (validDates.length < 60) {
            let dateString = testDate.toISOString().split('T')[0];
            if (!excludedDates.some(e => e.date === dateString)) {
                validDates.push(dateString);
            }
            testDate.setDate(testDate.getDate() + (7 * intervalWeken));
        }

        const divisies = [...new Set(ploegen.map(p => p.division))];
        draftMatches = []; // Maak het concept leeg

        for (const divNaam of divisies) {
            const divPloegen = ploegen.filter(p => p.division === divNaam);
            const schema = genereerRoundRobin(divPloegen);
            
            schema.forEach(speeldag => {
                const speelDatumVeilig = validDates[speeldag.matchday - 1];

                speeldag.matches.forEach(match => {
                    if (match.home.id !== null && match.away.id !== null) {
                        draftMatches.push({
                            competition_id: compId,
                            division: divNaam,
                            matchday: speeldag.matchday,
                            home_team_id: match.home.id,
                            away_team_id: match.away.id,
                            play_date: speelDatumVeilig,
                            play_time: startUurString,
                            status: 'scheduled',
                            // Deze twee tijdelijke velden gebruiken we ENKEL voor de preview!
                            _home_name: match.home.name,
                            _away_name: match.away.name
                        });
                    }
                });
            });
        }

        toonPreview();

    } catch (err) {
        toonMelding("Fout: " + err.message, "#ff3b3b");
    }
}

function toonPreview() {
    const container = document.getElementById('preview-lijst');
    let html = '';

    const divisies = [...new Set(draftMatches.map(m => m.division))];

    divisies.forEach(div => {
        html += `<h4 style="color:var(--c-cyan); margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid var(--c-cyan); padding-bottom: 5px;">${div}</h4>`;
        
        const matchenInDiv = draftMatches.filter(m => m.division === div);
        const speeldagen = [...new Set(matchenInDiv.map(m => m.matchday))].sort((a,b)=>a-b);
        
        speeldagen.forEach(day => {
            const matchenOpDag = matchenInDiv.filter(m => m.matchday === day);
            const speelDatum = matchenOpDag[0].play_date.split('-').reverse().join('-');
            
            html += `<div style="margin-top: 10px; margin-bottom: 5px; color: var(--c-yellow); font-size: 0.9rem; font-weight: bold;">
                        Speeldag ${day} (${speelDatum})
                     </div>`;
            
            matchenOpDag.forEach(m => {
                html += `<div class="match-row">
                            <span style="flex:1; text-align:right;">${m._home_name}</span>
                            <span style="margin: 0 10px; color: #aaa;">vs</span>
                            <span style="flex:1; text-align:left;">${m._away_name}</span>
                         </div>`;
            });
        });
    });

    container.innerHTML = html;
    document.getElementById('preview-sectie').style.display = 'block';
    
    // Scroll automatisch naar beneden zodat de preview zichtbaar is
    document.getElementById('preview-sectie').scrollIntoView({ behavior: 'smooth' });
}

// --- KALENDER OPSLAAN NAAR DATABASE ---

async function opslaanKalender() {
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerText = "Opslaan... ⏳";

    try {
        // Controleer of er al matchen in de database zitten en wis deze indien gewenst
        const { data: bestaandeMatchen } = await supabaseClient.from('matches').select('id').eq('competition_id', compId).limit(1);
        if (bestaandeMatchen && bestaandeMatchen.length > 0) {
            const overschrijven = confirm("Er bestaat al een kalender! Wil je deze volledig overschrijven?");
            if (!overschrijven) {
                btn.disabled = false;
                btn.innerText = "✅ Bevestig & Sla Op";
                return;
            }
            await supabaseClient.from('matches').delete().eq('competition_id', compId);
        }

        // Filter de tijdelijke namen (_home_name, _away_name) uit de data, want de database kent deze kolommen niet!
        const matchenVoorDb = draftMatches.map(m => {
            const { _home_name, _away_name, ...dbData } = m;
            return dbData;
        });

        // Sla alles op in Supabase
        const { error: insertError } = await supabaseClient.from('matches').insert(matchenVoorDb);
        if (insertError) throw insertError;

        toonMelding(`Succes! ${matchenVoorDb.length} matchen zijn definitief in de kalender opgeslagen.`, "lime");
        
        // Verberg de preview knoppen
        document.getElementById('preview-sectie').style.display = 'none';

    } catch (err) {
        console.error(err);
        toonMelding("Fout bij opslaan: " + err.message, "#ff3b3b");
        btn.disabled = false;
        btn.innerText = "✅ Bevestig & Sla Op";
    }
}

function toonMelding(tekst, kleur) {
    const msg = document.getElementById('msg-box');
    msg.style.display = 'block';
    msg.innerText = tekst;
    msg.style.background = kleur === "lime" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
    msg.style.color = kleur;
}

// --- VERBETERD ROUND-ROBIN ALGORITME (Met optimale Thuis/Uit afwisseling) ---
function genereerRoundRobin(ploegen) {
    let teams = [...ploegen];
    if (teams.length % 2 !== 0) teams.push({ id: null, name: 'VRIJ' });

    const numDays = teams.length - 1;
    const halfSize = teams.length / 2;
    let schema = [];
    
    let currentTeams = [...teams];
    currentTeams.shift(); 

    // DEEL 1: HEENRONDE
    for (let day = 0; day < numDays; day++) {
        let round = { matchday: day + 1, matches: [] };
        let team1 = teams[0];
        let team2 = currentTeams[currentTeams.length - 1];
        
        if (day % 2 === 0) round.matches.push({ home: team1, away: team2 });
        else round.matches.push({ home: team2, away: team1 });

        for (let i = 0; i < halfSize - 1; i++) {
            let tA = currentTeams[i];
            let tB = currentTeams[currentTeams.length - 2 - i];
            
            // Schakelaar voor optimale thuis/uit spreiding!
            if ((day + i) % 2 === 0) round.matches.push({ home: tA, away: tB });
            else round.matches.push({ home: tB, away: tA });
        }
        schema.push(round);
        currentTeams.unshift(currentTeams.pop());
    }

    // DEEL 2: TERUGRONDE
    for (let day = 0; day < numDays; day++) {
        let round = { matchday: numDays + day + 1, matches: [] };
        let heenRound = schema[day];
        
        heenRound.matches.forEach(match => {
            round.matches.push({ home: match.away, away: match.home });
        });
        schema.push(round);
    }
    return schema;
}
