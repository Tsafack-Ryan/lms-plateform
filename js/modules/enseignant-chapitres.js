// --- ENSEIGNANT : GESTION DES CHAPITRES ---

function initFormChapitre() {
    var f = document.getElementById("formulaire-chapitre");
    var s = document.getElementById("cours-chapitre");
    if (!f || !s) return;

    requeteJson("api/cours.php").then(function (res) {
        if (res.succes) {
            var opt = "<option value=''>Selectionner un cours</option>";
            for (var i = 0; i < res.cours.length; i++) {
                opt += '<option value="' + res.cours[i].id + '">' + echapperHtml(res.cours[i].titre) + '</option>';
            }
            s.innerHTML = opt;
        }
    });

    // Remplir aussi le filtre
    var filtre = document.getElementById("filtre-cours-chapitres");
    if (filtre) {
        requeteJson("api/cours.php").then(function (res) {
            if (res.succes) {
                var opt = "<option value=''>Selectionner un cours</option>";
                for (var i = 0; i < res.cours.length; i++) {
                    opt += '<option value="' + res.cours[i].id + '">' + echapperHtml(res.cours[i].titre) + '</option>';
                }
                filtre.innerHTML = opt;
                filtre.onchange = function () { chargerChapitresEnseignant(this.value); };
            }
        });
    }

    f.onsubmit = function (e) {
        e.preventDefault();
        requeteJson("api/chapitres.php", { method: "POST", body: new FormData(f) }).then(function (res) {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) {
                f.reset();
                var cf = document.getElementById("filtre-cours-chapitres");
                if (cf) chargerChapitresEnseignant(cf.value);
            }
        });
    };
}

function chargerChapitresEnseignant(coursId) {
    var l = document.getElementById("liste-chapitres-enseignant");
    if (!l) return;
    if (!coursId) {
        l.innerHTML = "<p class='message-vide'>Selectionnez un cours pour voir ses chapitres.</p>";
        return;
    }

    requeteJson("api/chapitres.php?cours_id=" + coursId).then(function (res) {
        if (!res.succes || res.chapitres.length === 0) {
            l.innerHTML = "<p class='message-vide'>Aucun chapitre pour ce cours.</p>";
            return;
        }

        var html = "";
        for (var i = 0; i < res.chapitres.length; i++) {
            var chap = res.chapitres[i];
            html += '<div class="chapitre-enseignant-card">' +
                '<div class="chapitre-header">' +
                '<strong>Chapitre ' + chap.ordre + ' : ' + echapperHtml(chap.titre) + '</strong>' +
                '<span class="badge-module">' + chap.nb_lecons + ' lecon(s)</span>' +
                '</div>' +
                '<div class="chapitre-actions">' +
                '<button class="btn-modifier-cours" onclick="modifierChapitre(' + chap.id + ')">Modifier</button>' +
                '<button class="btn-supprimer-cours" onclick="supprimerChapitre(' + chap.id + ')">Supprimer</button>' +
                '</div>';

            if (chap.lecons && chap.lecons.length > 0) {
                html += '<div class="chapitre-lecons">';
                for (var j = 0; j < chap.lecons.length; j++) {
                    var lc = chap.lecons[j];
                    html += '<div class="lecon-chapitre-item">' +
                        '<span>' + echapperHtml(lc.titre) + ' (' + lc.type_contenu + ')</span>' +
                        '<small>Ordre ' + lc.ordre + '</small>' +
                        '</div>';
                }
                html += '</div>';
            } else {
                html += '<p class="message-vide" style="margin-top:8px;">Ajoutez des lecons depuis la page Lecons.</p>';
            }
            html += '</div>';
        }
        l.innerHTML = html;
    });
}

function modifierChapitre(id) {
    var titre = prompt("Nouveau titre du chapitre :");
    if (!titre || titre.trim() === "") return;
    var ordre = prompt("Nouvel ordre :", "1");
    if (!ordre) return;

    requeteJson("api/chapitres.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id, titre: titre.trim(), ordre: Number(ordre) })
    }).then(function (res) {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) {
            var cf = document.getElementById("filtre-cours-chapitres");
            if (cf) chargerChapitresEnseignant(cf.value);
        }
    });
}

function supprimerChapitre(id) {
    if (!confirm("Supprimer ce chapitre et toutes ses lecons ?")) return;
    requeteJson("api/chapitres.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
    }).then(function (res) {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) {
            var cf = document.getElementById("filtre-cours-chapitres");
            if (cf) chargerChapitresEnseignant(cf.value);
        }
    });
}