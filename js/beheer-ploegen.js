const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

window.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-back-hub').onclick = () => window.location.href = `beheer-hub.html?id=${compId}`;
    await laadDivisies();
    await laadPloegen();
});

async function laadDivisies() {
    const select = document.getElementById('inp-divisie');
    const { data } = await supabaseClient.from('divisions').select('*').eq('competition_id', compId).order('rank_order');
    select.innerHTML = data ? data.map(d => `<option value="${d.name}">${d.name}</option>`).join('') : '';
}

async function laadPloegen() {
    const container = document.getElementById('ploegen-lijst');
    const { data } = await supabaseClient.from('teams').select('*').eq('competition_id', compId).order('division').order('name');
    
    if (!data || data.length === 0) {
        container.innerHTML = "<p style='color:#aaa;'>Nog geen ploegen.</p>";
        return;
    }

    container.innerHTML = data.map(team => `
        <div class="team-list-item">
            <h4 style="margin:0 0 5px 0; color:white;">${team.name} <span style="background:var(--c-cyan); color:black; padding:2px 6px; border-radius:5px; font-size:0.7rem;">${team.division}</span></h4>
            <p style="margin:0; font-size:0.8rem; color:#aaa;">📍 ${team.home_location || 'Geen lokaal'}</p>
        </div>
    `).join('');
}

async function voegPloegToe() {
    const naam = document.getElementById('inp-ploegnaam').value.trim();
    const divisie = document.getElementById('inp-divisie').value;
    const lokaal = document.getElementById('inp-lokaal').value.trim();
    const msg = document.getElementById('msg-box');

    if (!naam) { msg.innerText = "Naam verplicht!"; msg.style.color = "red"; msg.style.display = "block"; return; }

    msg.innerText = "Bezig..."; msg.style.color = "white"; msg.style.display = "block";

    const { error } = await supabaseClient.from('teams').insert([{ competition_id: compId, name: naam, division: divisie, home_location: lokaal }]);

    if (error) {
        msg.innerText = "Fout bij opslaan."; msg.style.color = "red";
    } else {
        document.getElementById('inp-ploegnaam').value = '';
        document.getElementById('inp-lokaal').value = '';
        msg.innerText = "Succes!"; msg.style.color = "lime";
        setTimeout(() => msg.style.display = 'none', 2000);
        laadPloegen();
    }
}
