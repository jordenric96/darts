// js/maak-competitie.js

async function maakCompetitieAan() {
    // 1. Basisgegevens
    const naam = document.getElementById('inp-naam').value.trim();
    const logoUrl = document.getElementById('inp-logo').value.trim();
    const seizoen = document.getElementById('inp-seizoen').value.trim();
    const type = document.getElementById('inp-type').value;

    // 2. Praktische info
    const speeldagen = document.getElementById('inp-dagen').value.trim();
    const startUur = document.getElementById('inp-uur').value.trim();
    const maxPloegen = document.getElementById('inp-max-ploegen').value;
    const geld = document.getElementById('inp-geld').value;
    
    // 3. Wedstrijd Formaat
    const enkels = document.getElementById('inp-enkels').value;
    const dubbels = document.getElementById('inp-dubbels').value;
    const teamgame = document.getElementById('inp-teamgame').checked;
    const format = document.getElementById('inp-format').value;

    // 4. Puntentelling & Stats
    const ptsWin = document.getElementById('inp-pts-win').value;
    const ptsDraw = document.getElementById('inp-pts-draw').value;
    const ptsLoss = document.getElementById('inp-pts-loss').value;
    const defHf = document.getElementById('inp-hf').value;
    const defSl = document.getElementById('inp-sl').value;

    if (!naam) {
        toonMelding("Gelieve minstens een naam in te vullen voor de competitie.", "red");
        return;
    }

    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "Bezig met oprichten... ⏳";

    try {
        const { data, error } = await supabaseClient
            .from('competitions')
            .insert([{
                // Algemeen
                name: naam,
                logo_url: logoUrl || null,
                season: seizoen || null,
                match_type: type,
                
                // Praktisch
                play_days: speeldagen || null,
                start_time: startUur || null,
                max_teams_per_division: maxPloegen ? parseInt(maxPloegen) : null,
                registration_fee: geld ? parseFloat(geld) : null,
                
                // Opbouw
                game_format: format,
                format_singles: parseInt(enkels),
                format_doubles: parseInt(dubbels),
                format_teamgame: teamgame,
                
                // Punten & Stats
                pts_win: parseInt(ptsWin),
                pts_draw: parseInt(ptsDraw),
                pts_loss: parseInt(ptsLoss),
                default_high_finish: parseInt(defHf),
                default_short_leg: parseInt(defSl)
            }])
            .select()
            .single();

        if (error) throw error;

        toonMelding("Competitie succesvol opgericht!", "lime");
        btn.innerText = "✅ Klaar!";
        
        // Doorsturen naar het beheer-dashboard van deze specifieke competitie
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
