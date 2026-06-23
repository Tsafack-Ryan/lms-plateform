// --- QUIZ ---

var quizQuestions = [];
var quizLeconId = 0;      // 0 si mode chapitre
var quizChapitreId = 0;   // 0 si mode lecon
var quizIndex = 0;
var quizScore = 0;
var quizReponses = {};
var quizMinuteur = null;

function chargerQuiz() {
    var hash = window.location.hash;
    var params = new URLSearchParams(hash.split("?")[1]);
    var leconId = params.get("lecon_id");
    var chapitreId = params.get("chapitre_id");
    var apiUrl = "";

    if (chapitreId) {
        apiUrl = "api/evaluations.php?chapitre_id=" + chapitreId;
    } else if (leconId) {
        apiUrl = "api/evaluations.php?lecon_id=" + leconId;
    } else {
        return;
    }

    requeteJson(apiUrl).then(function (res) {
        var start = document.getElementById("btn-lancer-quiz");
        var intro = document.getElementById("boite-quiz");
        var jeu = document.getElementById("quiz-jeu");

        if (!res.succes || res.evaluations.length === 0) {
            if (intro) intro.innerHTML = "<p>Aucune question pour ce quiz.</p>";
            return;
        }

        // Stocker les questions et le contexte pour la session
        quizQuestions = res.evaluations;
        if (chapitreId) {
            quizChapitreId = Number(chapitreId);
            quizLeconId = 0;
        } else {
            quizLeconId = Number(leconId);
            quizChapitreId = 0;
        }

        // Mettre à jour le nombre total de questions dans l'intro
        var totalEl = document.getElementById("nombre-total-questions");
        if (totalEl) totalEl.textContent = quizQuestions.length;

        if (start) start.onclick = function () {
            if (intro) intro.classList.add("masque");
            if (jeu) jeu.classList.remove("masque");
            demarrerQuiz();
        };
    });
}

function demarrerQuiz() {
    quizIndex = 0;
    quizScore = 0;
    quizReponses = {};
    afficherQuestion();
}

function arreterMinuteur() {
    if (quizMinuteur) { clearInterval(quizMinuteur); quizMinuteur = null; }
}

function demarrerMinuteur() {
    arreterMinuteur();
    var tempsRestantEl = document.getElementById("temps-restant");
    var temps = 30; // Augmenté de 20s à 30s pour laisser le temps de lire
    if (tempsRestantEl) tempsRestantEl.textContent = temps;
    quizMinuteur = setInterval(function () {
        temps--;
        if (tempsRestantEl) tempsRestantEl.textContent = temps;
        if (temps <= 0) {
            arreterMinuteur();
            // Temps écoulé : enregistrer une réponse vide pour cette question
            var currentQuestion = quizQuestions[quizIndex];
            quizReponses[currentQuestion.id] = "";
            quizIndex++;
            afficherQuestion();
        }
    }, 1000);
}

function validerReponseSelectionnee() {
    var selected = document.querySelector('input[name="quiz-option"]:checked');
    if (!selected) {
        afficherMessage("Selectionnez une reponse avant de valider.", "erreur");
        return;
    }

    arreterMinuteur();
    var currentQuestion = quizQuestions[quizIndex];
    var codeOption = selected.value;

    // Le score est recalcule par le serveur pour eviter la triche
    // On fait une verification cote client pour l'affichage immediat
    quizReponses[currentQuestion.id] = codeOption;
    quizIndex++;
    afficherQuestion();
}

