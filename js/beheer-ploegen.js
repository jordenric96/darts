// js/beheer-ploegen.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

window.addEventListener('DOMContentLoaded', () => {
    if (!compId) {
        alert("Fout: Geen competitie ID gevonden.");
        return;
    }
    
    // Terugknop naar het beheer dashboard
    const btnBack = document.getElementById('btn-back-hub');
    if (btnBack) {
        btnBack.onclick = () => window.location.href = `beheer-hub.html?id=${compId}`;
    }
    
    laadPloegen();
});

async function laadPloegen() {
    const container = document.getElementById('ploegen-lijst');
    if (!container) return;
    
    try {
        // Haal alle ploegen op, inclusief hun PIN-code
        const { data, error } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('competition_id', compId)
            .order('division', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<p style='text-align: center; color: #aaa;'>Nog geen ploegen in deze competitie.</p>";
            return;
        }

        container.innerHTML = data.map(ploeg => `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid var(--c-pink); border-radius: 10px; padding: 15px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                
                <!-- LINKER KANT: Ploeg info -->
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <span style="font-weight: bold; font-size: 1.1rem; color: white;">${ploeg.name}</span>
                        <span style="background: var(--c-cyan); color: black; font-size: 0.7rem; font-weight: bold; padding: 4px 8px; border-radius: 10px;">${ploeg.division}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: #aaa;">
                        📍 ${ploeg.home_location || 'Lokaal onbekend'}
                    </div>
                </div>
                
                <!-- RECHTER KANT: PIN code + Spelers knop -->
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                    
                    <!-- HET PIN BLOKJE -->
                    <div style="background: rgba(255, 235, 59, 0.2); border: 1px solid var(--c-yellow); color: var(--c-yellow); padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 1rem; text-align: center;">
                        <span style="font-size: 0.6rem; display: block; color: #fff; text-transform: uppercase;">Pin Code</span>
                        ${ploeg.pin_code || '----'}
                    </div>

                    <!-- SPELERS KNOP (Link is nu gecorrigeerd) -->
                    <button style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;" onclick="window.location.href='beheer-spelers.html?id=${compId}&team_id=${ploeg.id}'">
                        Spelers 👤
                    </button>
                    
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:#ff3b3b;">Fout bij laden: ${err.message}</p>`;
    }
}

async function voegPloegToe() {
    // Checken op de velden.
    const inpNaam = document.getElementById('inp-naam');
    const inpDivisie = document.getElementById('inp-divisie');
    const inpLokaal = document.getElementById('inp-lokaal');

    const naam = inpNaam ? inpNaam.value.trim() : '';
    const divisie = inpDivisie ? inpDivisie.value.trim() : '';
    const lokaal = inpLokaal ? inpLokaal.value.trim() : '';

    if (!naam || !divisie) {
        toonMelding("Naam en Reeks zijn verplicht!", "red");
        return;
    }

    // Genereer meteen een willekeurige 4-cijferige PIN code bij het toevoegen van een nieuwe ploeg
    const randomPin = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    try {
        const { error } = await supabaseClient
            .from('teams')
            .insert([{
                competition_id: compId,
                name: naam,
                division: divisie,
                home_location: lokaal,
                pin_code: randomPin
            }]);

        if (error) throw error;

        toonMelding("Ploeg succesvol toegevoegd!", "lime");
        
        // Maak velden weer leeg
        if (inpNaam) inpNaam.value = '';
        if (inpLokaal) inpLokaal.value = '';
        
        // Herlaad de lijst, de nieuwe ploeg met code staat er meteen bij
        laadPloegen();

    } catch (err) {
        console.error(err);
        toonMelding("Fout: " + err.message, "#ff3b3b");
    }
}

function toonMelding(tekst, kleur) {
    const msg = document.getElementById('msg-box');
    if (!msg) return; 
    
    msg.style.display = 'block';
    msg.innerText = tekst;
    msg.style.background = kleur === "lime" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 59, 59, 0.1)";
    msg.style.color = kleur;
    
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
}
