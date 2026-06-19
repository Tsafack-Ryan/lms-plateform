// --- ENSEIGNANT : GESTION DES EVALUATIONS ---

function switcherOngletEvaluation(onglet) {
    // Mettre a jour les boutons d'onglet
    document.querySelectorAll(".btn-onglet-eval").forEach(function (btn) {
        btn.classList.toggle("actif", btn.dataset.onglet === onglet);
    });

    // Afficher/masquer les zones
    var zoneQuiz = document.getElementById("zone-quiz-evaluation");
    var zoneExamen = document.getElementById("zone-examen-evaluation");
    if (zoneQuiz) zoneQuiz.classList.toggle("masque", onglet !== "quiz");
    if (zoneExamen) zoneExamen.classList.toggle("masque", onglet !== "examen");
}

function initFormEvaluation() {
    // Formulaire quiz
    var f = document.getElementById("formulaire-evaluation");
    var s = document.getElementById("lecon-evaluation");
    if (f && s) {
        requeteJson("api/lecons.php").then(function (res) {
            if (res.succes) {
                var opt = "<option value=''>Choisir...</option>";
                for (var i = 0; i < res.lecons.length; i++) {
                    opt += '<option value="' + res.lecons[i].id + '">' + echapperHtml(res.lecons[i].cours_titre) + ' - ' + echapperHtml(res.lecons[i].titre) + '</option>';
                }
                s.innerHTML = opt;
            }
        });
        f.onsubmit = function (e) {
            e.preventDefault();
            requeteJson("api/evaluations.php", { method: "POST", body: new FormData(f) }).then(function (res) {
                afficherMessage(res.message, res.succes ? "succes" : "erreur");
                if (res.succes) { f.reset(); chargerEvaluationsEnseignant(); chargerStatsEnseignant(); }
            });
        };
    }

    // Formulaire examen final
    var fe = document.getElementById("formulaire-examen-final");
    var se = document.getElementById("cours-examen");
    if (fe && se) {
        requeteJson("api/cours.php").then(function (res) {
            if (res.succes) {
                var opt = "<option value=''>Choisir...</option>";
                for (var i = 0; i < res.cours.length; i++) {
                    opt += '<option value="' + res.cours[i].id + '">' + echapperHtml(res.cours[i].titre) + '</option>';
                }
                se.innerHTML = opt;
            }
        });
        fe.onsubmit = function (e) {
            e.preventDefault();
            var donnees = {
                cours_id: Number(document.getElementById("cours-examen").value),
                question: document.getElementById("question-examen").value.trim(),
                options: {
                    A: document.getElementById("opt-ex-a").value.trim(),
                    B: document.getElementById("opt-ex-b").value.trim(),
                    C: document.getElementById("opt-ex-c").value.trim(),
                    D: document.getElementById("opt-ex-d").value.trim()
                },
                bonne_reponse: document.getElementById("bonne-rep-examen").value
            };

            requeteJson("api/examens_finaux.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(donnees)
            }).then(function (res) {
                afficherMessage(res.message, res.succes ? "succes" : "erreur");
                if (res.succes) { fe.reset(); chargerEvaluationsEnseignant(); chargerStatsEnseignant(); }
            });
        };
    }
}

function chargerEvaluationsEnseignant() {
    var l = document.getElementById("liste-evaluations-enseignant");
    if (!l) return;

    Promise.all([
        requeteJson("api/evaluations.php"),
        requeteJson("api/examens_finaux.php")
    ]).then(function (results) {
        var resEvals = results[0];
        var resExamen = results[1];

        var html = "";

        // Afficher les questions de quiz
        if (resEvals.succes && resEvals.evaluations.length > 0) {
            for (var i = 0; i < resEvals.evaluations.length; i++) {
                var e = resEvals.evaluations[i];
                var bonne = (e.options || []).find(function (o) { return Number(o.est_correcte) === 1; });
                html += '<div class="ligne-cours-enseignant">' +
                    '<div class="info-cours-enseignant">' +
                    '<span class="badge-module">Quiz - ' + echapperHtml(e.cours_titre) + '</span>' +
                    '<strong>' + echapperHtml(e.question) + '</strong>' +
                    '<span class="desc-cours-enseignant">' + echapperHtml(e.lecon_titre) + ' - Bonne reponse : ' + echapperHtml(bonne ? bonne.code_option : "-") + '</span>' +
                    '</div>' +
                    '<div class="actions-cours-enseignant">' +
                    '<button class="btn-supprimer-cours" onclick="supprimerEvaluation(' + e.id + ')">Supprimer</button>' +
                    '</div>' +
                    '</div>';
            }
        }

        // Afficher les questions d'examen final
        if (resExamen && resExamen.succes && resExamen.questions && resExamen.questions.length > 0) {
            for (var i = 0; i < resExamen.questions.length; i++) {
                var q = resExamen.questions[i];
                var bonneOpt = (q.options || []).find(function (o) { return Number(o.est_correcte) === 1; });
                html += '<div class="ligne-cours-enseignant">' +
                    '<div class="info-cours-enseignant">' +
                    '<span class="badge-module" style="background:#dbeafe;color:#2563eb;">Examen final</span>' +
                    '<strong>' + echapperHtml(q.question) + '</strong>' +
                    '<span class="desc-cours-enseignant">Bonne reponse : ' + echapperHtml(bonneOpt ? bonneOpt.code_option : "-") + '</span>' +
                    '</div>' +
                    '<div class="actions-cours-enseignant">' +
                    '<button class="btn-supprimer-cours" onclick="supprimerQuestionExamen(' + q.id + ')">Supprimer</button>' +
                    '</div>' +
                    '</div>';
            }
        }

        if (html === "") {
            html = "<p class='message-vide'>Aucune question ajoutee pour le moment.</p>";
        }

        l.innerHTML = html;
    });
}

function supprimerEvaluation(id) {
    if (!confirm("Supprimer cette question ?")) return;
    requeteJson("api/evaluations.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
    }).then(function (res) {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { chargerEvaluationsEnseignant(); chargerStatsEnseignant(); }
    });
}

function supprimerQuestionExamen(id) {
    if (!confirm("Supprimer cette question d'examen ?")) return;
    requeteJson("api/examens_finaux.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
    }).then(function (res) {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { chargerEvaluationsEnseignant(); chargerStatsEnseignant(); }
    });
}