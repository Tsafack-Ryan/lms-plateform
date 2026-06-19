// --- ENSEIGNANT : GESTION DES LECONS ---

function initFormLecon() {
    var f = document.getElementById("formulaire-lecon");
    var s = document.getElementById("cours-lecon");
    if (!f || !s) return;
    requeteJson("api/cours.php").then(function (res) {
        if (res.succes) {
            var opt = "<option value=''>Choisir...</option>";
            for (var i = 0; i < res.cours.length; i++) {
                opt += '<option value="' + res.cours[i].id + '">' + echapperHtml(res.cours[i].titre) + '</option>';
            }
            s.innerHTML = opt;
        }
    });
    f.onsubmit = function (e) {
        e.preventDefault();
        requeteJson("api/lecons.php", { method: "POST", body: new FormData(f) }).then(function (res) {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) { f.reset(); chargerLeconsEnseignant(); chargerStatsEnseignant(); }
        });
    };
}

function chargerLeconsEnseignant() {
    var l = document.getElementById("liste-lecons-enseignant");
    if (!l) return;

    requeteJson("api/lecons.php").then(function (res) {
        if (!res.succes || res.lecons.length === 0) {
            l.innerHTML = "<p class='message-vide'>Aucune lecon ajoutee pour le moment.</p>";
            return;
        }

        var html = "";
        for (var i = 0; i < res.lecons.length; i++) {
            var lecon = res.lecons[i];
            html += '<div class="ligne-cours-enseignant">' +
                '<div class="info-cours-enseignant">' +
                '<span class="badge-module">' + echapperHtml(lecon.cours_titre) + '</span>' +
                '<strong>' + echapperHtml(lecon.titre) + '</strong>' +
                '<span class="desc-cours-enseignant">Ordre ' + Number(lecon.ordre) + ' - ' + echapperHtml(lecon.type_contenu) + '</span>' +
                '</div>' +
                '<div class="actions-cours-enseignant">' +
                '<button class="btn-modifier-cours" onclick="ouvrirModificationLecon(' + lecon.id + ', ' + lecon.cours_id + ', \'' + echapperJs(lecon.titre) + '\', \'' + echapperJs(lecon.type_contenu) + '\', ' + Number(lecon.ordre) + ')">Modifier</button>' +
                '<button class="btn-supprimer-cours" onclick="supprimerLecon(' + lecon.id + ')">Supprimer</button>' +
                '</div>' +
                '</div>';
        }
        l.innerHTML = html;
    });
}

function ouvrirModificationLecon(id, coursId, titre, typeContenu, ordre) {
    var existant = document.getElementById("modal-modification-lecon");
    if (existant) existant.remove();

    requeteJson("api/cours.php").then(function (res) {
        var optionsCours = "";
        if (res.succes) {
            for (var i = 0; i < res.cours.length; i++) {
                var c = res.cours[i];
                var sel = Number(c.id) === Number(coursId) ? " selected" : "";
                optionsCours += '<option value="' + c.id + '"' + sel + '>' + echapperHtml(c.titre) + '</option>';
            }
        }

        var modal = document.createElement("div");
        modal.id = "modal-modification-lecon";
        modal.className = "modal-edition";
        modal.innerHTML = '<div class="fond-modal" onclick="fermerModalEdition(\'modal-modification-lecon\')"></div>' +
            '<div class="boite-modal-cours">' +
            '<h3>Modifier la lecon</h3>' +
            '<div class="groupe-saisie">' +
            '<label>Cours</label>' +
            '<select id="edit-cours-lecon">' + optionsCours + '</select>' +
            '</div>' +
            '<div class="groupe-saisie">' +
            '<label>Titre</label>' +
            '<input type="text" id="edit-titre-lecon" value="' + echapperHtml(titre) + '">' +
            '</div>' +
            '<div class="groupe-saisie">' +
            '<label>Type</label>' +
            '<select id="edit-type-lecon">' +
            '<option value="pdf"' + (typeContenu === "pdf" ? " selected" : "") + '>Document PDF</option>' +
            '<option value="video"' + (typeContenu === "video" ? " selected" : "") + '>Video</option>' +
            '</select>' +
            '</div>' +
            '<div class="groupe-saisie">' +
            '<label>Ordre</label>' +
            '<input type="number" id="edit-ordre-lecon" min="1" value="' + (Number(ordre) || 1) + '">' +
            '</div>' +
            '<div class="actions-formulaire">' +
            '<button onclick="sauvegarderModificationLecon(' + id + ')">Enregistrer</button>' +
            '<button class="btn-secondaire" onclick="fermerModalEdition(\'modal-modification-lecon\')">Annuler</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(modal);
    });
}

function sauvegarderModificationLecon(id) {
    var donnees = {
        id: id,
        cours_id: Number(document.getElementById("edit-cours-lecon").value),
        titre: document.getElementById("edit-titre-lecon").value.trim(),
        type_contenu: document.getElementById("edit-type-lecon").value,
        ordre: Number(document.getElementById("edit-ordre-lecon").value)
    };

    requeteJson("api/lecons.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees)
    }).then(function (res) {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { fermerModalEdition("modal-modification-lecon"); chargerLeconsEnseignant(); }
    });
}

function supprimerLecon(id) {
    if (!confirm("Supprimer cette lecon et ses quiz ?")) return;
    requeteJson("api/lecons.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
    }).then(function (res) {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { chargerLeconsEnseignant(); chargerStatsEnseignant(); }
    });
}

function fermerModalEdition(id) {
    var modal = document.getElementById(id);
    if (modal) modal.remove();
}