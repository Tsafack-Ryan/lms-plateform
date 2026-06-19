// Configuration des pages
const routes = {
    "connexion": "views/connexion.html",
    "dashboard": "views/dashboard.html",
    "catalogue": "views/catalogue.html",
    "visionneuse": "views/visionneuse.html",
    "quiz": "views/quiz.html",
    "certificats": "views/certificat.html",
    "examen-final": "views/examen-final.html",
    "enseignant-dashboard": "views/enseignant-dashboard.html",
    "enseignant-cours": "views/enseignant-cours.html",
    "enseignant-chapitres": "views/enseignant-chapitres.html",
    "enseignant-lecon": "views/enseignant-lecon.html",
    "enseignant-evaluation": "views/enseignant-evaluation.html",
    "promoteur-modules": "views/promoteur-modules.html"
};

// Elements principaux
var zoneContenu = document.getElementById("zone-contenu");
var barreLaterale = document.getElementById("barre-laterale");
var userConnected = document.getElementById("user-connected");

var utilisateurActuel = null;

// --- FONCTIONS DE BASE ---

function requeteJson(url, options) {
    options = options || {};
    return fetch(url, Object.assign({ credentials: "same-origin" }, options))
        .then(function (r) { return r.json(); })
        .catch(function (e) {
            console.error("Erreur API:", e);
            return { succes: false, message: "Erreur de connexion au serveur PHP." };
        });
}

function afficherMessage(message, type) {
    type = type || "info";
    var b = document.getElementById("message-app");
    if (!b) {
        b = document.createElement("div");
        b.id = "message-app";
        document.body.appendChild(b);
    }
    b.textContent = message;
    b.className = "message-application " + type;
    setTimeout(function () { if (b) b.remove(); }, 4000);
}

function echapperHtml(valeur) {
    var s = String(valeur || "");
    var e = String.fromCharCode(38);
    return s.split(e).join(e + "amp;").split("<").join(e + "lt;").split(">").join(e + "gt;").split('"').join(e + "quot;").split("'").join(e + "#039;");
}

function echapperJs(valeur) {
    var s = String(valeur || "");
    return s
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");
}

function premierTexte() {
    var args = Array.prototype.slice.call(arguments);
    for (var i = 0; i < args.length; i++) {
        if (args[i] !== undefined && args[i] !== null && String(args[i]).trim() !== "") {
            return args[i];
        }
    }
    return "";
}

function chargerVue(page) {
    var chemin = routes[page] || routes["connexion"];
    console.log("Chargement de la vue:", page, "->", chemin);

    if (zoneContenu) zoneContenu.innerHTML = "<p style='padding:20px'>Chargement en cours...</p>";

    fetch(chemin)
        .then(function (r) {
            if (!r.ok) throw new Error("Fichier vue introuvable: " + chemin);
            return r.text();
        })
        .then(function (html) {
            zoneContenu.innerHTML = html;
            initialiserContenu(page);
        })
        .catch(function (e) {
            console.error(e);
            zoneContenu.innerHTML = "<div class='message-vide'>Erreur critique: " + e.message + "</div>";
        });
}

// --- LOGIQUE DE NAVIGATION ---

function naviguer(pageHash) {
    var page = pageHash.split("?")[0].replace("#", "");
    if (!page) {
        afficherConnexion();
        return;
    }

    document.querySelectorAll(".nav-link").forEach(function (l) {
        var href = l.getAttribute("href").replace("#", "");
        l.classList.toggle("active", href === page);
    });

    chargerVue(page);
}

function afficherConnexion() {
    utilisateurActuel = null;
    if (barreLaterale) barreLaterale.classList.add("masquee");
    window.location.hash = "";
    chargerVue("connexion");
}

function connecter(u) {
    utilisateurActuel = u;
    var role = u.role;
    var home = "dashboard";
    if (role === "enseignant") home = "enseignant-dashboard";
    if (role === "promoteur") home = "promoteur-modules";

    if (userConnected) userConnected.textContent = role.toUpperCase() + " - " + u.nom;

    document.querySelectorAll("[data-role-menu]").forEach(function (el) {
        el.classList.toggle("masque", el.dataset.roleMenu !== role);
    });

    if (barreLaterale) barreLaterale.classList.remove("masquee");
    window.location.hash = home;
    naviguer(home);
}

// --- INITIALISATION DES VUES ---

function initialiserContenu(page) {
    initFormsAuth();

    if (page === "dashboard") chargerStatsEtudiant();
    if (page === "enseignant-dashboard") { chargerStatsEnseignant(); chargerCoursListe(); }
    if (page === "catalogue") chargerCatalogue();
    if (page === "visionneuse") chargerVisionneuse();
    if (page === "quiz") chargerQuiz();
    if (page === "certificats") chargerCertificats();
    if (page === "examen-final") chargerExamenFinal();
    if (page === "promoteur-modules") { initFormModule(); chargerModules(); }
    if (page === "enseignant-cours") { initFormCours(); chargerCoursListe(); }
    if (page === "enseignant-chapitres") { initFormChapitre(); }
    if (page === "enseignant-lecon") { initFormLecon(); chargerLeconsEnseignant(); }
    if (page === "enseignant-evaluation") { initFormEvaluation(); chargerEvaluationsEnseignant(); }
}

// --- DEMARRAGE ---

document.addEventListener("DOMContentLoaded", function () {
    requeteJson("api/auth.php").then(function (res) {
        if (res.succes && res.utilisateur) {
            connecter(res.utilisateur);
        } else {
            var h = window.location.hash;
            if (h) naviguer(h); else afficherConnexion();
        }
    });

    var btnDeco = document.getElementById("deconnexion-btn");
    if (btnDeco) btnDeco.onclick = function () {
        requeteJson("api/auth.php?action=logout", { method: "POST" }).finally(afficherConnexion);
    };

    document.querySelectorAll(".nav-link").forEach(function (l) {
        l.onclick = function (e) {
            e.preventDefault();
            var p = l.getAttribute("href");
            window.location.hash = p;
            naviguer(p);
        };
    });

    var h = window.location.hash;
    if (h) naviguer(h); else afficherConnexion();
});