// js/maak-competitie.js

window.addEventListener('DOMContentLoaded', () => {
    updateDivisionFields();
    generateMatchBuilder();
    
    // Initialiseer het verslepen van de gelijke stand (Tiebreakers)
    const tiebreakerList = document.getElementById('tiebreaker-list');
    new Sortable(tiebreakerList, {
        handle: '.drag-handle', // Enkel verslepen als je de 3 streepjes vastpakt
        animation: 150,
        ghostClass: 'sortable-ghost'
    });
});

// --- UI FUNCTIES ---

function updateDivisionFields() {
    const count = parseInt(document.getElementById('inp-div-count').value);
    const container = document.getElementById('division-fields-container');
    container.innerHTML = ''; 

    for (let i = 1; i <= count; i++) {
        let defaultName = `Reeks ${i}`;
        if (i === 1) defaultName = '1ste Afdeling';
        if (count > 1 && i === 1) defaultName = 'Ere-Afdeling';

        container.innerHTML += `
            <input type="text" id="div-naam-${i}" placeholder="Naam Reeks ${i}" value="${defaultName}">
        `;
    }
}

function toggleDrawField() {
    const isChecked = document.getElementById('allow-draw').checked;
    document.getElementById('draw-field').style.display = isChecked ? 'block' : 'none';
}

function generateMatchBuilder() {
    let count = parseInt(document.getElementById('inp-game-count').value);
    if(isNaN(count) || count < 1) count = 1;
    if(count > 30) count = 30; 

    const container = document.getElementById('match-builder-container');
    container.innerHTML = '';

    for(let i = 1; i <= count; i++) {
        let defaultType = (i <= Math.ceil(count/2)) ? 'Single' : 'Double';
        if (i === count) defaultType = 'Team'; 

        container.innerHTML += `
            <div class="builder-row">
                <div class="builder-num">${i}.</div>
                <select id="game-type-${i}" style="padding: 10px;">
                    <option value="Single" ${defaultType === 'Single' ? 'selected' : ''}>Single</option>
                    <option value="Double" ${defaultType === 'Double' ? 'selected' : ''}>Double</option>
                    <option value="Team" ${defaultType === 'Team' ? 'selected' : ''}>Teamgame</option>
                </select>
                <div style="display:flex; align-items:center; gap:5px; color:#aaa; font-size:0.8rem;">
                    Best of
                    <input type="number" id="game-bo-${i}" value="3" min="1" max="11" style="width: 50px; padding: 10px; text-align: center;">
                </div>
            </div>
        `;
    }
}

// --- OPSLAAN NAAR SUPABASE ---

async function maakCompetitie() {
    const naam = document.getElementById('inp-naam').value.trim();
    const seizoen = document.getElementById('inp-seizoen').value.trim();
    const heeftBeker = document.getElementById('inp-beker').checked;
    const errorMsg = document.getElementById('error-msg');
    const btnSave = document.getElementById('btn-save');

    if (!naam) {
        errorMsg.innerText = "De naam van de competitie is verplicht!";
        errorMsg.style.display = 'block';
        return;
    }

    // 1. Verzamel Divisies
    const divCount = parseInt(document.getElementById('inp-div-count').value);
    let divisieNamen = [];
    for (let i = 1; i <= divCount; i++) {
        let divNaam = document.getElementById(`div-naam-${i}`).value.trim();
        if (!divNaam) divNaam = `Reeks ${i}`;
        divisieNamen.push({ name: divNaam, rank_order: i });
    }

    // 2. Verzamel Klassement Regels
    const allowDraw = document.getElementById('allow-draw').checked;
    const scoringRules = {
        win: parseInt(document.getElementById('ptn-win').value) || 0,
        loss: parseInt(document.getElementById('ptn-loss').value) || 0,
        draw: allowDraw ? (parseInt(document.getElementById('ptn-draw').value) || 0) : null,
        allowDraws: allowDraw
    };

    // 3. Verzamel Gelijke Stand Regels (Tiebreakers uitgelezen op basis van drag&drop)
    let tiebreakers = [];
    document.querySelectorAll('#tiebreaker-list .drag-item').forEach(item => {
        tiebreakers.push(item.getAttribute('data-id'));
    });

    // 4. Verzamel Match Format
    const gameCount = parseInt(document.getElementById('inp-game-count').value);
    let matchFormat = [];
    for(let i=1; i<=gameCount; i++) {
        matchFormat.push({
            gameNumber: i,
            type: document.getElementById(`game-type-${i}`).value,
            bestOf: parseInt(document.getElementById(`game-bo-${i}`).value) || 3
        });
    }

    // Het ultieme Rules JSON Object!
    const rulesJson = {
        scoring: scoringRules,
        tiebreakers: tiebreakers, // Hier steken we de opgeslagen volgorde in!
        format: matchFormat
    };

    errorMsg.style.display = 'none';
    btnSave.innerText = "Bezig met opslaan...";
    btnSave.disabled = true;

    try {
        const { data: compData, error: compError } = await supabaseClient
            .from('competitions')
            .insert([
                { 
                    name: naam, 
                    season: seizoen,
                    has_cup: heeftBeker,
                    rules: rulesJson
                }
            ])
            .select(); 

        if (compError) throw compError;
        
        const nieuweCompId = compData[0].id;

        const divisiesToInsert = divisieNamen.map(div => ({
            competition_id: nieuweCompId,
            name: div.name,
            rank_order: div.rank_order
        }));

        const { error: divError } = await supabaseClient
            .from('divisions')
            .insert(divisiesToInsert);

        if (divError) throw divError;

        // Gelukt! Stuur de beheerder direct naar het ploegen-beheer
        window.location.href = `beheer-ploegen.html?id=${nieuweCompId}`;

    } catch (err) {
        console.error(err);
        errorMsg.innerText = "Fout bij opslaan: " + err.message;
        errorMsg.style.display = 'block';
        btnSave.innerText = "OPSLAAN & AANMAKEN";
        btnSave.disabled = false;
    }
}