function afficherQuestion() {
    var indicateur = document.getElementById("indicateur-question");
    var texte = document.getElementById("texte-question");
    var options = document.getElementById("liste-option-quiz");
    var btnValider = document.getElementById("btn-valider-option");
    var tempsRestantEl = document.getElementById("temps-restant");

    if (quizIndex >= quizQuestions.length) {
        terminerQuiz();
        return;
    }

    var q = quizQuestions[quizIndex];
    if (indicateur) indicateur.textContent = "Question " + (quizIndex + 1) + "/" + quizQuestions.length;
    if (texte) texte.textContent = q.question;

    // Activer le bouton valider
    if (btnValider) {
        btnValider.disabled = false;
        btnValider.onclick = validerReponseSelectionnee;
    }

    // Afficher les options sous forme de boutons radio + label
    // NE PAS exposer data-correct pour eviter la triche (le serveur recalcule le score)
    if (options) {
        var optHtml = "";
        for (var i = 0; i < q.options.length; i++) {
            var o = q.options[i];
            optHtml += '<label class="option-quiz-label" style="display:block;padding:12px 14px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;background:#fff;">' +
                '<input type="radio" name="quiz-option" value="' + o.code_option + '" style="margin-right:10px;">' +
                echapperHtml(o.libelle) +
                '</label>';
        }
        options.innerHTML = optHtml;
    }

    // Réinitialiser et afficher le timer
    if (tempsRestantEl) tempsRestantEl.textContent = "30";
    demarrerMinuteur();
}

function terminerQuiz() {
    arreterMinuteur();
    document.getElementById("quiz-jeu").classList.add("masque");
    var resDiv = document.getElementById("quiz-resultats");
    if (resDiv) resDiv.classList.remove("masque");

    var texteScore = document.getElementById("texte-score");
    var feedback = document.getElementById("feedback-resultat");
    var icone = document.getElementById("icone-resultat");

    // Afficher "Calcul en cours..." pendant l'appel serveur
    if (texteScore) texteScore.textContent = "Calcul du score...";
    if (feedback) feedback.textContent = "Correction en cours...";

    // Envoyer les résultats au serveur (c'est lui qui calcule le score)
    var d = new FormData();
    if (quizChapitreId > 0) {
        d.append("action", "soumettre_evaluation_chapitre");
        d.append("chapitre_id", quizChapitreId);
    } else {
        d.append("action", "soumettre_evaluation");
        d.append("lecon_id", quizLeconId);
    }
    d.append("reponses", JSON.stringify(quizReponses));

    requeteJson("api/progression.php", { method: "POST", body: d }).then(function (res) {
        if (res.succes) {
            var noteServeur = res.note || 0;
            var nbBonnes = Math.round((noteServeur / 100) * quizQuestions.length);
            var reussi = noteServeur >= 80;

            if (texteScore) texteScore.textContent = "Score: " + nbBonnes + "/" + quizQuestions.length + " (" + Math.round(noteServeur) + "%)";
            if (feedback) feedback.textContent = reussi
                ? "Felicitations, vous avez valide ce quiz !"
                : "Score insuffisant. Vous devez obtenir au moins 80% pour valider ce quiz.";
            if (icone) icone.textContent = reussi ? "OK" : "X";

            if (reussi) {
                afficherMessage("Quiz reussi !", "succes");
            } else {
                afficherMessage("Score insuffisant. Reessayez !", "erreur");
            }
        } else {
            if (feedback) feedback.textContent = "Erreur d'enregistrement : " + (res.message || "");
            afficherMessage("Erreur d'enregistrement : " + (res.message || ""), "erreur");
        }
    });

    var btnRetour = document.getElementById("btn-retour-cours");
    if (btnRetour) btnRetour.onclick = function () {
        // Retourner a la visionneuse grace a la variable globale
        if (typeof coursActuelId !== 'undefined' && coursActuelId) {
            window.location.hash = "visionneuse?id=" + coursActuelId;
            naviguer("visionneuse?id=" + coursActuelId);
        } else {
            window.location.hash = "catalogue";
            naviguer("catalogue");
        }
    };

    var btnRecommencer = document.getElementById("btn-recommencer-quiz");
    if (btnRecommencer) btnRecommencer.onclick = function () {
        resDiv.classList.add("masque");
        document.getElementById("quiz-jeu").classList.remove("masque");
        demarrerQuiz();
    };
}
