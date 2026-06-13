// Configuration des pages
const routes = {
    "connexion": "views/connexion.html",
    "dashboard": "views/dashboard.html",
    "catalogue": "views/catalogue.html",
    "visionneuse": "views/visionneuse.html",
    "quiz": "views/quiz.html",
    "enseignant-dashboard": "views/enseignant-dashboard.html",
    "enseignant-cours": "views/enseignant-cours.html",
    "enseignant-lecon": "views/enseignant-lecon.html",
    "enseignant-evaluation": "views/enseignant-evaluation.html",
    "promoteur-modules": "views/promoteur-modules.html"
};

// Elements principaux
const zoneContenu = document.getElementById("zone-contenu");
const barreLaterale = document.getElementById("barre-laterale");
const userConnected = document.getElementById("user-connected");

let utilisateurActuel = null;

// --- FONCTIONS DE BASE ---

function requeteJson(url, options = {}) {
    return fetch(url, { credentials: "same-origin", ...options })
        .then(r => r.json())
        .catch(e => {
            console.error("Erreur API:", e);
            return { succes: false, message: "Erreur de connexion au serveur PHP." };
        });
}

function afficherMessage(message, type = "info") {
    let b = document.getElementById("message-app");
    if (!b) {
        b = document.createElement("div");
        b.id = "message-app";
        document.body.appendChild(b);
    }
    b.textContent = message;
    b.className = "message-application " + type;
    setTimeout(() => { if (b) b.remove(); }, 4000);
}

function chargerVue(page) {
    const chemin = routes[page] || routes["connexion"];
    console.log("Chargement de la vue:", page, "->", chemin);
    
    if (zoneContenu) zoneContenu.innerHTML = "<p style='padding:20px'>Chargement en cours...</p>";

    fetch(chemin)
        .then(r => {
            if (!r.ok) throw new Error("Fichier vue introuvable: " + chemin);
            return r.text();
        })
        .then(html => {
            zoneContenu.innerHTML = html;
            initialiserContenu(page);
        })
        .catch(e => {
            console.error(e);
            zoneContenu.innerHTML = "<div class='message-vide'>Erreur critique: " + e.message + "</div>";
        });
}

// --- LOGIQUE DE NAVIGATION ---

