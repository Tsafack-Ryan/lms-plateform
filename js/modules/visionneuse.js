// --- VISIONNEUSE DE COURS ---

var leconsCoursActuel = [];
var leconActuelleIndex = -1;
var chapitresCours = [];

function chargerVisionneuse() {
    var hash = window.location.hash;
    var params = new URLSearchParams(hash.split("?")[1]);
    var id = params.get("id");
    if (!id) { window.location.hash = "catalogue"; naviguer("catalogue"); return; }

    var btnRetour = document.getElementById("btn-retour-catalogue");
    if (btnRetour) btnRetour.onclick = function () { window.location.hash = "catalogue"; naviguer("catalogue"); };

    var demarrage = new FormData();
    demarrage.append("action", "demarrer_cours");
    demarrage.append("cours_id", id);
    requeteJson("api/progression.php", { method: "POST", body: demarrage });

    // Charger le titre et les chapitres
    requeteJson("api/cours.php").then(function (resCours) {
        if (resCours.succes) {
            var cours = resCours.cours.find(function (c) { return Number(c.id) === Number(id); });
            var titreCours = document.getElementById("titre-cours-visionneuse");
            if (titreCours && cours) titreCours.textContent = cours.titre;
        }
    });

    // Charger les chapitres avec leurs lecons
    requeteJson("api/chapitres.php?cours_id=" + id).then(function (res) {
        var list = document.getElementById("liste-chapitres");
        if (!list) return;
        if (!res.succes || res.chapitres.length === 0) {
            list.innerHTML = "<p>Aucun chapitre pour ce cours.</p>";
            return;
        }

        chapitresCours = res.chapitres;

        // Construire une liste plate de toutes les lecons
        leconsCoursActuel = [];
        for (var i = 0; i < res.chapitres.length; i++) {
            var chap = res.chapitres[i];
            if (chap.lecons) {
                for (var j = 0; j < chap.lecons.length; j++) {
                    var l = chap.lecons[j];
                    l.chapitre_titre = chap.titre;
                    l.chapitre_id = chap.id;
                    leconsCoursActuel.push(l);
                }
            }
        }

        leconActuelleIndex = -1;

        // Afficher les chapitres avec accordéon
        var html = "";
        for (var i = 0; i < res.chapitres.length; i++) {
            var chap = res.chapitres[i];
            html += '<div class="chapitre-visionneuse">' +
                '<div class="chapitre-titre-visionneuse" onclick="basculerChapitre(this)">' +
                '<span class="chapitre-chevron">\u25B6</span>' +
                '<strong>Chapitre ' + chap.ordre + ' : ' + echapperHtml(chap.titre) + '</strong>' +
                '<span class="badge-module">' + (chap.lecons ? chap.lecons.length : 0) + ' lecon(s)</span>' +
                '</div>' +
                '<div class="chapitre-contenu-visionneuse">';

            if (chap.lecons && chap.lecons.length > 0) {
                for (var j = 0; j < chap.lecons.length; j++) {
                    var lc = chap.lecons[j];
                    html += '<div class="chapitre-item" data-index="' + (leconsCoursActuel.indexOf(lc)) + '" onclick="voirLeconParIndex(' + (leconsCoursActuel.indexOf(lc)) + ')">' +
                        echapperHtml(lc.titre) +
                        '</div>';
                }
            } else {
                html += '<p class="message-vide">Aucune lecon dans ce chapitre.</p>';
            }
            html += '</div></div>';
        }

        // Ajouter le bouton "Examen final" si toutes les lecons sont chargees
        html += '<div class="examen-final-bouton-visionneuse" style="margin-top:16px;padding:12px;text-align:center;">' +
            '<button class="btn-action-majeure" onclick="verifierExamenFinal(' + id + ')" style="width:100%;">Passer l\'examen final</button>' +
            '</div>';

        list.innerHTML = html;

        if (leconsCoursActuel.length > 0) voirLeconParIndex(0);
    });
}

