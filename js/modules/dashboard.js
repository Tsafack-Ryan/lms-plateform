// --- TABLEAU DE BORD ETUDIANT ---

function chargerStatsEtudiant() {
    requeteJson("api/dashboard.php").then(function (res) {
        if (res.succes && res.stats) {
            var nomEl = document.getElementById("nom-etudiant");
            if (nomEl && utilisateurActuel) nomEl.textContent = utilisateurActuel.nom;

            var nbrCours = document.getElementById("nbr-cours");
            if (nbrCours) nbrCours.textContent = res.stats.cours || 0;

            var nbrLeconsFinies = document.getElementById("nbr-cours-fini");
            if (nbrLeconsFinies) nbrLeconsFinies.textContent = res.stats.lecons || 0;

            var nbrQuizReussis = document.getElementById("nbr-quiz-reussis");
            if (nbrQuizReussis) nbrQuizReussis.textContent = res.stats.quiz || 0;

            var progEl = document.getElementById("pourcentage-progression");
            if (progEl) progEl.textContent = (res.stats.progression || 0) + "%";

            var fill = document.getElementById("remplissage-barre-progression");
            if (fill) fill.style.width = (res.stats.progression || 0) + "%";

            var actifs = document.getElementById("liste-cours-actifs");
            var coursEnCours = res.cours_en_cours || [];
            if (actifs) {
                actifs.innerHTML = coursEnCours.length === 0
                    ? '<p class="message-vide" id="message-aucun-cours">Vous n\'avez aucun cours en cours. Visitez le <a href="#catalogue">catalogue</a> pour commencer.</p>'
                    : coursEnCours.map(function (c) { return carteCoursDashboard(c, true); }).join("");
            }

            var termines = document.getElementById("liste-cours-termines");
            var coursTermines = res.cours_termines || [];
            if (termines) {
                termines.innerHTML = coursTermines.length === 0
                    ? '<p class="message-vide">Aucun cours termine pour le moment.</p>'
                    : coursTermines.map(function (c) { return ligneCompacteCours(c); }).join("");
            }

            var quiz = document.getElementById("liste-quiz-reussis");
            var coursAvecQuiz = (res.cours || []).filter(function (c) { return Number(c.quiz_reussis) > 0; });
            if (quiz) {
                quiz.innerHTML = coursAvecQuiz.length === 0
                    ? '<p class="message-vide">Aucun quiz reussi pour le moment.</p>'
                    : coursAvecQuiz.map(function (c) {
                        return '<div class="ligne-compacte">' +
                            '<div>' +
                            '<strong>' + echapperHtml(c.titre) + '</strong>' +
                            '<span>' + Number(c.quiz_reussis) + ' quiz reussi(s)</span>' +
                            '</div>' +
                            '<span class="badge-module">' + echapperHtml(c.module_code) + '</span>' +
                            '</div>';
                    }).join("");
            }
        }
    });
}

function carteCoursDashboard(cours, avecBouton) {
    avecBouton = avecBouton || false;
    var pourcentage = Number(cours.pourcentage || 0);
    var bouton = avecBouton
        ? '<button class="btn btn-primary" onclick="window.location.hash=\'visionneuse?id=' + cours.id + '\';naviguer(\'visionneuse?id=' + cours.id + '\')">Continuer</button>'
        : "";
    return '<article class="carte-cours carte-cours-progression">' +
        '<span class="badge-module">' + echapperHtml(cours.module_titre) + '</span>' +
        '<h3>' + echapperHtml(cours.titre) + '</h3>' +
        '<p>' + echapperHtml(cours.description) + '</p>' +
        '<small>Enseignant : ' + echapperHtml(cours.enseignant_nom || "Non assigne") + '</small>' +
        '<div class="mini-progression">' +
        '<div class="fond-barre-progression">' +
        '<div style="width:' + pourcentage + '%"></div>' +
        '</div>' +
        '<span>' + pourcentage + '%</span>' +
        '</div>' +
        bouton +
        '</article>';
}

function ligneCompacteCours(cours) {
    return '<div class="ligne-compacte">' +
        '<div>' +
        '<strong>' + echapperHtml(cours.titre) + '</strong>' +
        '<span>' + echapperHtml(cours.module_titre) + ' - ' + Number(cours.lecons_terminees) + '/' + Number(cours.total_lecons) + ' lecons</span>' +
        '</div>' +
        '<span class="badge-module">100%</span>' +
        '</div>';
}