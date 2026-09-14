// js/beheer-hub.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

async function laadBeheerMenu() {
    if (!compId) {
        document.getElementById('comp-titel').innerText = "Fout: Geen competitie geselecteerd";
        return;
    }

    try {
        const { data: compInfo, error } = await supabaseClient
            .from('competitions')
            .select('name')
            .eq('id', compId)
            .single();
            
        if (error) throw error;

        if (compInfo) {
            document.getElementById('comp-titel').innerText = compInfo.name;
            document.getElementById('menu-grid').style.display = 'grid'; 
        }

        // Koppel de juiste beheer-pagina's
        // (Enkele van deze pagina's moeten we hierna nog bouwen)
        document.getElementById('link-instellingen').href = `edit-competitie.html?id=${compId}`;
        document.getElementById('link-ploegen').href = `beheer-ploegen.html?id=${compId}`;
        document.getElementById('link-spelers').href = `beheer-spelers.html?id=${compId}`;
        document.getElementById('link-nieuws').href = `beheer-nieuws.html?id=${compId}`;
        document.getElementById('link-kalender-maken').href = `beheer-kalender.html?id=${compId}`;

    } catch (err) {
        console.error("Fout bij het laden:", err);
        document.getElementById('comp-titel').innerText = "Oeps, er ging iets mis.";
    }
}

window.addEventListener('DOMContentLoaded', laadBeheerMenu);
