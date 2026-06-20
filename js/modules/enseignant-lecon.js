// --- ENSEIGNANT : GESTION DES LECONS ---

function initFormLecon() {
    var f = document.getElementById("formulaire-lecon");
    var s = document.getElementById("cours-lecon");
    var sc = document.getElementById("chapitre-lecon");
    if (!f || !s || !sc) return;

    var hash = window.location.hash;
    var params = new URLSearchParams(hash.split("?")[1]);
    var coursId = params.get("cours_id");

    function chargerChapitres(cId, chapitreSelectionneId) {
        if (!cId) {
            sc.innerHTML = "<option value=''>Selectionner d'abord un cours</option>";
            return;
        }
        sc.innerHTML = "<option value=''>Chargement des chapitres...</option>";
        requeteJson("api/chapitres.php?cours_id=" + cId).then(function (res) {
            var opt = "<option value=''>Selectionner un chapitre</option>";
            if (res.succes && res.chapitres.length > 0) {
                for (var i = 0; i < res.chapitres.length; i++) {
                    var sel = (chapitreSelectionneId && Number(res.chapitres[i].id) === Number(chapitreSelectionneId)) ? " selected" : "";
                    opt += '<option value="' + res.chapitres[i].id + '"' + sel + '>Chapitre ' + res.chapitres[i].ordre + ' : ' + echapperHtml(res.chapitres[i].titre) + '</option>';
                }
            } else {
                opt = "<option value=''>Aucun chapitre trouve</option>";
            }
            sc.innerHTML = opt;
        });
    }

    s.onchange = function () {
        chargerChapitres(this.value);
    };

    requeteJson("api/cours.php").then(function (res) {
        if (res.succes) {
            var opt = "<option value=''>Choisir...</option>";
            for (var i = 0; i < res.cours.length; i++) {
                var sel = (coursId && Number(res.cours[i].id) === Number(coursId)) ? " selected" : "";
                opt += '<option value="' + res.cours[i].id + '"' + sel + '>' + echapperHtml(res.cours[i].titre) + '</option>';
            }
            s.innerHTML = opt;
            if (coursId) {
                chargerChapitres(coursId);
            }
        }
    });

    f.onsubmit = function (e) {
        e.preventDefault();
        requeteJson("api/lecons.php", { method: "POST", body: new FormData(f) }).then(function (res) {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) {
                f.reset();
                if (coursId) {
                    s.value = coursId;
                    chargerChapitres(coursId);
                } else {
                    sc.innerHTML = "<option value=''>Selectionner d'abord un cours</option>";
                }
                chargerLeconsEnseignant();
                chargerStatsEnseignant();
            }
        });
    };
}

function chargerLeconsEnseignant() {
    var l = document.getElementById("liste-lecons-enseignant");
    if (!l) return;

    var hash = window.location.hash;
    var params = new URLSearchParams(hash.split("?")[1]);
    var coursId = params.get("cours_id");

    requeteJson("api/lecons.php" + (coursId ? "?cours_id=" + coursId : "")).then(function (res) {
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
                '<button class="btn-modifier-cours" onclick="ouvrirModificationLecon(' + lecon.id + ', ' + lecon.chapitre_id + ', \'' + echapperJs(lecon.titre) + '\', \'' + echapperJs(lecon.type_contenu) + '\', ' + Number(lecon.ordre) + ')">Modifier</button>' +
                '<button class="btn-supprimer-cours" onclick="supprimerLecon(' + lecon.id + ')">Supprimer</button>' +
                '</div>' +
                '</div>';
        }
        l.innerHTML = html;
    });
}

function ouvrirModificationLecon(id, chapitreId, titre, typeContenu, ordre) {
    var existant = document.getElementById("modal-modification-lecon");
    if (existant) existant.remove();

    // Charger les cours puis les chapitres du cours de la lecon
    requeteJson("api/cours.php").then(function (resCours) {
        var optionsCours = "";
        var coursIdCible = 0;

        // D'abord trouver le cours a partir du chapitre
        requeteJson("api/chapitres.php").then(function (resChap) {
            var chapitreInfo = (resChap.succes ? resChap.chapitres : []).find(function(c) { return Number(c.id) === Number(chapitreId); });
            coursIdCible = chapitreInfo ? Number(chapitreInfo.cours_id) : 0;

            if (resCours.succes) {
                for (var i = 0; i < resCours.cours.length; i++) {
                    var c = resCours.cours[i];
                    var sel = Number(c.id) === coursIdCible ? " selected" : "";
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
                '<select id="edit-cours-lecon-select" onchange="mettreAJourChapitreSelect(this.value,' + chapitreId + ')">' + optionsCours + '</select>' +
                '</div>' +
                '<div class="groupe-saisie">' +
                '<label>Chapitre</label>' +
                '<select id="edit-chapitre-lecon"><option value="">Chargement...</option></select>' +
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

            // Charger les chapitres du cours actuel
            mettreAJourChapitreSelect(coursIdCible, chapitreId);
        });
    });
}

function mettreAJourChapitreSelect(coursId, chapitreActuelId) {
    var select = document.getElementById("edit-chapitre-lecon");
    if (!select || !coursId) return;
    select.innerHTML = '<option value="">Chargement...</option>';
    requeteJson("api/chapitres.php?cours_id=" + coursId).then(function (res) {
        var opts = '';
        if (res.succes && res.chapitres.length > 0) {
            for (var i = 0; i < res.chapitres.length; i++) {
                var chap = res.chapitres[i];
                var sel = Number(chap.id) === Number(chapitreActuelId) ? " selected" : "";
                opts += '<option value="' + chap.id + '"' + sel + '>Chapitre ' + chap.ordre + ' : ' + echapperHtml(chap.titre) + '</option>';
            }
        } else {
            opts = '<option value="">Aucun chapitre</option>';
        }
        select.innerHTML = opts;
    });
}

function sauvegarderModificationLecon(id) {
    var chapitreId = Number(document.getElementById("edit-chapitre-lecon").value);
    var titre = document.getElementById("edit-titre-lecon").value.trim();
    var typeContenu = document.getElementById("edit-type-lecon").value;
    var ordre = Number(document.getElementById("edit-ordre-lecon").value);

    if (!chapitreId || !titre || !typeContenu || !ordre) {
        afficherMessage("Veuillez remplir tous les champs.", "erreur");
        return;
    }

    var donnees = {
        id: id,
        chapitre_id: chapitreId,
        titre: titre,
        type_contenu: typeContenu,
        ordre: ordre
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