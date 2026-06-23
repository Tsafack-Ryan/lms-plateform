// --- VISIONNEUSE DE COURS ---

var leconsCoursActuel = [];
var leconActuelleIndex = -1;
var chapitresCours = [];
var coursActuelId = null; // Stocke l'ID du cours en cours de visionneuse

function chargerVisionneuse() {
    var hash = window.location.hash;
    var params = new URLSearchParams(hash.split("?")[1]);
    var id = params.get("id");
    if (!id) { window.location.hash = "catalogue"; naviguer("catalogue"); return; }
    coursActuelId = Number(id);

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
            // Bouton Quiz du chapitre (Coursera-like)
            html += '<div class="quiz-chapitre-bouton" data-chapitre-id="' + chap.id + '">' +
                '<button class="btn btn-secondary btn-sm btn-quiz-chapitre" onclick="lancerQuizChapitre(' + chap.id + ', ' + id + ')" disabled>' +
                'Quiz du chapitre <span class="statut-quiz-chapitre">(verification...)</span>' +
                '</button>' +
                '</div>' +
                '</div></div>';
        }

        // Ajouter le bouton "Examen final" si toutes les lecons sont chargees
        html += '<div class="examen-final-bouton-visionneuse" style="margin-top:16px;padding:12px;text-align:center;">' +
            '<button class="btn btn-primary btn-full" onclick="verifierExamenFinal(' + id + ')">Passer l\'examen final</button>' +
            '</div>';

        list.innerHTML = html;

        // Verifier le statut de chaque chapitre pour activer/desactiver les quiz dans le menu lateral
        for (var i = 0; i < res.chapitres.length; i++) {
            verifierStatutChapitre(res.chapitres[i].id);
        }

        if (leconsCoursActuel.length > 0) voirLeconParIndex(0);
    });
}

function verifierStatutChapitre(chapitreId) {
    requeteJson("api/progression.php?verifier_chapitre=" + chapitreId).then(function (res) {
        var boutonContainer = document.querySelector('.quiz-chapitre-bouton[data-chapitre-id="' + chapitreId + '"]');
        if (!boutonContainer) return;
        var btn = boutonContainer.querySelector('.btn-quiz-chapitre');
        var statut = boutonContainer.querySelector('.statut-quiz-chapitre');
        if (!btn || !statut) return;

        if (res.succes && res.toutes_terminees) {
            btn.disabled = false;
            btn.classList.add('accessible');
            statut.textContent = '(pret)';
            statut.style.color = '#16a34a';
        } else {
            btn.disabled = true;
            btn.classList.remove('accessible');
            var reste = (res.total || 0) - (res.terminees || 0);
            statut.textContent = '(' + reste + ' lecon(s) restante(s))';
            statut.style.color = '#94a3b8';
        }
    });
}

function lancerQuizChapitre(chapitreId, coursId) {
    // Verifier d'abord que toutes les lecons sont terminees
    requeteJson("api/progression.php?verifier_chapitre=" + chapitreId).then(function (res) {
        if (res.succes && res.toutes_terminees) {
            window.location.hash = "quiz?chapitre_id=" + chapitreId;
            naviguer("quiz?chapitre_id=" + chapitreId);
        } else {
            var reste = (res.total || 0) - (res.terminees || 0);
            afficherMessage("Terminez toutes les lecons de ce chapitre (" + reste + " restante(s)) avant le quiz.", "erreur");
        }
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
        var zoneQuiz = document.getElementById("zone-quiz-chapitre");

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
                    // Rafraichir le statut du chapitre apres avoir marque la lecon
                    if (l.chapitre_id) verifierStatutChapitre(l.chapitre_id);
                    // Mettre a jour la zone quiz si c'est la derniere lecon du chapitre
                    afficherZoneQuizChapitre(l);
                    if (leconActuelleIndex < leconsCoursActuel.length - 1) {
                        voirLeconParIndex(leconActuelleIndex + 1);
                    }
                    majProgressionCours();
                } else {
                    afficherMessage(res.message || "Erreur.", "erreur");
                }
            });
        };

        // Afficher ou masquer la zone quiz chapitre selon si c'est la derniere lecon du chapitre
        afficherZoneQuizChapitre(l);

        majProgressionCours();
    });
}

function afficherZoneQuizChapitre(lecon) {
    var zoneQuiz = document.getElementById("zone-quiz-chapitre");
    if (!zoneQuiz) return;

    // Trouver le chapitre de cette lecon
    var chapitre = null;
    for (var i = 0; i < chapitresCours.length; i++) {
        if (chapitresCours[i].id === lecon.chapitre_id) {
            chapitre = chapitresCours[i];
            break;
        }
    }

    if (!chapitre || !chapitre.lecons || chapitre.lecons.length === 0) {
        zoneQuiz.classList.add("masque");
        zoneQuiz.innerHTML = "";
        return;
    }

    // Verifier si c'est la derniere lecon du chapitre
    var derniereLecon = chapitre.lecons[chapitre.lecons.length - 1];
    var estDerniereLecon = (Number(lecon.id) === Number(derniereLecon.id));

    if (!estDerniereLecon) {
        zoneQuiz.classList.add("masque");
        zoneQuiz.innerHTML = "";
        return;
    }

    // C'est la derniere lecon : afficher la zone quiz
    zoneQuiz.classList.remove("masque");

    // Verifier si toutes les lecons du chapitre sont terminees
    requeteJson("api/progression.php?verifier_chapitre=" + chapitre.id).then(function (res) {
        var toutesTerminees = res.succes && res.toutes_terminees;
        var reste = (res.total || 0) - (res.terminees || 0);

        if (toutesTerminees) {
            zoneQuiz.innerHTML =
                '<div class="zone-quiz-chapitre-pret">' +
                '<div class="quiz-chapitre-icone">&#10003;</div>' +
                '<div class="quiz-chapitre-texte">' +
                '<strong>Chapitre terminé !</strong>' +
                '<p>Vous avez complété toutes les leçons de ce chapitre. Passez maintenant le quiz pour valider vos connaissances.</p>' +
                '</div>' +
                '<button class="btn btn-primary btn-passer-quiz-chapitre" onclick="lancerQuizChapitre(' + chapitre.id + ', ' + coursActuelId + ')">' +
                'Passer le quiz' +
                '</button>' +
                '</div>';
        } else {
            zoneQuiz.innerHTML =
                '<div class="zone-quiz-chapitre-attente">' +
                '<div class="quiz-chapitre-icone quiz-chapitre-icone-attente">&#9654;</div>' +
                '<div class="quiz-chapitre-texte">' +
                '<strong>Quiz du chapitre</strong>' +
                '<p>Terminez toutes les leçons de ce chapitre pour débloquer le quiz (' + reste + ' leçon(s) restante(s)).</p>' +
                '</div>' +
                '<button class="btn btn-secondary btn-passer-quiz-chapitre" disabled>' +
                'Passer le quiz' +
                '</button>' +
                '</div>';
        }
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