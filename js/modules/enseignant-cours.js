// --- ENSEIGNANT : GESTION DES COURS ---

function initFormCours() {
    var f = document.getElementById("formulaire-cours");
    var s = document.getElementById("module-cours");
    if (!f) return;

    if (s) {
        requeteJson("api/modules.php").then(function (res) {
            if (res.succes) {
                var opt = "<option value=''>Selectionner un module</option>";
                for (var i = 0; i < res.modules.length; i++) {
                    opt += "<option value='" + res.modules[i].code + "'>" + echapperHtml(res.modules[i].titre) + "</option>";
                }
                s.innerHTML = opt;
            }
        });
    }

    f.onsubmit = function (e) {
        e.preventDefault();
        requeteJson("api/cours.php", { method: "POST", body: new FormData(f) }).then(function (res) {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) { f.reset(); chargerCoursListe(); }
        });
    };
}

function chargerCoursListe() {
    var l = document.getElementById("liste-cours-enseignant");
    if (!l) return;

    requeteJson("api/cours.php").then(function (res) {
        if (!res.succes || res.cours.length === 0) {
            l.innerHTML = "<p class='message-vide'>Aucun cours ajoute pour le moment.</p>";
            return;
        }

        var html = "";
        for (var i = 0; i < res.cours.length; i++) {
            var c = res.cours[i];
            html += '<div class="ligne-cours-enseignant" id="cours-ligne-' + c.id + '">' +
                '<div class="info-cours-enseignant">' +
                '<span class="badge-module">' + echapperHtml(c.module_titre) + '</span>' +
                '<strong>' + echapperHtml(c.titre) + '</strong>' +
                '<span class="desc-cours-enseignant">' + echapperHtml(c.description) + '</span>' +
                '</div>' +
                '<div class="actions-cours-enseignant">' +
                '<button class="btn-modifier-cours" onclick="ouvrirModificationCours(' + c.id + ', \'' + echapperJs(c.titre) + '\', \'' + echapperJs(c.module_code) + '\', \'' + echapperJs(c.description) + '\')">Modifier</button>' +
                '<button class="btn-secondaire" onclick="naviguer(\'enseignant-lecon\')">Lecons</button>' +
                '<button class="btn-secondaire" onclick="naviguer(\'enseignant-evaluation\')">Quiz</button>' +
                '<button class="btn-supprimer-cours" onclick="supprimerCours(' + c.id + ')">Supprimer</button>' +
                '</div>' +
                '</div>';
        }
        l.innerHTML = html;
    });
}

function supprimerCours(id) {
    if (!confirm("Supprimer ce cours ? Cette action est irreversible.")) return;
    requeteJson("api/cours.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
    }).then(function (res) {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) chargerCoursListe();
    });
}

function ouvrirModificationCours(id, titre, moduleCode, description) {
    var existant = document.getElementById("modal-modification-cours");
    if (existant) existant.remove();

    requeteJson("api/modules.php").then(function (res) {
        var optionsModules = "";
        if (res.succes) {
            for (var i = 0; i < res.modules.length; i++) {
                var m = res.modules[i];
                var sel = m.code === moduleCode ? " selected" : "";
                optionsModules += '<option value="' + echapperHtml(m.code) + '"' + sel + '>' + echapperHtml(m.titre) + '</option>';
            }
        }

        var modal = document.createElement("div");
        modal.id = "modal-modification-cours";
        modal.innerHTML = '<div class="fond-modal" onclick="fermerModificationCours()"></div>' +
            '<div class="boite-modal-cours">' +
            '<h3>Modifier le cours</h3>' +
            '<div class="groupe-saisie">' +
            '<label>Titre</label>' +
            '<input type="text" id="edit-titre-cours" value="' + echapperHtml(titre) + '">' +
            '</div>' +
            '<div class="groupe-saisie">' +
            '<label>Module</label>' +
            '<select id="edit-module-cours">' + optionsModules + '</select>' +
            '</div>' +
            '<div class="groupe-saisie">' +
            '<label>Description</label>' +
            '<textarea id="edit-description-cours" rows="4">' + echapperHtml(description) + '</textarea>' +
            '</div>' +
            '<div class="actions-formulaire">' +
            '<button onclick="sauvegarderModificationCours(' + id + ')">Enregistrer</button>' +
            '<button class="btn-secondaire" onclick="fermerModificationCours()">Annuler</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(modal);
    });
}

function fermerModificationCours() {
    var m = document.getElementById("modal-modification-cours");
    if (m) m.remove();
}

function sauvegarderModificationCours(id) {
    var titre = document.getElementById("edit-titre-cours").value.trim();
    var module = document.getElementById("edit-module-cours").value;
    var description = document.getElementById("edit-description-cours").value.trim();
    if (!titre || !module || !description) {
        afficherMessage("Tous les champs sont obligatoires.", "erreur");
        return;
    }
    requeteJson("api/cours.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id, titre: titre, module: module, description: description })
    }).then(function (res) {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { fermerModificationCours(); chargerCoursListe(); }
    });
}