function naviguer(pageHash) {
    const page = pageHash.split("?")[0].replace("#", "");
    if (!page) {
        afficherConnexion();
        return;
    }
    
    // Mettre a jour les liens actifs
    document.querySelectorAll(".nav-link").forEach(l => {
        const href = l.getAttribute("href").replace("#", "");
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
    const role = u.role;
    let home = "dashboard";
    if (role === "enseignant") home = "enseignant-dashboard";
    if (role === "promoteur") home = "promoteur-modules";

    if (userConnected) userConnected.textContent = role.toUpperCase() + " - " + u.nom;
    
    // Afficher/Masquer les menus selon le role
    document.querySelectorAll("[data-role-menu]").forEach(el => {
        el.classList.toggle("masque", el.dataset.roleMenu !== role);
    });

    if (barreLaterale) barreLaterale.classList.remove("masquee");
    window.location.hash = home;
    naviguer(home);
}

// --- INITIALISATION DES VUES ---

function initialiserContenu(page) {
    // Toujours initialiser les formulaires de connexion s'ils sont la
    initFormsAuth();

    if (page === "dashboard") chargerStatsEtudiant();
    if (page === "enseignant-dashboard") chargerStatsEnseignant();
    if (page === "catalogue") chargerCatalogue();
    if (page === "visionneuse") chargerVisionneuse();
    if (page === "quiz") chargerQuiz();
    if (page === "promoteur-modules") { initFormModule(); chargerModules(); }
    if (page === "enseignant-cours") { initFormCours(); chargerCoursListe(); }
    if (page === "enseignant-lecon") initFormLecon();
    if (page === "enseignant-evaluation") initFormEvaluation();
}

// --- MODULES SPECIFIQUES ---

function chargerCatalogue() {
    const g = document.getElementById("grille-catalogue-cours");
    if (!g) return;
    requeteJson("api/cours.php").then(res => {
        if (!res.succes || res.cours.length === 0) {
            g.innerHTML = "<p class='message-vide'>Aucun cours disponible.</p>";
            return;
        }
        g.innerHTML = res.cours.map(c => `
            <article class="carte-cours">
                <span class="badge-module">${c.module_titre}</span>
                <h3>${c.titre}</h3>
                <p>${c.description}</p>
                <button onclick="window.location.hash='visionneuse?id=${c.id}';naviguer('visionneuse?id=${c.id}')" class="btn-action-majeure">Suivre ce cours</button>
            </article>
        `).join("");
    });
}

function chargerVisionneuse() {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    const id = params.get("id");
    if (!id) { window.location.hash = "catalogue"; return; }

    requeteJson("api/lecons.php?cours_id=" + id).then(res => {
        const list = document.getElementById("liste-chapitres");
        if (!list) return;
        if (!res.succes || res.lecons.length === 0) {
            list.innerHTML = "<p>Aucune lecon.</p>";
            return;
        }
        list.innerHTML = res.lecons.map(l => `
            <div class="chapitre-item" onclick="voirLecon(${l.id})">${l.titre}</div>
        `).join("");
    });
}

function voirLecon(id) {
    requeteJson("api/lecons.php?id=" + id).then(res => {
        if (!res.succes) return;
        const l = res.lecon;
        const zone = document.getElementById("contenu-texte-lecon");
        const titre = document.getElementById("titre-lecon-actuelle");
        const barre = document.getElementById("barre-actions-lecon");

        if (titre) titre.textContent = l.titre;
        if (zone) {
            zone.innerHTML = l.type_contenu === "pdf" 
                ? `<embed src="${l.chemin_fichier}" type="application/pdf" width="100%" height="600px">`
                : `<video controls width="100%"><source src="${l.chemin_fichier}" type="video/mp4"></video>`;
        }
        if (barre) barre.classList.remove("masquee");
        const bq = document.getElementById("btn-passer-quiz");
        if (bq) bq.onclick = () => { window.location.hash = "quiz?lecon_id=" + l.id; naviguer("quiz?lecon_id=" + l.id); };
    });
}

function chargerQuiz() {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    const id = params.get("lecon_id");
    if (!id) return;

    requeteJson("api/evaluations.php?lecon_id=" + id).then(res => {
        const start = document.getElementById("btn-lancer-quiz");
        const intro = document.getElementById("boite-quiz");
        const jeu = document.getElementById("quiz-jeu");

        if (!res.succes || res.evaluations.length === 0) {
            if (intro) intro.innerHTML = "<p>Aucune question pour ce quiz.</p>";
            return;
        }

        if (start) start.onclick = () => {
            if (intro) intro.classList.add("masque");
            if (jeu) jeu.classList.remove("masque");
            lancerLeQuiz(res.evaluations, id);
        };
    });
}

function lancerLeQuiz(questions, leconId) {
    let index = 0, score = 0;
    const reponsesEnvoyees = {};
    const texte = document.getElementById("texte-question");
    const options = document.getElementById("liste-option-quiz");

    const afficherQuestion = () => {
        if (index >= questions.length) {
            document.getElementById("quiz-jeu").classList.add("masque");
            const resDiv = document.getElementById("quiz-resultats");
            if (resDiv) resDiv.classList.remove("masque");
            
            const note = (score / questions.length) * 100;
            const texteScore = document.getElementById("texte-score");
            if (texteScore) texteScore.textContent = "Score: " + Math.round(note) + "%";
            
            // Envoi des resultats reels
            const d = new FormData();
            d.append("action", "soumettre_evaluation");
            d.append("lecon_id", leconId);
            d.append("reponses", JSON.stringify(reponsesEnvoyees));
            
            requeteJson("api/progression.php", { method: "POST", body: d }).then(res => {
                if (res.succes) {
                    afficherMessage("Résultats enregistrés !", "succes");
                }
            });
            return;
        }
        
        const q = questions[index];
        if (texte) texte.textContent = q.question;
        if (options) {
            options.innerHTML = q.options.map(o => `
                <button class="btn-secondaire" style="width:100%;margin-bottom:10px" 
                    onclick="validerRep(${o.id}, ${o.est_correcte}, '${o.code_option}')">
                    ${o.libelle}
                </button>
            `).join("");
        }
    };

    window.validerRep = (optionId, correct, code) => {
        const currentQuestion = questions[index];
        reponsesEnvoyees[currentQuestion.id] = code;
        if (correct) score++;
        index++;
        afficherQuestion();
    };

    afficherQuestion();
}

// --- FORMULAIRES ---

function initFormsAuth() {
    const fc = document.getElementById("formulaire-connexion");
    if (fc) fc.onsubmit = (e) => {
        e.preventDefault();
        const d = new FormData(fc);
        d.append("action", "login");
        d.append("role", document.querySelector("input[name='role-utilisateur']:checked").value);
        requeteJson("api/auth.php", { method: "POST", body: d }).then(res => {
            if (res.succes) connecter(res.utilisateur);
            else afficherMessage(res.message, "erreur");
        });
    };
    
    const fi = document.getElementById("formulaire-inscription");
    if (fi) fi.onsubmit = (e) => {
        e.preventDefault();
        const d = new FormData(fi);
        d.append("action", "register");
        d.append("role", document.querySelector("input[name='role-inscription']:checked").value);
        requeteJson("api/auth.php", { method: "POST", body: d }).then(res => {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) {
                document.getElementById("boite-inscription").classList.add("masque");
                document.getElementById("connexion-box").classList.remove("masque");
            }
        });
    };
}

// --- INITIALISATION AU CHARGEMENT ---

document.addEventListener("DOMContentLoaded", () => {
    // Gestion de la deconnexion
    const btnDeco = document.getElementById("deconnexion-btn");
    if (btnDeco) btnDeco.onclick = () => {
        requeteJson("api/auth.php?action=logout", { method: "POST" }).finally(afficherConnexion);
    };

    // Gestion du menu lateral
    document.querySelectorAll(".nav-link").forEach(l => {
        l.onclick = (e) => {
            e.preventDefault();
            const p = l.getAttribute("href");
            window.location.hash = p;
            naviguer(p);
        };
    });

    // Demarrage
    const h = window.location.hash;
    if (h) naviguer(h); else afficherConnexion();
});

// Fonctions globales pour Enseignant (simplifiees)
function initFormCours() {
    const f = document.getElementById("formulaire-cours");
    if (f) f.onsubmit = (e) => {
        e.preventDefault();
        requeteJson("api/cours.php", { method: "POST", body: new FormData(f) }).then(res => {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) { f.reset(); chargerCoursListe(); }
        });
    };
}

