// js/beheer-kalender.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `beheer-hub.html?id=${compId}`;
    
    // Zet de datum op vandaag als standaard
    const vandaag = new Date().toISOString().split('T')[0];
    document.getElementById('inp-startdatum').value = vandaag;
});

async function genereerKalender() {
    const startDatumString = document.getElementById('inp-startdatum').value;
    const intervalWeken = parseInt(document.getElementById('inp-interval').value);
    const msg = document.getElementById('msg-box');
    const btn = document.getElementById('btn-generate');

    if (!startDatumString) {
        toonMelding("Kies een geldige startdatum.", "red");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Bezig met berekenen... ⏳";
    toonMelding("Kalender wordt berekend...", "white");

    try {
        // 1. Controleer of er al een kalender is (voorkom dubbele generatie)
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
            // Wis oude kalender
            await supabaseClient.from('matches').delete().eq('competition_id', compId);
        }

        // 2. Haal alle ploegen op
        const { data: ploegen, error: ploegenError } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('competition_id', compId);

        if (ploegenError) throw ploegenError;
        if (!ploegen || ploegen.length < 2) throw new Error("Er zijn niet genoeg ploegen om een kalender te maken.");

        // 3. Groepeer ploegen per divisie
        const divisies = [...new Set(ploegen.map(p => p.division))];
        let alleWedstrijden = [];

        for (const divNaam of divisies) {
            const divPloegen = ploegen.filter(p => p.division === divNaam);
            const schema = genereerRoundRobin(divPloegen);
            
            // Zet het gemaakte schema om naar Supabase rijen
            schema.forEach(speeldag => {
                // Bereken de datum
                const matchDatum = new Date(startDatumString);
                matchDatum.setDate(matchDatum.getDate() + ((speeldag.matchday - 1) * 7 * intervalWeken));

                speeldag.matches.forEach(match => {
                    // Sla matchen tegen "Vrij" niet op in de database
                    if (match.home.id !== null && match.away.id !== null) {
                        alleWedstrijden.push({
                            competition_id: compId,
                            division: divNaam,
                            matchday: speeldag.matchday,
                            home_team_id: match.home.id,
                            away_team_id: match.away.id,
                            play_date: matchDatum.toISOString().split('T')[0],
                            status: 'scheduled'
                        });
                    }
                });
            });
        }

        // 4. Sla alle matchen in één keer op in Supabase
        const { error: insertError } = await supabaseClient
            .from('matches')
            .insert(alleWedstrijden);

        if (insertError) throw insertError;

        toonMelding(`Succes! ${alleWedstrijden.length} matchen zijn succesvol ingepland.`, "lime");
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
    
    // Array rotatie voorbereiding
    let currentTeams = [...teams];
    currentTeams.shift(); // Eerste ploeg blijft altijd vast staan

    // DEEL 1: HEENRONDE
    for (let day = 0; day < numDays; day++) {
        let round = { matchday: day + 1, matches: [] };
        
        let team1 = teams[0];
        let team2 = currentTeams[currentTeams.length - 1];
        
        // Wissel thuis/uit voor de vaste ploeg zodat ze niet enkel thuis spelen
        if (day % 2 === 0) {
            round.matches.push({ home: team1, away: team2 });
        } else {
            round.matches.push({ home: team2, away: team1 });
        }

        // Koppel de overige ploegen
        for (let i = 0; i < halfSize - 1; i++) {
            round.matches.push({ home: currentTeams[i], away: currentTeams[currentTeams.length - 2 - i] });
        }
        schema.push(round);
        
        // Roteer de ploegen met de klok mee voor de volgende speeldag
        currentTeams.unshift(currentTeams.pop());
    }

    // DEEL 2: TERUGRONDE
    for (let day = 0; day < numDays; day++) {
        let round = { matchday: numDays + day + 1, matches: [] };
        let heenRound = schema[day];
        
        // Keer thuis en uit simpelweg om
        heenRound.matches.forEach(match => {
            round.matches.push({ home: match.away, away: match.home });
        });
        schema.push(round);
    }

    return schema;
}
