// js/app.js

async function fetchCompetities() {
    const container = document.getElementById('competitie-lijst');
    container.innerHTML = '<p style="color: #aaa;">Laden...</p>';

    try {
        // We gebruiken supabaseClient (zoals ingesteld in supabase.js)
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
            
            // Nieuwe styling inclusief 'cursor: pointer' zodat het als een knop aanvoelt
            div.style.cssText = 'background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1); text-align: left; cursor: pointer; transition: transform 0.2s, background 0.2s;';
            
            // Hover effect toevoegen voor muisgebruikers (desktop besturen)
            div.onmouseover = () => div.style.background = 'rgba(0, 159, 227, 0.1)';
            div.onmouseout = () => div.style.background = 'rgba(255,255,255,0.05)';

            // Zorg dat hij doorverwijst naar competitie.html met het juiste ID in de URL
            div.onclick = () => window.location.href = `competitie.html?id=${comp.id}`;
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; color: #009FE3;">${comp.name}</h3>
                        <p style="margin: 0; font-size: 0.85rem; color: #aaa;">Status: ${comp.status || 'Actief'}</p>
                    </div>
                    <div style="color: var(--c-cyan); font-size: 1.5rem;">›</div>
                </div>
            `;
            container.appendChild(div);
        });

    } catch (err) {
        console.error('Fout bij ophalen competities:', err);
        container.innerHTML = `<p style="color: #ff3b3b;">Fout: ${err.message}</p>`;
    }
}

// Haal de data op zodra de startpagina volledig geladen is
window.addEventListener('DOMContentLoaded', fetchCompetities);
