// --- CERTIFICATS ---

function chargerCertificats() {
    var conteneur = document.getElementById("liste-certificats-debloques");
    if (!conteneur) return;

    // Utiliser l'API dédiée aux certificats au lieu du dashboard
    requeteJson("api/certificats.php").then(function (res) {
        if (!res.succes) return;

        var certificats = res.certificats || [];

        if (certificats.length === 0) {
            conteneur.innerHTML = "<p class='message-vide'>Aucun certificat debloque pour le moment. Reussissez tous les quiz d'un cours (score >= 80%) pour en obtenir un.</p>";
            return;
        }

        var html = "";
        for (var i = 0; i < certificats.length; i++) {
            var c = certificats[i];
            html += '<article class="carte-cours">' +
                '<span class="badge-module">' + echapperHtml(c.module_titre) + '</span>' +
                '<h3>' + echapperHtml(c.cours_titre) + '</h3>' +
                '<p>Certificat de reussite - ' + echapperHtml(c.code_certificat) + '</p>' +
                '<p><small>Obtenu le ' + new Date(c.date_obtention).toLocaleDateString("fr-FR") + '</small></p>' +
                '<button class="btn-action-majeure" onclick="afficherCertificat(\'' + echapperJs(c.cours_titre) + '\', \'' + echapperJs(c.date_obtention) + '\')">Voir le certificat</button>' +
                '</article>';
        }
        conteneur.innerHTML = html;
    });

    var fermer = document.getElementById("btn-fermer-modale");
    if (fermer) fermer.onclick = function () { document.getElementById("modal-certificat").classList.add("masque"); };

    var imprimer = document.getElementById("btn-imprimer-certificat");
    if (imprimer) imprimer.onclick = function () { window.print(); };
}

function afficherCertificat(titreCours, dateObtention) {
    var modal = document.getElementById("modal-certificat");
    var zone = document.getElementById("zone-rendu-certificat");
    if (!modal || !zone) return;

    var nom = (utilisateurActuel && utilisateurActuel.nom) || "Etudiant";
    var date = dateObtention
        ? new Date(dateObtention).toLocaleDateString("fr-FR")
        : new Date().toLocaleDateString("fr-FR");

    zone.innerHTML = '<div style="padding:48px 40px;text-align:center;font-family:\'Plus Jakarta Sans\',Arial,sans-serif;">' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:28px;">' +
        '<svg width="36" height="36" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="28" cy="28" r="6" stroke="#00ffc8" stroke-width="1.5"/>' +
        '<path d="M28 22V8M28 48V34M22 28H8M48 28H34" stroke="#00ffc8" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path d="M22 22L14 14M34 34L42 42M34 22L42 14M22 34L14 42" stroke="#00ffc8" stroke-width="1" stroke-linecap="round" opacity="0.5"/>' +
        '<circle cx="28" cy="8" r="2" fill="#00ffc8"/>' +
        '<circle cx="28" cy="48" r="2" fill="#00ffc8"/>' +
        '<circle cx="8" cy="28" r="2" fill="#00ffc8"/>' +
        '<circle cx="48" cy="28" r="2" fill="#00ffc8"/>' +
        '</svg>' +
        '<span style="font-family:\'Space Mono\',monospace;font-weight:700;font-size:18px;letter-spacing:0.2em;color:#0a0e17;">STARACADEMY</span>' +
        '</div>' +
        '<div style="width:60px;height:3px;background:#2563eb;margin:0 auto 28px;border-radius:2px;"></div>' +
        '<p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#64748b;margin-bottom:20px;">Certificat de Reussite</p>' +
        '<p style="color:#64748b;margin-bottom:10px;">Ce certificat est decerne a</p>' +
        '<h2 style="font-size:32px;font-weight:700;color:#172033;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:20px;">' + nom + '</h2>' +
        '<p style="color:#64748b;margin-bottom:8px;">pour avoir valide avec succes le cours</p>' +
        '<h3 style="font-size:22px;font-weight:700;color:#2563eb;margin-bottom:28px;">' + echapperHtml(titreCours) + '</h3>' +
        '<div style="width:60px;height:3px;background:#e2e8f0;margin:0 auto 24px;border-radius:2px;"></div>' +
        '<p style="font-size:13px;color:#94a3b8;">Delivre le ' + date + '</p>' +
        '</div>';

    modal.classList.remove("masque");
}