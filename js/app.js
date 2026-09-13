// js/app.js

async function fetchCompetities() {
    const container = document.getElementById('competitie-lijst');
    container.innerHTML = '<p style="color: #aaa;">Laden...</p>';

    try {
        // GEWIJZIGD: We gebruiken hier nu supabaseClient
        const { data, error } = await supabaseClient
            .from('competitions')
            .select('*');

        if (error) throw error;

        if (data.length === 0) {
            container.innerHTML = '<p style="color: #aaa;">Nog geen competities gevonden.</p>';
            return;
        }

        // Bouw de HTML op voor elke competitie
        container.innerHTML = '';
        data.forEach(comp => {
            const div = document.createElement('div');
            div.style.cssText = 'background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1); text-align: left;';
            div.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: #009FE3;">${comp.name}</h3>
                <p style="margin: 0; font-size: 0.9rem; color: #aaa;">Status: ${comp.status || 'Actief'}</p>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        console.error('Fout bij ophalen competities:', err);
        container.innerHTML = `<p style="color: #ff3b3b;">Fout: ${err.message}</p>`;
    }
}

// Haal de data op zodra de pagina geladen is
window.addEventListener('DOMContentLoaded', fetchCompetities);