function chargerCoursListe() {
    const l = document.getElementById("liste-cours-enseignant");
    if (l) requeteJson("api/cours.php").then(res => {
        if (res.succes) l.innerHTML = res.cours.map(c => `<div class="ligne-tableau"><strong>${c.titre}</strong></div>`).join("");
    });
}

function initFormLecon() {
    const f = document.getElementById("formulaire-lecon"), s = document.getElementById("cours-lecon");
    if (!f || !s) return;
    requeteJson("api/cours.php").then(res => { if (res.succes) s.innerHTML = "<option value=''>Choisir...</option>" + res.cours.map(c => `<option value="${c.id}">${c.titre}</option>`).join(""); });
    f.onsubmit = (e) => {
        e.preventDefault();
        requeteJson("api/lecons.php", { method: "POST", body: new FormData(f) }).then(res => {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) f.reset();
        });
    };
}

function initFormEvaluation() {
    const f = document.getElementById("formulaire-evaluation"), s = document.getElementById("lecon-evaluation");
    if (!f || !s) return;
    requeteJson("api/lecons.php").then(res => { if (res.succes) s.innerHTML = "<option value=''>Choisir...</option>" + res.lecons.map(l => `<option value="${l.id}">${l.titre}</option>`).join(""); });
    f.onsubmit = (e) => {
        e.preventDefault();
        requeteJson("api/evaluations.php", { method: "POST", body: new FormData(f) }).then(res => {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) f.reset();
        });
    };
}

function chargerStatsEtudiant() {
    requeteJson("api/dashboard.php").then(res => {
        if (res.succes) {
            if (document.getElementById("nom-etudiant")) document.getElementById("nom-etudiant").textContent = utilisateurActuel.nom;
            if (document.getElementById("nbr-cours")) document.getElementById("nbr-cours").textContent = res.stats.cours;
            if (document.getElementById("pourcentage-progression")) document.getElementById("pourcentage-progression").textContent = res.stats.progression + "%";
        }
    });
}

function chargerStatsEnseignant() {
    requeteJson("api/dashboard.php").then(res => {
        if (res.succes) {
            if (document.getElementById("total-cours")) document.getElementById("total-cours").textContent = res.stats.cours;
        }
    });
}

function initFormModule() {
    const f = document.getElementById("formulaire-module");
    if (f) f.onsubmit = (e) => {
        e.preventDefault();
        requeteJson("api/modules.php", { method: "POST", body: new FormData(f) }).then(res => {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) { f.reset(); chargerModules(); }
        });
    };
}

function chargerModules() {
    const l = document.getElementById("liste-modules");
    if (l) requeteJson("api/modules.php").then(res => { if (res.succes) l.innerHTML = res.modules.map(m => `<div class="ligne-tableau"><strong>${m.titre}</strong></div>`).join(""); });
}
