// --- EXAMEN FINAL ---

var examenQuestions = [];
var examenCoursId = 0;
var examenIndex = 0;
var examenReponses = {};
var examenMinuteur = null;

function chargerExamenFinal() {
    var hash = window.location.hash;
    var params = new URLSearchParams(hash.split("?")[1]);
    var coursId = params.get("cours_id");
    if (!coursId) { window.location.hash = "catalogue"; naviguer("catalogue"); return; }

    examenCoursId = Number(coursId);

    // Charger le titre du cours
    requeteJson("api/cours.php").then(function (resCours) {
        if (resCours.succes) {
            var cours = resCours.cours.find(function (c) { return Number(c.id) === examenCoursId; });
            var titreEl = document.getElementById("examen-cours-titre");
            if (titreEl && cours) titreEl.textContent = cours.titre;
        }
    });

    // Charger les questions
    requeteJson("api/examens_finaux.php?cours_id=" + coursId).then(function (res) {
        var intro = document.getElementById("boite-examen-intro");
        var nbQ = document.getElementById("nb-questions-examen");

        if (!res.succes || !res.questions || res.questions.length === 0) {
            if (intro) intro.innerHTML = "<p>Aucune question d'examen pour ce cours.</p>";
            return;
        }

        examenQuestions = res.questions;
        if (nbQ) nbQ.textContent = examenQuestions.length;

        var btnLancer = document.getElementById("btn-lancer-examen");
        if (btnLancer) btnLancer.onclick = function () {
            if (intro) intro.classList.add("masque");
            document.getElementById("examen-jeu").classList.remove("masque");
            demarrerExamen();
        };
    });
}

function demarrerExamen() {
    examenIndex = 0;
    examenReponses = {};
    afficherQuestionExamen();
}

function arreterMinuteurExamen() {
    if (examenMinuteur) { clearInterval(examenMinuteur); examenMinuteur = null; }
}

function demarrerMinuteurExamen() {
    arreterMinuteurExamen();
    var tempsRestantEl = document.getElementById("temps-restant-examen");
    var temps = 60;
    if (tempsRestantEl) tempsRestantEl.textContent = temps;
    examenMinuteur = setInterval(function () {
        temps--;
        if (tempsRestantEl) tempsRestantEl.textContent = temps;
        if (temps <= 0) {
            arreterMinuteurExamen();
            var currentQuestion = examenQuestions[examenIndex];
            examenReponses[currentQuestion.id] = "";
            examenIndex++;
            afficherQuestionExamen();
        }
    }, 1000);
}

function validerReponseExamen() {
    var selected = document.querySelector('input[name="examen-option"]:checked');
    if (!selected) {
        afficherMessage("Selectionnez une reponse avant de valider.", "erreur");
        return;
    }

    arreterMinuteurExamen();
    var currentQuestion = examenQuestions[examenIndex];
    var codeOption = selected.value;

    // Le score est recalcule par le serveur — pas de verification cote client
    examenReponses[currentQuestion.id] = codeOption;
    examenIndex++;
    afficherQuestionExamen();
}

function afficherQuestionExamen() {
    var indicateur = document.getElementById("indicateur-question-examen");
    var texte = document.getElementById("texte-question-examen");
    var options = document.getElementById("liste-options-examen");
    var btnValider = document.getElementById("btn-valider-examen");

    if (examenIndex >= examenQuestions.length) {
        terminerExamen();
        return;
    }

    var q = examenQuestions[examenIndex];
    if (indicateur) indicateur.textContent = "Question " + (examenIndex + 1) + "/" + examenQuestions.length;
    if (texte) texte.textContent = q.question;

    if (btnValider) {
        btnValider.disabled = false;
        btnValider.onclick = validerReponseExamen;
    }

    // Afficher les options SANS data-correct (le serveur recalcule)
    if (options) {
        var optHtml = "";
        for (var i = 0; i < q.options.length; i++) {
            var o = q.options[i];
            optHtml += '<label class="option-examen-label" style="display:block;padding:14px 16px;margin-bottom:10px;border:2px solid #e2e8f0;border-radius:10px;cursor:pointer;background:#fff;transition:all 0.2s;">' +
                '<input type="radio" name="examen-option" value="' + o.code_option + '" style="margin-right:12px;transform:scale(1.2);">' +
                '<span style="font-size:16px;">' + echapperHtml(o.libelle) + '</span>' +
                '</label>';
        }
        options.innerHTML = optHtml;
    }

    demarrerMinuteurExamen();
}

