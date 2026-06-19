// --- QUIZ ---

var quizQuestions = [];
var quizLeconId = 0;
var quizIndex = 0;
var quizScore = 0;
var quizReponses = {};
var quizMinuteur = null;

function chargerQuiz() {
    var hash = window.location.hash;
    var params = new URLSearchParams(hash.split("?")[1]);
    var id = params.get("lecon_id");
    if (!id) return;

    requeteJson("api/evaluations.php?lecon_id=" + id).then(function (res) {
        var start = document.getElementById("btn-lancer-quiz");
        var intro = document.getElementById("boite-quiz");
        var jeu = document.getElementById("quiz-jeu");

        if (!res.succes || res.evaluations.length === 0) {
            if (intro) intro.innerHTML = "<p>Aucune question pour ce quiz.</p>";
            return;
        }

        // Stocker les questions et le contexte pour la session
        quizQuestions = res.evaluations;
        quizLeconId = Number(id);

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
    var estCorrecte = selected.dataset.correct === "1";

    quizReponses[currentQuestion.id] = codeOption;
    if (estCorrecte) quizScore++;
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
    if (options) {
        var optHtml = "";
        for (var i = 0; i < q.options.length; i++) {
            var o = q.options[i];
            optHtml += '<label class="option-quiz-label" style="display:block;padding:12px 14px;margin-bottom:8px;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;background:#fff;">' +
                '<input type="radio" name="quiz-option" value="' + o.code_option + '" data-correct="' + o.est_correcte + '" style="margin-right:10px;">' +
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

    var note = (quizScore / quizQuestions.length) * 100;
    var texteScore = document.getElementById("texte-score");
    if (texteScore) texteScore.textContent = "Score: " + quizScore + "/" + quizQuestions.length + " (" + Math.round(note) + "%)";

    var feedback = document.getElementById("feedback-resultat");
    var icone = document.getElementById("icone-resultat");
    var btnCertificat = document.getElementById("btn-voir-certificat");
    var reussi = note >= 80;

    if (feedback) feedback.textContent = reussi
        ? "Felicitations, vous avez valide ce module !"
        : "Score insuffisant. Vous devez obtenir au moins 80% pour valider ce module.";
    if (icone) icone.textContent = reussi ? "OK" : "X";
    if (btnCertificat) btnCertificat.classList.toggle("masque", !reussi);

    // Envoyer les résultats au serveur
    var d = new FormData();
    d.append("action", "soumettre_evaluation");
    d.append("lecon_id", quizLeconId);
    d.append("reponses", JSON.stringify(quizReponses));

    var btnCert = document.getElementById("btn-voir-certificat");
    if (btnCert) btnCert.disabled = true;

    requeteJson("api/progression.php", { method: "POST", body: d }).then(function (res) {
        if (res.succes) {
            afficherMessage("Resultats enregistres !", "succes");
            if (btnCert && reussi) {
                btnCert.disabled = false;
                btnCert.onclick = function () {
                    window.location.hash = "certificats";
                    naviguer("certificats");
                };
            }
        } else {
            afficherMessage("Erreur d'enregistrement : " + (res.message || ""), "erreur");
        }
    });

    var btnRetour = document.getElementById("btn-retour-cours");
    if (btnRetour) btnRetour.onclick = function () { naviguer("catalogue"); };

    var btnRecommencer = document.getElementById("btn-recommencer-quiz");
    if (btnRecommencer) btnRecommencer.onclick = function () {
        resDiv.classList.add("masque");
        if (btnCertificat) btnCertificat.classList.add("masque");
        document.getElementById("quiz-jeu").classList.remove("masque");
        demarrerQuiz();
    };
}