// js/maak-competitie.js

window.addEventListener('DOMContentLoaded', () => {
    // Genereer de standaard matchen bij het laden (Bv. 8 stuks)
    genereerMatchStructuur();
});

// Zorgt voor de dynamische lijst van matchen (Solo/Dubbel)
function genereerMatchStructuur() {
    const container = document.getElementById('match-structure-container');
    const aantal = parseInt(document.getElementById('inp-total-matches').value) || 0;
    
    container.innerHTML = '';
    
    for(let i = 1; i <= aantal; i++) {
        container.innerHTML += `
            <div class="form-group" style="margin-bottom: 5px;">
                <label style="font-size: 0.7rem; color: var(--c-cyan);">Match ${i}</label>
                <select class="match-type-sel">
                    <option value="solo">Solo</option>
                    <option value="dubbel">Dubbel</option>
                </select>
            </div>
        `;
    }
}

// Voegt een extra rij toe voor contactpersonen
function voegContactToe() {
    const container = document.getElementById('contacts-container');
    container.innerHTML += `
        <div class="contact-row">
            <input type="text" class="c-naam" placeholder="Naam">
            <input type="text" class="c-rol" placeholder="Functie (Bv. Penningmeester)">
            <input type="text" class="c-tel" placeholder="Gsm">
            <input type="text" class="c-email" placeholder="E-mailadres">
        </div>
    `;
}

async function maakCompetitieAan() {
    // 1. Basis
    const naam = document.getElementById('inp-naam').value.trim();
    const logoUrl = document.getElementById('inp-logo').value.trim();
    const seizoen = document.getElementById('inp-seizoen').value.trim();
    const reeksen = document.getElementById('inp-reeksen').value;

    // 2. Praktisch (Verzamel aangevinkte dagen)
    const dagenCheckboxes = document.querySelectorAll('.cb-day:checked');
    const speeldagen = Array.from(dagenCheckboxes).map(cb => cb.value); 
    
    const startUur = document.getElementById('inp-uur').value.trim();
    const geld = document.getElementById('inp-geld').value;
    
    // 3. Structuur Wedstrijdblad
    const format = document.getElementById('inp-format').value;
    const teamgame = document.getElementById('inp-teamgame').checked;
    
    // Verzamel de structuur (bv. ["solo", "solo", "dubbel"...])
    const matchSelects = document.querySelectorAll('.match-type-sel');
    const matchStructuur = Array.from(matchSelects).map(sel => sel.value);

    // 4. Contactpersonen verzamelen (Lege namen negeren)
    const contactRijen = document.querySelectorAll('.contact-row');
    let contactenLijst = [];
    contactRijen.forEach(rij => {
        const cNaam = rij.querySelector('.c-naam').value.trim();
        if(cNaam) {
            contactenLijst.push({
                naam: cNaam,
                rol: rij.querySelector('.c-rol').value.trim(),
                tel: rij.querySelector('.c-tel').value.trim(),
                email: rij.querySelector('.c-email').value.trim()
            });
        }
    });

    // 5. Punten & Limieten
    const ptsWin = document.getElementById('inp-pts-win').value;
    const ptsDraw = document.getElementById('inp-pts-draw').value;
    const ptsLoss = document.getElementById('inp-pts-loss').value;
    const defHf = document.getElementById('inp-hf').value;
    const defSl = document.getElementById('inp-sl').value;

    // 6. Publieke Subklassementen
    const subKlassementen = {
        toon_180s: document.getElementById('chk-stat-180').checked,
        toon_hf: document.getElementById('chk-stat-hf').checked,
        toon_sl: document.getElementById('chk-stat-sl').checked
    };

    if (!naam) {
        toonMelding("Geef minstens een naam op voor de competitie.", "red");
        return;
    }

    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "Bezig met oprichten... ⏳";

    try {
        const { data, error } = await supabaseClient
            .from('competitions')
            .insert([{
                name: naam,
                logo_url: logoUrl || null,
                season: seizoen || null,
                num_divisions: parseInt(reeksen) || 1,
                match_type: 'competitie', // Standaardwaarde
                
                play_days: JSON.stringify(speeldagen),
                start_time: startUur || null,
                registration_fee: geld ? parseFloat(geld) : null,
                
                game_format: format,
                match_structure: matchStructuur, // Dit wordt als JSON opgeslagen
                format_teamgame: teamgame,
                
                contacts: contactenLijst, // Dit wordt als JSON opgeslagen
                
                pts_win: parseInt(ptsWin),
                pts_draw: parseInt(ptsDraw),
                pts_loss: parseInt(ptsLoss),
                default_high_finish: parseInt(defHf),
                default_short_leg: parseInt(defSl),
                
                sub_classifications: subKlassementen // Dit wordt als JSON opgeslagen
            }])
            .select()
            .single();

        if (error) throw error;

        toonMelding("Competitie succesvol opgericht!", "lime");
        btn.innerText = "✅ Klaar!";
        
        // Na 1.5 seconde doorsturen naar de beheer-hub van deze competitie
        setTimeout(() => {
            window.location.href = `beheer-hub.html?id=${data.id}`;
        }, 1500);

    } catch (err) {
        console.error(err);
        toonMelding("Fout bij aanmaken: " + err.message, "#ff3b3b");
        btn.disabled = false;
        btn.innerText = "Competitie Oprichten 🚀";
    }
}

function toonMelding(tekst, kleur) {
    const msg = document.getElementById('msg-box');
    msg.style.display = 'block';
    msg.innerText = tekst;
    msg.style.background = kleur === "lime" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 59, 59, 0.1)";
    msg.style.color = kleur;
}
