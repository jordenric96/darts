async function maakCompetitieAan() {
    const naam = document.getElementById('inp-naam').value.trim();
    const ptsWin = document.getElementById('inp-pts-win').value;
    const ptsDraw = document.getElementById('inp-pts-draw').value;
    const ptsLoss = document.getElementById('inp-pts-loss').value;
    const defHf = document.getElementById('inp-hf').value;
    const defSl = document.getElementById('inp-sl').value;

    if (!naam) {
        toonMelding("Gelieve een naam in te vullen.", "red");
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
                pts_win: parseInt(ptsWin),
                pts_draw: parseInt(ptsDraw),
                pts_loss: parseInt(ptsLoss),
                default_high_finish: parseInt(defHf),
                default_short_leg: parseInt(defSl)
            }])
            .select()
            .single();

        if (error) throw error;

        toonMelding("Succes! Je wordt doorgestuurd.", "lime");
        btn.innerText = "✅ Klaar!";
        
        setTimeout(() => { window.location.href = `beheer-hub.html?id=${data.id}`; }, 1500);

    } catch (err) {
        console.error(err);
        toonMelding("Fout: " + err.message, "#ff3b3b");
        btn.disabled = false;
        btn.innerText = "Aanmaken 🚀";
    }
}

function toonMelding(tekst, kleur) {
    const msg = document.getElementById('msg-box');
    msg.style.display = 'block';
    msg.innerText = tekst;
    msg.style.background = kleur === "lime" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 59, 59, 0.1)";
    msg.style.color = kleur;
}