function terminerExamen() {
    arreterMinuteurExamen();
    document.getElementById("examen-jeu").classList.add("masque");
    var resDiv = document.getElementById("examen-resultats");
    if (resDiv) resDiv.classList.remove("masque");

    var texteScore = document.getElementById("texte-score-examen");
    var feedback = document.getElementById("feedback-examen");
    var icone = document.getElementById("icone-resultat-examen");

    // Afficher "Calcul en cours..."
    if (texteScore) texteScore.textContent = "Calcul du score...";
    if (feedback) feedback.textContent = "Correction en cours...";

    // Envoyer les résultats au serveur (lui seul calcule le score)
    var d = new FormData();
    d.append("action", "soumettre_examen");
    d.append("cours_id", examenCoursId);
    d.append("reponses", JSON.stringify(examenReponses));

    var btnCert = document.getElementById("btn-voir-certificat-examen");
    if (btnCert) btnCert.disabled = true;

    requeteJson("api/certificats.php", { method: "POST", body: d }).then(function (res) {
        if (res.succes) {
            var noteServeur = res.note || 0;
            var nbBonnes = Math.round((noteServeur / 100) * examenQuestions.length);
            var reussi = res.reussi || false;

            if (texteScore) texteScore.textContent = "Score: " + nbBonnes + "/" + examenQuestions.length + " (" + Math.round(noteServeur) + "%)";
            if (feedback) feedback.textContent = reussi
                ? "Felicitations ! Vous avez reussi l'examen final ! Votre certificat a ete genere."
                : "Score insuffisant. Vous devez obtenir au moins 80% pour obtenir le certificat.";
            if (icone) {
                icone.textContent = reussi ? "🎉" : "❌";
                icone.style.fontSize = "48px";
            }

            if (reussi) {
                afficherMessage("Felicitations ! Certificat obtenu !", "succes");
                if (btnCert) {
                    btnCert.disabled = false;
                    btnCert.classList.remove("masque");
                    btnCert.onclick = function () {
                        window.location.hash = "certificats";
                        naviguer("certificats");
                    };
                }
                var btnRecommencer = document.getElementById("btn-recommencer-examen");
                if (btnRecommencer) btnRecommencer.classList.add("masque");
            } else {
                afficherMessage("Score insuffisant. Reessayez !", "erreur");
                if (btnCert) btnCert.classList.add("masque");
                var btnRecommencer = document.getElementById("btn-recommencer-examen");
                if (btnRecommencer) btnRecommencer.classList.remove("masque");
            }
        } else {
            if (feedback) feedback.textContent = "Erreur : " + (res.message || "");
            afficherMessage("Erreur : " + (res.message || ""), "erreur");
        }
    });

    var btnRetour = document.getElementById("btn-retour-cours-examen");
    if (btnRetour) btnRetour.onclick = function () {
        window.location.hash = "catalogue";
        naviguer("catalogue");
    };

    var btnRecommencer = document.getElementById("btn-recommencer-examen");
    if (btnRecommencer) btnRecommencer.onclick = function () {
        resDiv.classList.add("masque");
        if (btnCert) btnCert.classList.add("masque");
        btnRecommencer.classList.add("masque");
        document.getElementById("examen-jeu").classList.remove("masque");
        demarrerExamen();
    };
}