// js/competitie.js

const urlParams = new URLSearchParams(window.location.search);
const compId = urlParams.get('id');

async function laadCompetitieMenu() {
    if (!compId) {
        document.getElementById('comp-titel').innerText = "Fout: Geen competitie geselecteerd";
        return;
    }

    try {
        // Haal enkel de naam van de competitie op voor de titel
        const { data: compInfo, error } = await supabaseClient
            .from('competitions')
            .select('name')
            .eq('id', compId)
            .single();
            
        if (error) throw error;

        if (compInfo) {
            document.getElementById('comp-titel').innerText = compInfo.name;
            document.getElementById('menu-grid').style.display = 'grid'; // Toon de knoppen
        }

        // Vul de 4 knoppen in met de juiste link zodat het ID wordt doorgegeven
        document.getElementById('link-klassement').href = `klassement.html?id=${compId}`;
        document.getElementById('link-kalender').href = `kalender.html?id=${compId}`;
        document.getElementById('link-ploegen').href = `ploegen.html?id=${compId}`;
        document.getElementById('link-stats').href = `statistieken.html?id=${compId}`;

    } catch (err) {
        console.error("Fout bij het laden:", err);
        document.getElementById('comp-titel').innerText = "Oeps, er ging iets mis.";
    }
}

// Start inladen als de pagina opent
window.addEventListener('DOMContentLoaded', laadCompetitieMenu);
