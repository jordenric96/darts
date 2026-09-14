// js/beheer-kalender.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

// We houden de uitzonderingen bij in deze array
let excludedDates = [];

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `beheer-hub.html?id=${compId}`;
    
    // Zet de startdatum op vandaag als standaard
    const vandaag = new Date().toISOString().split('T')[0];
    document.getElementById('inp-startdatum').value = vandaag;

    renderUitzonderingen();
});

// --- UITZONDERINGEN BEHEREN ---

function voegUitzonderingToe() {
    const dateVal = document.getElementById('inp-uitzondering').value;
    if (!dateVal) return;
    
    if (!excludedDates.includes(dateVal)) {
        excludedDates.push(dateVal);
        excludedDates.sort(); // Sorteer chronologisch
        renderUitzonderingen();
    }
    document.getElementById('inp-uitzondering').value = ''; // Maak veld leeg
}

function verwijderUitzondering(dateStr) {
    excludedDates = excludedDates.filter(d => d !== dateStr);
    renderUitzonderingen();
}

function renderUitzonderingen() {
    const container = document.getElementById('uitzonderingen-lijst');
    if (excludedDates.length === 0) {
        container.innerHTML = '<span style="color: #aaa; font-size: 0.85rem;">Geen uitzonderingen toegevoegd.</span>';
        return;
    }

    container.innerHTML = excludedDates.map(d => `
        <div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.4); padding: 10px 15px; border-radius: 8px; border-left: 3px solid var(--c-pink); font-size: 0.9rem;">
            <span>🚫 ${d.split('-').reverse().join('-')}</span>
            <span style="color: #ff3b3b; cursor: pointer; font-weight: bold; font-size: 1.1rem;" onclick="verwijderUitzondering('${d}')">✕</span>
        </div>
    `).join('');
}

// --- KALENDER GENERATIE ---

async function genereerKalender() {
    const startDatumString = document.getElementById('inp-startdatum').value;
    const startUurString = document.getElementById('inp-startuur').value;
    const intervalWeken = parseInt(document.getElementById('inp-interval').value);
    
    const msg = document.getElementById('msg-box');
    const btn = document.getElementById('btn-generate');

    if (!startDatumString || !startUurString) {
        toonMelding("Kies een geldige startdatum en startuur.", "red");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Bezig met berekenen... ⏳";
    toonMelding("Kalender wordt berekend...", "white");

    try {
        // 1. Controleer of er al een kalender is
        const { data: bestaandeMatchen } = await supabaseClient
            .from('matches')
            .select('id')
            .eq('competition_id', compId)
            .limit(1);

        if (bestaandeMatchen && bestaandeMatchen.length > 0) {
            const overschrijven = confirm("Er bestaat al een kalender voor deze competitie! Wil je deze wissen en volledig overschrijven?");
            if (!overschrijven) {
                btn.disabled = false;
                btn.innerText = "🚀 Genereer Volledige Kalender";
                toonMelding("Geannuleerd.", "white");
                return;
            }
            await supabaseClient.from('matches').delete().eq('competition_id', compId);
        }

        // 2. Haal alle ploegen op
        const { data: ploegen, error: ploegenError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('competition_id', compId);

        if (ploegenError) throw ploegenError;
        if (!ploegen || ploegen.length < 2) throw new Error("Er zijn niet genoeg ploegen om een kalender te maken.");

        // 3. Bereken vooraf een lijst van geldige speeldatums (die NIET in de uitzonderingen vallen)
        let validDates = [];
        let testDate = new Date(startDatumString);
        
        // We berekenen max 60 speeldagen (ruim voldoende voor de grootste reeksen)
        while (validDates.length < 60) {
            let dateString = testDate.toISOString().split('T')[0];
            
            // Als deze dag NIET in onze uitsluitingen zit, is het een geldige dartsdag
            if (!excludedDates.includes(dateString)) {
                validDates.push(dateString);
            }
            
            // Tel de weken op voor de volgende test (afhankelijk van het interval)
            testDate.setDate(testDate.getDate() + (7 * intervalWeken));
        }

        // 4. Groepeer ploegen per divisie
        const divisies = [...new Set(ploegen.map(p => p.division))];
        let alleWedstrijden = [];

        for (const divNaam of divisies) {
            const divPloegen = ploegen.filter(p => p.division === divNaam);
            const schema = genereerRoundRobin(divPloegen);
            
            schema.forEach(speeldag => {
                // Haal de juiste veilige datum op uit onze lijst (speeldag 1 = index 0)
                const speelDatumVeilig = validDates[speeldag.matchday - 1];

                speeldag.matches.forEach(match => {
                    // Sla matchen tegen "Vrij" niet op in de database
                    if (match.home.id !== null && match.away.id !== null) {
                        alleWedstrijden.push({
                            competition_id: compId,
                            division: divNaam,
                            matchday: speeldag.matchday,
                            home_team_id: match.home.id,
                            away_team_id: match.away.id,
                            play_date: speelDatumVeilig,
                            play_time: startUurString,
                            status: 'scheduled'
                        });
                    }
                });
            });
        }

        // 5. Sla alle matchen in één keer op in Supabase
        const { error: insertError } = await supabaseClient
            .from('matches')
            .insert(alleWedstrijden);

        if (insertError) throw insertError;

        toonMelding(`Succes! ${alleWedstrijden.length} matchen zijn succesvol ingepland, rekening houdend met je rustweken!`, "lime");
        btn.innerText = "✅ Kalender Opgeslagen";

    } catch (err) {
        console.error(err);
        toonMelding("Fout: " + err.message, "#ff3b3b");
        btn.disabled = false;
        btn.innerText = "🚀 Genereer Volledige Kalender";
    }
}

function toonMelding(tekst, kleur) {
    const msg = document.getElementById('msg-box');
    msg.style.display = 'block';
    msg.innerText = tekst;
    msg.style.background = kleur === "lime" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
    msg.style.color = kleur;
}

// HET ROUND-ROBIN ALGORITME
function genereerRoundRobin(ploegen) {
    let teams = [...ploegen];
    
    // Bij oneven aantal ploegen voegen we een 'BYE' (Vrij) toe
    if (teams.length % 2 !== 0) {
        teams.push({ id: null, name: 'VRIJ' });
    }

    const numDays = teams.length - 1;
    const halfSize = teams.length / 2;
    let schema = [];
    
    let currentTeams = [...teams];
    currentTeams.shift(); // Eerste ploeg blijft altijd vast staan

    // DEEL 1: HEENRONDE
    for (let day = 0; day < numDays; day++) {
        let round = { matchday: day + 1, matches: [] };
        
        let team1 = teams[0];
        let team2 = currentTeams[currentTeams.length - 1];
        
        if (day % 2 === 0) {
            round.matches.push({ home: team1, away: team2 });
        } else {
            round.matches.push({ home: team2, away: team1 });
        }

        for (let i = 0; i < halfSize - 1; i++) {
            round.matches.push({ home: currentTeams[i], away: currentTeams[currentTeams.length - 2 - i] });
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
