// js/maak-competitie.js

async function maakCompetitie() {
    const naam = document.getElementById('inp-naam').value.trim();
    const nieuws = document.getElementById('inp-nieuws').value.trim();
    const contact = document.getElementById('inp-contact').value.trim();
    const heeftBeker = document.getElementById('inp-beker').checked;
    const errorMsg = document.getElementById('error-msg');
    const btnSave = document.getElementById('btn-save');

    if (!naam) {
        errorMsg.innerText = "Naam is verplicht!";
        errorMsg.style.display = 'block';
        return;
    }

    errorMsg.style.display = 'none';
    btnSave.innerText = "Bezig met opslaan...";
    btnSave.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('competitions')
            .insert([
                { 
                    name: naam, 
                    latest_news: nieuws || null, 
                    contact_info: contact || null,
                    has_cup: heeftBeker
                }
            ]);

        if (error) throw error;

        // Gelukt! Terug naar het hoofdmenu
        window.location.href = 'index.html';

    } catch (err) {
        console.error(err);
        errorMsg.innerText = "Fout bij opslaan: " + err.message;
        errorMsg.style.display = 'block';
        btnSave.innerText = "AANMAKEN";
        btnSave.disabled = false;
    }
}
