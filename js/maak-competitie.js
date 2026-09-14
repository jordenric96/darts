// js/maak-competitie.js

// Zorgt dat het aantal invulvakjes klopt met de dropdown
function updateDivisionFields() {
    const count = parseInt(document.getElementById('inp-div-count').value);
    const container = document.getElementById('division-fields-container');
    container.innerHTML = ''; // Maak leeg

    for (let i = 1; i <= count; i++) {
        let defaultName = i === 1 ? '1ste Afdeling' : (i === 2 ? '2de Afdeling' : `${i}de Afdeling`);
        if (count > 1 && i === 1) defaultName = 'Ere-Afdeling'; // Veelvoorkomende dartsterm

        container.innerHTML += `
            <input type="text" id="div-naam-${i}" placeholder="Naam Reeks ${i}" value="${defaultName}">
        `;
    }
}

async function maakCompetitie() {
    // Gegevens verzamelen
    const naam = document.getElementById('inp-naam').value.trim();
    const seizoen = document.getElementById('inp-seizoen').value.trim();
    const heeftBeker = document.getElementById('inp-beker').checked;
    const puntenSysteem = document.getElementById('inp-punten').value;
    const format = document.getElementById('inp-format').value;
    const divCount = parseInt(document.getElementById('inp-div-count').value);
    
    const errorMsg = document.getElementById('error-msg');
    const btnSave = document.getElementById('btn-save');

    if (!naam) {
        errorMsg.innerText = "De naam van de competitie is verplicht!";
        errorMsg.style.display = 'block';
        return;
    }

    // Verzamel de namen van de divisies
    let divisieNamen = [];
    for (let i = 1; i <= divCount; i++) {
        let divNaam = document.getElementById(`div-naam-${i}`).value.trim();
        if (!divNaam) divNaam = `Reeks ${i}`;
        divisieNamen.push({ name: divNaam, rank_order: i });
    }

    errorMsg.style.display = 'none';
    btnSave.innerText = "Bezig met opslaan...";
    btnSave.disabled = true;

    try {
        // 1. Sla de competitie op (zonder contactinfo en nieuws)
        const { data: compData, error: compError } = await supabaseClient
            .from('competitions')
            .insert([
                { 
                    name: naam, 
                    season: seizoen,
                    points_system: puntenSysteem,
                    match_format: format,
                    has_cup: heeftBeker
                }
            ])
            .select(); // Belangrijk: .select() geeft ons het aangemaakte ID terug!

        if (compError) throw compError;
        
        const nieuweCompId = compData[0].id;

        // 2. Sla de Divisies (Reeksen) op, gekoppeld aan de nieuwe competitie
        const divisiesToInsert = divisieNamen.map(div => ({
            competition_id: nieuweCompId,
            name: div.name,
            rank_order: div.rank_order
        }));

        const { error: divError } = await supabaseClient
            .from('divisions')
            .insert(divisiesToInsert);

        if (divError) throw divError;

        // Gelukt! Terug naar de startpagina
        window.location.href = 'index.html';

    } catch (err) {
        console.error(err);
        errorMsg.innerText = "Fout bij opslaan: " + err.message;
        errorMsg.style.display = 'block';
        btnSave.innerText = "COMPETITIE AANMAKEN";
        btnSave.disabled = false;
    }
}
