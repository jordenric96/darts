const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

window.addEventListener('DOMContentLoaded', async () => {
    // Terugknop instellen
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `beheer-hub.html?id=${compId}`;
    
    await laadDivisies();
    await laadPloegen();
});

async function laadDivisies() {
    const select = document.getElementById('inp-divisie');
    try {
        const { data } = await supabaseClient
            .from('divisions')
            .select('*')
            .eq('competition_id', compId)
            .order('rank_order');
            
        select.innerHTML = data ? data.map(d => `<option value="${d.name}">${d.name}</option>`).join('') : '';
    } catch (err) {
        console.error("Fout bij laden divisies:", err);
    }
}

async function laadPloegen() {
    const container = document.getElementById('ploegen-lijst');
    try {
        const { data } = await supabaseClient
            .from('teams')
            .select('*')
            .eq('competition_id', compId)
            .order('division')
            .order('name');
        
        if (!data || data.length === 0) {
            container.innerHTML = "<p style='color:#aaa;'>Nog geen ploegen toegevoegd.</p>";
            return;
        }

        container.innerHTML = data.map(team => `
            <div class="team-list-item">
                <div class="team-info">
                    <h4>${team.name} <span style="background:var(--c-cyan); color:black; padding:2px 6px; border-radius:5px; font-size:0.7rem;">${team.division}</span></h4>
                    <p>📍 ${team.home_location || 'Geen lokaal'}</p>
                    <p style="font-size: 0.75rem; color: #888;">${team.address || 'Geen adres ingegeven'}</p>
                </div>
                <button class="btn-small" onclick="window.location.href='beheer-spelers.html?teamid=${team.id}&compid=${compId}'">Spelers 👤</button>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = "<p style='color:red;'>Fout bij laden van de ploegen.</p>";
    }
}

async function voegPloegToe() {
    const naam = document.getElementById('inp-ploegnaam').value.trim();
    const divisie = document.getElementById('inp-divisie').value;
    const lokaal = document.getElementById('inp-lokaal').value.trim();
    const adres = document.getElementById('inp-adres').value.trim(); // Adres uitlezen
    const msg = document.getElementById('msg-box');

    if (!naam) { 
        msg.innerText = "De naam van de ploeg is verplicht!"; 
        msg.style.color = "#ff3b3b"; 
        msg.style.display = "block"; 
        return; 
    }

    msg.innerText = "Bezig met opslaan..."; 
    msg.style.color = "white"; 
    msg.style.display = "block";

    try {
        const { error } = await supabaseClient.from('teams').insert([{ 
            competition_id: compId, 
            name: naam, 
            division: divisie, 
            home_location: lokaal,
            address: adres // Adres meesturen naar de database
        }]);

        if (error) throw error;

        // Formulier leegmaken na succes
        document.getElementById('inp-ploegnaam').value = '';
        document.getElementById('inp-lokaal').value = '';
        document.getElementById('inp-adres').value = '';
        
        msg.innerText = "Ploeg succesvol toegevoegd!"; 
        msg.style.color = "lime";
        
        setTimeout(() => msg.style.display = 'none', 2500);
        
        // De lijst onmiddellijk updaten
        laadPloegen();
        
    } catch (err) {
        msg.innerText = "Fout bij opslaan: " + err.message; 
        msg.style.color = "#ff3b3b";
    }
}