function basculerChapitre(element) {
    var contenu = element.nextElementSibling;
    var chevron = element.querySelector(".chapitre-chevron");
    if (contenu.style.display === "block") {
        contenu.style.display = "none";
        if (chevron) chevron.style.transform = "rotate(0deg)";
    } else {
        contenu.style.display = "block";
        if (chevron) chevron.style.transform = "rotate(90deg)";
    }
}

function verifierExamenFinal(coursId) {
    // Verifier que toutes les lecons sont marquees lues
    requeteJson("api/progression.php?cours_id=" + coursId).then(function (res) {
        if (res.succes && res.examen_debloque) {
            window.location.hash = "examen-final?cours_id=" + coursId;
            naviguer("examen-final?cours_id=" + coursId);
        } else {
            var total = res.total || 0;
            var terminees = res.terminees || 0;
            afficherMessage("Terminez toutes les lecons (" + terminees + "/" + total + ") avant l'examen final.", "erreur");
        }
    });
}

function voirLeconParIndex(index) {
    if (index < 0 || index >= leconsCoursActuel.length) return;
    leconActuelleIndex = index;

    document.querySelectorAll(".chapitre-item").forEach(function (el) {
        el.classList.toggle("active", Number(el.dataset.index) === index);
    });

    voirLecon(leconsCoursActuel[index].id);
}

function voirLecon(id) {
    requeteJson("api/lecons.php?id=" + id).then(function (res) {
        if (!res.succes) {
            afficherMessage(res.message || "Lecon introuvable.", "erreur");
            return;
        }
        var l = res.lecon;
        var zone = document.getElementById("contenu-texte-lecon");
        var titre = document.getElementById("titre-lecon-actuelle");
        var barre = document.getElementById("barre-actions-lecon");

        if (titre) titre.textContent = l.titre;
        if (zone) {
            if (l.chemin_fichier) {
                zone.innerHTML = l.type_contenu === "pdf"
                    ? '<embed src="' + l.chemin_fichier + '" type="application/pdf" style="width:100%;height:500px;">'
                    : '<video controls playsinline style="width:100%;max-height:500px;"><source src="' + l.chemin_fichier + '"></video>';
            } else {
                zone.innerHTML = '<p class="message-vide">Aucun fichier associe a cette lecon.</p>';
            }
        }
        if (barre) barre.classList.remove("masquee");

        var bq = document.getElementById("btn-passer-quiz");
        if (bq) bq.onclick = function () { window.location.hash = "quiz?lecon_id=" + l.id; naviguer("quiz?lecon_id=" + l.id); };

        var bp = document.getElementById("btn-lecon-precedente");
        if (bp) {
            bp.disabled = leconActuelleIndex <= 0;
            bp.onclick = function () { voirLeconParIndex(leconActuelleIndex - 1); };
        }

        var bs = document.getElementById("btn-lecon-suivante");
        if (bs) {
            bs.disabled = leconActuelleIndex >= leconsCoursActuel.length - 1;
            bs.onclick = function () { voirLeconParIndex(leconActuelleIndex + 1); };
        }

        var bm = document.getElementById("btn-marquer-terminee");
        if (bm) bm.onclick = function () {
            var d = new FormData();
            d.append("action", "marquer_lue");
            d.append("lecon_id", l.id);
            requeteJson("api/progression.php", { method: "POST", body: d }).then(function (res) {
                if (res.succes) {
                    afficherMessage("Lecon marquee comme lue.", "succes");
                    if (leconActuelleIndex < leconsCoursActuel.length - 1) {
                        voirLeconParIndex(leconActuelleIndex + 1);
                    }
                    majProgressionCours();
                } else {
                    afficherMessage(res.message || "Erreur.", "erreur");
                }
            });
        };

        majProgressionCours();
    });
}

function majProgressionCours() {
    var hash = window.location.hash;
    var params = new URLSearchParams(hash.split("?")[1]);
    var coursId = params.get("id");
    if (!coursId) return;

    requeteJson("api/progression.php?cours_id=" + coursId).then(function (res) {
        var pct = document.getElementById("pourcentage-cours");
        var fill = document.getElementById("remplissage-progression-cours");
        if (res.succes) {
            if (pct) pct.textContent = res.pourcentage + "% termine";
            if (fill) fill.style.width = res.pourcentage + "%";
        }
    });
}