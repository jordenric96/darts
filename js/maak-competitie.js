async function maakCompetitieAan() {
    // 1. Basisgegevens
    const naam = document.getElementById('inp-naam').value.trim();
    const seizoen = document.getElementById('inp-seizoen').value.trim();
    const type = document.getElementById('inp-type').value;
    
    // 2. Wedstrijd Formaat
    const format = document.getElementById('inp-format').value;

    // 3. Puntentelling
    const ptsWin = document.getElementById('inp-pts-win').value;
    const ptsDraw = document.getElementById('inp-pts-draw').value;
    const ptsLoss = document.getElementById('inp-pts-loss').value;
    
    // 4. Statistieken
    const defHf = document.getElementById('inp-hf').value;
    const defSl = document.getElementById('inp-sl').value;

    if (!naam) {
        toonMelding("Gelieve een naam in te vullen voor de competitie.", "red");
        return;
    }

    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.innerText = "Aanmaken... ⏳";

    try {
        const { data, error } = await supabaseClient
            .from('competitions')
            .insert([{
                name: naam,
                season: seizoen || null,
                match_type: type,
                game_format: format,
                pts_win: parseInt(ptsWin),
                pts_draw: parseInt(ptsDraw),
                pts_loss: parseInt(ptsLoss),
                default_high_finish: parseInt(defHf),
                default_short_leg: parseInt(defSl)
            }])
            .select()
            .single();

        if (error) throw error;

        toonMelding("Competitie succesvol opgestart!", "lime");
        btn.innerText = "✅ Klaar!";
        
        // Na 1.5 seconde sturen we je naar je nieuwe Beheer Hub
        setTimeout(() => {
            window.location.href = `beheer-hub.html?id=${data.id}`;
        }, 1500);

    } catch (err) {
        console.error(err);
        toonMelding("Fout bij aanmaken: " + err.message, "#ff3b3b");
        btn.disabled = false;
        btn.innerText = "Competitie Aanmaken 🚀";
    }
}

function toonMelding(tekst, kleur) {
    const msg = document.getElementById('msg-box');
    msg.style.display = 'block';
    msg.innerText = tekst;
    msg.style.background = kleur === "lime" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 59, 59, 0.1)";
    msg.style.color = kleur;
}
