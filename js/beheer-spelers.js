// js/beheer-spelers.js

const urlParams = new URLSearchParams(window.location.search);
// compid (of id) hangt af van of we via de Hub komen of via de ploegenlijst
const compId = urlParams.get('compid') || urlParams.get('id'); 
const preselectedTeamId = urlParams.get('teamid'); 

window.addEventListener('DOMContentLoaded', async () => {
    if (!compId) {
        document.getElementById('spelers-lijst').innerHTML = "Fout: Geen competitie geselecteerd.";
        return;
    }

    // Terugknop instellen naar de hub
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `beheer-hub.html?id=${compId}`;
    
    await laadPloegenDropdown();
});

async function laadPloegenDropdown() {
    const select = document.getElementById('select-ploeg');
    try {
        const { data, error } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('competition_id', compId)
            .order('name');
            
        if (error) throw error;

        if (!data || data.length === 0) {
            select.innerHTML = '<option value="">Geen ploegen gevonden in deze competitie</option>';
            return;
        }

        select.innerHTML = '<option value="">-- Selecteer een ploeg --</option>';
        data.forEach(team => {
            // Als we via de ploegen-pagina kwamen, selecteer deze ploeg dan direct
            const isSelected = team.id === preselectedTeamId ? 'selected' : '';
            select.innerHTML += `<option value="${team.id}" ${isSelected}>${team.name} (${team.division})</option>`;
        });

        // Laad direct de spelers als er al een ploeg voorgeselecteerd was
        if (preselectedTeamId) {
            laadSpelers();
        }

    } catch (err) {
        console.error("Fout bij laden ploegen:", err);
    }
}

async function laadSpelers() {
    const teamId = document.getElementById('select-ploeg').value;
    const container = document.getElementById('spelers-lijst');

    if (!teamId) {
        container.innerHTML = "<p style='color:#aaa;'>Kies eerst een ploeg uit de lijst bovenaan.</p>";
        return;
    }

    container.innerHTML = "<p style='color:#aaa;'>Laden...</p>";

    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('*')
            .eq('team_id', teamId)
            .order('name');
        
        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = "<p style='color:#aaa;'>Nog geen spelers in deze ploeg.</p>";
            return;
        }

        container.innerHTML = data.map(speler => `
            <div class="player-list-item">
                <p class="player-name">${speler.name}</p>
                <button class="btn-delete" onclick="verwijderSpeler('${speler.id}', '${speler.name}')">Wis</button>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = "<p style='color:red;'>Fout bij laden van spelers.</p>";
    }
}

async function voegSpelerToe() {
    const naam = document.getElementById('inp-speler-naam').value.trim();
    const teamId = document.getElementById('select-ploeg').value;
    const msg = document.getElementById('msg-box');

    if (!teamId) {
        msg.innerText = "Selecteer eerst een ploeg bovenaan!"; 
        msg.style.color = "#ff3b3b"; msg.style.display = "block"; 
        return; 
    }
    if (!naam) { 
        msg.innerText = "Spelernaam is verplicht!"; 
        msg.style.color = "#ff3b3b"; msg.style.display = "block"; 
        return; 
    }

    msg.innerText = "Bezig met opslaan..."; 
    msg.style.color = "white"; msg.style.display = "block";

    try {
        const { error } = await supabaseClient.from('players').insert([{ 
            team_id: teamId, 
            name: naam
        }]);

        if (error) throw error;

        document.getElementById('inp-speler-naam').value = '';
        msg.innerText = `${naam} is toegevoegd!`; 
        msg.style.color = "lime";
        
        setTimeout(() => msg.style.display = 'none', 2000);
        
        // Ververs de lijst met spelers
        laadSpelers();
        
    } catch (err) {
        msg.innerText = "Fout bij opslaan: " + err.message; 
        msg.style.color = "#ff3b3b";
    }
}

async function verwijderSpeler(playerId, playerName) {
    if (!confirm(`Ben je zeker dat je ${playerName} wil verwijderen uit deze ploeg?`)) return;

    try {
        const { error } = await supabaseClient
            .from('players')
            .delete()
            .eq('id', playerId);

        if (error) throw error;
        
        // Ververs de lijst direct
        laadSpelers();
    } catch (err) {
        alert("Fout bij verwijderen: " + err.message);
    }
}
