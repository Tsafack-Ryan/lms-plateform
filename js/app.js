// Configuration des pages
const routes = {
    "connexion": "views/connexion.html",
    "dashboard": "views/dashboard.html",
    "catalogue": "views/catalogue.html",
    "visionneuse": "views/visionneuse.html",
    "quiz": "views/quiz.html",
    "certificats": "views/certificat.html",
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

function echapperHtml(valeur) {
    return String(valeur ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function echapperJs(valeur) {
    return String(valeur ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");
}

function premierTexte(...valeurs) {
    return valeurs.find(v => v !== undefined && v !== null && String(v).trim() !== "") || "";
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
    if (page === "enseignant-dashboard") { chargerStatsEnseignant(); chargerCoursListe(); }
    if (page === "catalogue") chargerCatalogue();
    if (page === "visionneuse") chargerVisionneuse();
    if (page === "quiz") chargerQuiz();
    if (page === "certificats") chargerCertificats();
    if (page === "promoteur-modules") { initFormModule(); chargerModules(); }
    if (page === "enseignant-cours") { initFormCours(); chargerCoursListe(); }
    if (page === "enseignant-lecon") { initFormLecon(); chargerLeconsEnseignant(); }
    if (page === "enseignant-evaluation") { initFormEvaluation(); chargerEvaluationsEnseignant(); }
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

        const barreFiltres = document.querySelector(".barre-filtres");
        const modules = Array.from(new Map(res.cours.map(c => [
            c.module_code,
            { code: c.module_code, titre: c.module_titre }
        ])).values());

        if (barreFiltres) {
            barreFiltres.innerHTML = `
                <button class="btn-filter active" data-technologie="tous">Tous</button>
                ${modules.map(m => `
                    <button class="btn-filter" data-technologie="${echapperHtml(String(m.code).toLowerCase())}">
                        ${echapperHtml(m.titre)}
                    </button>
                `).join("")}
            `;
        }

        const afficher = (filtre) => {
            const liste = filtre === "tous"
                ? res.cours
                : res.cours.filter(c => (c.module_code || "").toLowerCase().includes(filtre) || (c.module_titre || "").toLowerCase().includes(filtre));

            if (liste.length === 0) {
                g.innerHTML = "<p class='message-vide'>Aucun cours pour ce filtre.</p>";
                return;
            }

            g.innerHTML = liste.map(c => `
                <article class="carte-cours">
                    <span class="badge-module">${echapperHtml(c.module_titre)}</span>
                    <h3>${echapperHtml(c.titre)}</h3>
                    <p>${echapperHtml(c.description)}</p>
                    <small>Enseignant : ${echapperHtml(c.enseignant_nom || "Non assigne")}</small>
                    <button onclick="window.location.hash='visionneuse?id=${c.id}';naviguer('visionneuse?id=${c.id}')" class="btn-action-majeure">Demarrer le cours</button>
                </article>
            `).join("");
        };

        afficher("tous");

        document.querySelectorAll(".btn-filter").forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll(".btn-filter").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                afficher(btn.dataset.technologie);
            };
        });
    });
}

let leconsCoursActuel = [];
let leconActuelleIndex = -1;

function chargerVisionneuse() {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    const id = params.get("id");
    if (!id) { window.location.hash = "catalogue"; naviguer("catalogue"); return; }

    const btnRetour = document.getElementById("btn-retour-catalogue");
    if (btnRetour) btnRetour.onclick = () => { window.location.hash = "catalogue"; naviguer("catalogue"); };

    const demarrage = new FormData();
    demarrage.append("action", "demarrer_cours");
    demarrage.append("cours_id", id);
    requeteJson("api/progression.php", { method: "POST", body: demarrage });

    requeteJson("api/lecons.php?cours_id=" + id).then(res => {
        const list = document.getElementById("liste-chapitres");
        if (!list) return;
        if (!res.succes || res.lecons.length === 0) {
            list.innerHTML = "<p>Aucune lecon.</p>";
            return;
        }

        leconsCoursActuel = res.lecons;
        leconActuelleIndex = -1;

        list.innerHTML = res.lecons.map((l, i) => `
            <div class="chapitre-item" data-index="${i}" onclick="voirLeconParIndex(${i})">${l.titre}</div>
        `).join("");

        // Charger automatiquement la premiere lecon
        voirLeconParIndex(0);
    });
}

function voirLeconParIndex(index) {
    if (index < 0 || index >= leconsCoursActuel.length) return;
    leconActuelleIndex = index;

    document.querySelectorAll("#liste-chapitres .chapitre-item").forEach(el => {
        el.classList.toggle("active", Number(el.dataset.index) === index);
    });

    voirLecon(leconsCoursActuel[index].id);
}

function voirLecon(id) {
    requeteJson("api/lecons.php?id=" + id).then(res => {
        if (!res.succes) {
            afficherMessage(res.message || "Lecon introuvable.", "erreur");
            return;
        }
        const l = res.lecon;
        const zone = document.getElementById("contenu-texte-lecon");
        const titre = document.getElementById("titre-lecon-actuelle");
        const barre = document.getElementById("barre-actions-lecon");

        if (titre) titre.textContent = l.titre;
        if (zone) {
            zone.innerHTML = l.type_contenu === "pdf"
                ? `<embed src="${l.chemin_fichier}" type="application/pdf">`
                : `<video controls><source src="${l.chemin_fichier}" type="video/mp4"></video>`;
        }
        if (barre) barre.classList.remove("masquee");

        const bq = document.getElementById("btn-passer-quiz");
        if (bq) bq.onclick = () => { window.location.hash = "quiz?lecon_id=" + l.id; naviguer("quiz?lecon_id=" + l.id); };

        const bp = document.getElementById("btn-lecon-precedente");
        if (bp) {
            bp.disabled = leconActuelleIndex <= 0;
            bp.onclick = () => voirLeconParIndex(leconActuelleIndex - 1);
        }

        const bs = document.getElementById("btn-lecon-suivante");
        if (bs) {
            bs.disabled = leconActuelleIndex >= leconsCoursActuel.length - 1;
            bs.onclick = () => voirLeconParIndex(leconActuelleIndex + 1);
        }

        const bm = document.getElementById("btn-marquer-terminee");
        if (bm) bm.onclick = () => {
            const d = new FormData();
            d.append("action", "marquer_lue");
            d.append("lecon_id", l.id);
            requeteJson("api/progression.php", { method: "POST", body: d }).then(res => {
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
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    const coursId = params.get("id");
    if (!coursId) return;

    requeteJson("api/progression.php?cours_id=" + coursId).then(res => {
        const pct = document.getElementById("pourcentage-cours");
        const fill = document.getElementById("remplissage-progression-cours");
        if (res.succes) {
            if (pct) pct.textContent = res.pourcentage + "% termine";
            if (fill) fill.style.width = res.pourcentage + "%";
        }
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
    const indicateur = document.getElementById("indicateur-question");
    const tempsRestantEl = document.getElementById("temps-restant");
    const totalQuestionsEl = document.getElementById("nombre-total-questions");

    if (totalQuestionsEl) totalQuestionsEl.textContent = questions.length;

    let minuteur = null;

    const arreterMinuteur = () => {
        if (minuteur) { clearInterval(minuteur); minuteur = null; }
    };

    const demarrerMinuteur = () => {
        arreterMinuteur();
        let temps = 20;
        if (tempsRestantEl) tempsRestantEl.textContent = temps;
        minuteur = setInterval(() => {
            temps--;
            if (tempsRestantEl) tempsRestantEl.textContent = temps;
            if (temps <= 0) {
                arreterMinuteur();
                // Temps ecoule : aucune reponse enregistree pour cette question
                const currentQuestion = questions[index];
                reponsesEnvoyees[currentQuestion.id] = "";
                index++;
                afficherQuestion();
            }
        }, 1000);
    };

    const afficherQuestion = () => {
        if (index >= questions.length) {
            arreterMinuteur();
            document.getElementById("quiz-jeu").classList.add("masque");
            const resDiv = document.getElementById("quiz-resultats");
            if (resDiv) resDiv.classList.remove("masque");

            const note = (score / questions.length) * 100;
            const texteScore = document.getElementById("texte-score");
            if (texteScore) texteScore.textContent = "Score: " + score + "/" + questions.length + " (" + Math.round(note) + "%)";

            const feedback = document.getElementById("feedback-resultat");
            const icone = document.getElementById("icone-resultat");
            const btnCertificat = document.getElementById("btn-voir-certificat");
            const reussi = note >= 80;

            if (feedback) feedback.textContent = reussi
                ? "Felicitations, vous avez valide ce module !"
                : "Score insuffisant. Vous devez obtenir au moins 80% pour valider ce module.";
            if (icone) icone.textContent = reussi ? "OK" : "X";
            if (btnCertificat) btnCertificat.classList.toggle("masque", !reussi);

            // Envoi des resultats — on attend la confirmation avant d'activer le bouton certificat
            const d = new FormData();
            d.append("action", "soumettre_evaluation");
            d.append("lecon_id", leconId);
            d.append("reponses", JSON.stringify(reponsesEnvoyees));

            const btnCert = document.getElementById("btn-voir-certificat");
            if (btnCert) btnCert.disabled = true;

            requeteJson("api/progression.php", { method: "POST", body: d }).then(res => {
                if (res.succes) {
                    afficherMessage("Résultats enregistrés !", "succes");
                    // Maintenant que la note est en base, on peut activer le bouton
                    if (btnCert && reussi) {
                        btnCert.disabled = false;
                        btnCert.onclick = () => {
                            window.location.hash = "certificats";
                            naviguer("certificats");
                        };
                    }
                } else {
                    afficherMessage("Erreur d'enregistrement : " + (res.message || ""), "erreur");
                }
            });

            const btnRetour = document.getElementById("btn-retour-cours");
            if (btnRetour) btnRetour.onclick = () => { naviguer("catalogue"); };

            const btnRecommencer = document.getElementById("btn-recommencer-quiz");
            if (btnRecommencer) btnRecommencer.onclick = () => {
                resDiv.classList.add("masque");
                if (btnCertificat) btnCertificat.classList.add("masque");
                document.getElementById("quiz-jeu").classList.remove("masque");
                index = 0;
                score = 0;
                for (const k in reponsesEnvoyees) delete reponsesEnvoyees[k];
                afficherQuestion();
            };

            return;
        }

        const q = questions[index];
        if (indicateur) indicateur.textContent = "Question " + (index + 1) + "/" + questions.length;
        if (texte) texte.textContent = q.question;
        if (options) {
            options.innerHTML = q.options.map(o => `
                <button class="btn-secondaire" style="width:100%;margin-bottom:10px" 
                    onclick="validerRep(${o.id}, ${o.est_correcte}, '${o.code_option}')">
                    ${echapperHtml(o.libelle)}
                </button>
            `).join("");
        }
        demarrerMinuteur();
    };

    window.validerRep = (optionId, correct, code) => {
        arreterMinuteur();
        const currentQuestion = questions[index];
        reponsesEnvoyees[currentQuestion.id] = code;
        if (correct) score++;
        index++;
        afficherQuestion();
    };

    afficherQuestion();
}

function chargerCertificats() {
    const conteneur = document.getElementById("liste-certificats-debloques");
    if (!conteneur) return;

    requeteJson("api/dashboard.php").then(res => {
        if (!res.succes) return;

        const debloques = res.cours_termines || [];

        if (debloques.length === 0) {
            conteneur.innerHTML = "<p class='message-vide'>Aucun certificat debloque pour le moment. Terminez toutes les lecons d'un cours pour en obtenir un.</p>";
            return;
        }

        conteneur.innerHTML = debloques.map(c => `
            <article class="carte-cours">
                <span class="badge-module">${echapperHtml(c.module_titre)}</span>
                <h3>${echapperHtml(c.titre)}</h3>
                <p>Certificat de reussite du cours ${echapperHtml(c.titre)}.</p>
                <button class="btn-action-majeure" onclick="afficherCertificat('${echapperJs(c.titre)}')">Voir le certificat</button>
            </article>
        `).join("");
    });

    const fermer = document.getElementById("btn-fermer-modale");
    if (fermer) fermer.onclick = () => document.getElementById("modal-certificat").classList.add("masque");

    const imprimer = document.getElementById("btn-imprimer-certificat");
    if (imprimer) imprimer.onclick = () => window.print();
}

function afficherCertificat(titreCours) {
    const modal = document.getElementById("modal-certificat");
    const zone = document.getElementById("zone-rendu-certificat");
    if (!modal || !zone) return;

    const nom = (utilisateurActuel && utilisateurActuel.nom) || "Etudiant";
    const date = new Date().toLocaleDateString("fr-FR");

    zone.innerHTML = `
        <div style="padding:48px 40px;text-align:center;font-family:'Plus Jakarta Sans',Arial,sans-serif;">
            <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:28px;">
                <svg width="36" height="36" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="28" cy="28" r="6" stroke="#00ffc8" stroke-width="1.5"/>
                    <path d="M28 22V8M28 48V34M22 28H8M48 28H34" stroke="#00ffc8" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M22 22L14 14M34 34L42 42M34 22L42 14M22 34L14 42" stroke="#00ffc8" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
                    <circle cx="28" cy="8" r="2" fill="#00ffc8"/>
                    <circle cx="28" cy="48" r="2" fill="#00ffc8"/>
                    <circle cx="8" cy="28" r="2" fill="#00ffc8"/>
                    <circle cx="48" cy="28" r="2" fill="#00ffc8"/>
                </svg>
                <span style="font-family:'Space Mono',monospace;font-weight:700;font-size:18px;letter-spacing:0.2em;color:#0a0e17;">STARACADEMY</span>
            </div>
            <div style="width:60px;height:3px;background:#2563eb;margin:0 auto 28px;border-radius:2px;"></div>
            <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#64748b;margin-bottom:20px;">Certificat de Reussite</p>
            <p style="color:#64748b;margin-bottom:10px;">Ce certificat est decerne a</p>
            <h2 style="font-size:32px;font-weight:700;color:#172033;margin-bottom:20px;border-bottom:2px solid #e2e8f0;padding-bottom:20px;">${nom}</h2>
            <p style="color:#64748b;margin-bottom:8px;">pour avoir valide avec succes le cours</p>
            <h3 style="font-size:22px;font-weight:700;color:#2563eb;margin-bottom:28px;">${echapperHtml(titreCours)}</h3>
            <div style="width:60px;height:3px;background:#e2e8f0;margin:0 auto 24px;border-radius:2px;"></div>
            <p style="font-size:13px;color:#94a3b8;">Delivre le ${date}</p>
        </div>
    `;

    modal.classList.remove("masque");
}

function initFormsAuth() {
    const fc = document.getElementById("formulaire-connexion");
    if (fc) fc.onsubmit = (e) => {
        e.preventDefault();
        const d = new FormData(fc);
        d.append("action", "login");
        // Le role est déjà dans FormData si name="role-utilisateur" ou "role"
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
    // Verifier la session au demarrage
    requeteJson("api/auth.php").then(res => {
        if (res.succes && res.utilisateur) {
            connecter(res.utilisateur);
        } else {
            const h = window.location.hash;
            if (h) naviguer(h); else afficherConnexion();
        }
    });

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
    const s = document.getElementById("module-cours");
    if (!f) return;

    if (s) {
        requeteJson("api/modules.php").then(res => {
            if (res.succes) {
                s.innerHTML = "<option value=''>Selectionner un module</option>" +
                    res.modules.map(m => `<option value="${m.code}">${m.titre}</option>`).join("");
            }
        });
    }

    f.onsubmit = (e) => {
        e.preventDefault();
        requeteJson("api/cours.php", { method: "POST", body: new FormData(f) }).then(res => {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) { f.reset(); chargerCoursListe(); }
        });
    };
}

function chargerCoursListe() {
    const l = document.getElementById("liste-cours-enseignant");
    if (!l) return;

    requeteJson("api/cours.php").then(res => {
        if (!res.succes || res.cours.length === 0) {
            l.innerHTML = "<p class='message-vide'>Aucun cours ajoute pour le moment.</p>";
            return;
        }

        l.innerHTML = res.cours.map(c => `
            <div class="ligne-cours-enseignant" id="cours-ligne-${c.id}">
                <div class="info-cours-enseignant">
                    <span class="badge-module">${echapperHtml(c.module_titre)}</span>
                    <strong>${echapperHtml(c.titre)}</strong>
                    <span class="desc-cours-enseignant">${echapperHtml(c.description)}</span>
                </div>
                <div class="actions-cours-enseignant">
                    <button class="btn-modifier-cours" onclick="ouvrirModificationCours(${c.id}, '${echapperJs(c.titre)}', '${echapperJs(c.module_code)}', '${echapperJs(c.description)}')">Modifier</button>
                    <button class="btn-secondaire" onclick="naviguer('enseignant-lecon')">Lecons</button>
                    <button class="btn-secondaire" onclick="naviguer('enseignant-evaluation')">Quiz</button>
                    <button class="btn-supprimer-cours" onclick="supprimerCours(${c.id})">Supprimer</button>
                </div>
            </div>
        `).join("");
    });
}

function supprimerCours(id) {
    if (!confirm("Supprimer ce cours ? Cette action est irreversible.")) return;
    requeteJson("api/cours.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    }).then(res => {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) chargerCoursListe();
    });
}

function ouvrirModificationCours(id, titre, moduleCode, description) {
    // Supprimer un eventuel modal existant
    const existant = document.getElementById("modal-modification-cours");
    if (existant) existant.remove();

    requeteJson("api/modules.php").then(res => {
        const optionsModules = res.succes
            ? res.modules.map(m => `<option value="${echapperHtml(m.code)}" ${m.code === moduleCode ? "selected" : ""}>${echapperHtml(m.titre)}</option>`).join("")
            : "";

        const modal = document.createElement("div");
        modal.id = "modal-modification-cours";
        modal.innerHTML = `
            <div class="fond-modal" onclick="fermerModificationCours()"></div>
            <div class="boite-modal-cours">
                <h3>Modifier le cours</h3>
                <div class="groupe-saisie">
                    <label>Titre</label>
                    <input type="text" id="edit-titre-cours" value="${echapperHtml(titre)}">
                </div>
                <div class="groupe-saisie">
                    <label>Module</label>
                    <select id="edit-module-cours">${optionsModules}</select>
                </div>
                <div class="groupe-saisie">
                    <label>Description</label>
                    <textarea id="edit-description-cours" rows="4">${echapperHtml(description)}</textarea>
                </div>
                <div class="actions-formulaire">
                    <button onclick="sauvegarderModificationCours(${id})">Enregistrer</button>
                    <button class="btn-secondaire" onclick="fermerModificationCours()">Annuler</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

function fermerModificationCours() {
    const m = document.getElementById("modal-modification-cours");
    if (m) m.remove();
}

function sauvegarderModificationCours(id) {
    const titre = document.getElementById("edit-titre-cours").value.trim();
    const module = document.getElementById("edit-module-cours").value;
    const description = document.getElementById("edit-description-cours").value.trim();
    if (!titre || !module || !description) {
        afficherMessage("Tous les champs sont obligatoires.", "erreur");
        return;
    }
    requeteJson("api/cours.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, titre, module, description })
    }).then(res => {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { fermerModificationCours(); chargerCoursListe(); }
    });
}

function initFormLecon() {
    const f = document.getElementById("formulaire-lecon"), s = document.getElementById("cours-lecon");
    if (!f || !s) return;
    requeteJson("api/cours.php").then(res => {
        if (res.succes) {
            s.innerHTML = "<option value=''>Choisir...</option>" + res.cours.map(c => `<option value="${c.id}">${echapperHtml(c.titre)}</option>`).join("");
        }
    });
    f.onsubmit = (e) => {
        e.preventDefault();
        requeteJson("api/lecons.php", { method: "POST", body: new FormData(f) }).then(res => {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) { f.reset(); chargerLeconsEnseignant(); chargerStatsEnseignant(); }
        });
    };
}

function initFormEvaluation() {
    const f = document.getElementById("formulaire-evaluation"), s = document.getElementById("lecon-evaluation");
    if (!f || !s) return;
    requeteJson("api/lecons.php").then(res => {
        if (res.succes) {
            s.innerHTML = "<option value=''>Choisir...</option>" + res.lecons.map(l => `<option value="${l.id}">${echapperHtml(l.cours_titre)} - ${echapperHtml(l.titre)}</option>`).join("");
        }
    });
    f.onsubmit = (e) => {
        e.preventDefault();
        requeteJson("api/evaluations.php", { method: "POST", body: new FormData(f) }).then(res => {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) { f.reset(); chargerEvaluationsEnseignant(); chargerStatsEnseignant(); }
        });
    };
}

function chargerLeconsEnseignant() {
    const l = document.getElementById("liste-lecons-enseignant");
    if (!l) return;

    requeteJson("api/lecons.php").then(res => {
        if (!res.succes || res.lecons.length === 0) {
            l.innerHTML = "<p class='message-vide'>Aucune lecon ajoutee pour le moment.</p>";
            return;
        }

        l.innerHTML = res.lecons.map(lecon => `
            <div class="ligne-cours-enseignant">
                <div class="info-cours-enseignant">
                    <span class="badge-module">${echapperHtml(lecon.cours_titre)}</span>
                    <strong>${echapperHtml(lecon.titre)}</strong>
                    <span class="desc-cours-enseignant">Ordre ${Number(lecon.ordre)} - ${echapperHtml(lecon.type_contenu)}</span>
                </div>
                <div class="actions-cours-enseignant">
                    <button class="btn-modifier-cours" onclick="ouvrirModificationLecon(${lecon.id}, ${lecon.cours_id}, '${echapperJs(lecon.titre)}', '${echapperJs(lecon.type_contenu)}', ${Number(lecon.ordre)})">Modifier</button>
                    <button class="btn-supprimer-cours" onclick="supprimerLecon(${lecon.id})">Supprimer</button>
                </div>
            </div>
        `).join("");
    });
}

function ouvrirModificationLecon(id, coursId, titre, typeContenu, ordre) {
    const existant = document.getElementById("modal-modification-lecon");
    if (existant) existant.remove();

    requeteJson("api/cours.php").then(res => {
        const optionsCours = res.succes
            ? res.cours.map(c => `<option value="${c.id}" ${Number(c.id) === Number(coursId) ? "selected" : ""}>${echapperHtml(c.titre)}</option>`).join("")
            : "";

        const modal = document.createElement("div");
        modal.id = "modal-modification-lecon";
        modal.className = "modal-edition";
        modal.innerHTML = `
            <div class="fond-modal" onclick="fermerModalEdition('modal-modification-lecon')"></div>
            <div class="boite-modal-cours">
                <h3>Modifier la lecon</h3>
                <div class="groupe-saisie">
                    <label>Cours</label>
                    <select id="edit-cours-lecon">${optionsCours}</select>
                </div>
                <div class="groupe-saisie">
                    <label>Titre</label>
                    <input type="text" id="edit-titre-lecon" value="${echapperHtml(titre)}">
                </div>
                <div class="groupe-saisie">
                    <label>Type</label>
                    <select id="edit-type-lecon">
                        <option value="pdf" ${typeContenu === "pdf" ? "selected" : ""}>Document PDF</option>
                        <option value="video" ${typeContenu === "video" ? "selected" : ""}>Video</option>
                    </select>
                </div>
                <div class="groupe-saisie">
                    <label>Ordre</label>
                    <input type="number" id="edit-ordre-lecon" min="1" value="${Number(ordre) || 1}">
                </div>
                <div class="actions-formulaire">
                    <button onclick="sauvegarderModificationLecon(${id})">Enregistrer</button>
                    <button class="btn-secondaire" onclick="fermerModalEdition('modal-modification-lecon')">Annuler</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

function sauvegarderModificationLecon(id) {
    const donnees = {
        id,
        cours_id: Number(document.getElementById("edit-cours-lecon").value),
        titre: document.getElementById("edit-titre-lecon").value.trim(),
        type_contenu: document.getElementById("edit-type-lecon").value,
        ordre: Number(document.getElementById("edit-ordre-lecon").value)
    };

    requeteJson("api/lecons.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees)
    }).then(res => {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { fermerModalEdition("modal-modification-lecon"); chargerLeconsEnseignant(); }
    });
}

function supprimerLecon(id) {
    if (!confirm("Supprimer cette lecon et ses quiz ?")) return;
    requeteJson("api/lecons.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    }).then(res => {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { chargerLeconsEnseignant(); chargerStatsEnseignant(); }
    });
}

function chargerEvaluationsEnseignant() {
    const l = document.getElementById("liste-evaluations-enseignant");
    if (!l) return;

    requeteJson("api/evaluations.php").then(res => {
        if (!res.succes || res.evaluations.length === 0) {
            l.innerHTML = "<p class='message-vide'>Aucune question ajoutee pour le moment.</p>";
            return;
        }

        l.innerHTML = res.evaluations.map(evaluation => {
            const bonne = (evaluation.options || []).find(o => Number(o.est_correcte) === 1);
            return `
                <div class="ligne-cours-enseignant">
                    <div class="info-cours-enseignant">
                        <span class="badge-module">${echapperHtml(evaluation.cours_titre)}</span>
                        <strong>${echapperHtml(evaluation.question)}</strong>
                        <span class="desc-cours-enseignant">${echapperHtml(evaluation.lecon_titre)} - Bonne reponse : ${echapperHtml(bonne ? bonne.code_option : "-")}</span>
                    </div>
                    <div class="actions-cours-enseignant">
                        <button class="btn-modifier-cours" onclick='ouvrirModificationEvaluation(${JSON.stringify(evaluation).replace(/'/g, "&#039;")})'>Modifier</button>
                        <button class="btn-supprimer-cours" onclick="supprimerEvaluation(${evaluation.id})">Supprimer</button>
                    </div>
                </div>
            `;
        }).join("");
    });
}

function ouvrirModificationEvaluation(evaluation) {
    const existant = document.getElementById("modal-modification-evaluation");
    if (existant) existant.remove();

    requeteJson("api/lecons.php").then(res => {
        const optionsLecons = res.succes
            ? res.lecons.map(l => `<option value="${l.id}" ${Number(l.id) === Number(evaluation.lecon_id) ? "selected" : ""}>${echapperHtml(l.cours_titre)} - ${echapperHtml(l.titre)}</option>`).join("")
            : "";
        const options = {};
        (evaluation.options || []).forEach(o => { options[o.code_option] = o; });
        const bonne = (evaluation.options || []).find(o => Number(o.est_correcte) === 1);

        const modal = document.createElement("div");
        modal.id = "modal-modification-evaluation";
        modal.className = "modal-edition";
        modal.innerHTML = `
            <div class="fond-modal" onclick="fermerModalEdition('modal-modification-evaluation')"></div>
            <div class="boite-modal-cours">
                <h3>Modifier la question</h3>
                <div class="groupe-saisie">
                    <label>Lecon</label>
                    <select id="edit-lecon-evaluation">${optionsLecons}</select>
                </div>
                <div class="groupe-saisie">
                    <label>Question</label>
                    <textarea id="edit-question-evaluation" rows="3">${echapperHtml(evaluation.question)}</textarea>
                </div>
                <div class="grille-options">
                    ${["A", "B", "C", "D"].map(code => `
                        <div class="groupe-saisie">
                            <label>Option ${code}</label>
                            <input type="text" id="edit-option-${code}" value="${echapperHtml(options[code] ? options[code].libelle : "")}">
                        </div>
                    `).join("")}
                </div>
                <div class="groupe-saisie">
                    <label>Bonne reponse</label>
                    <select id="edit-bonne-reponse">
                        ${["A", "B", "C", "D"].map(code => `<option value="${code}" ${bonne && bonne.code_option === code ? "selected" : ""}>Option ${code}</option>`).join("")}
                    </select>
                </div>
                <div class="actions-formulaire">
                    <button onclick="sauvegarderModificationEvaluation(${evaluation.id})">Enregistrer</button>
                    <button class="btn-secondaire" onclick="fermerModalEdition('modal-modification-evaluation')">Annuler</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

function sauvegarderModificationEvaluation(id) {
    const donnees = {
        id,
        lecon_id: Number(document.getElementById("edit-lecon-evaluation").value),
        question: document.getElementById("edit-question-evaluation").value.trim(),
        options: {
            A: document.getElementById("edit-option-A").value.trim(),
            B: document.getElementById("edit-option-B").value.trim(),
            C: document.getElementById("edit-option-C").value.trim(),
            D: document.getElementById("edit-option-D").value.trim()
        },
        bonne_reponse: document.getElementById("edit-bonne-reponse").value
    };

    requeteJson("api/evaluations.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees)
    }).then(res => {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { fermerModalEdition("modal-modification-evaluation"); chargerEvaluationsEnseignant(); }
    });
}

function supprimerEvaluation(id) {
    if (!confirm("Supprimer cette question ?")) return;
    requeteJson("api/evaluations.php", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    }).then(res => {
        afficherMessage(res.message, res.succes ? "succes" : "erreur");
        if (res.succes) { chargerEvaluationsEnseignant(); chargerStatsEnseignant(); }
    });
}

function fermerModalEdition(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}

function chargerStatsEtudiant() {
    requeteJson("api/dashboard.php").then(res => {
        if (res.succes && res.stats) {
            const nomEl = document.getElementById("nom-etudiant");
            if (nomEl && utilisateurActuel) nomEl.textContent = utilisateurActuel.nom;

            const nbrCours = document.getElementById("nbr-cours");
            if (nbrCours) nbrCours.textContent = res.stats.cours || 0;

            const nbrLeconsFinies = document.getElementById("nbr-cours-fini");
            if (nbrLeconsFinies) nbrLeconsFinies.textContent = res.stats.lecons || 0;

            const nbrQuizReussis = document.getElementById("nbr-quiz-reussis");
            if (nbrQuizReussis) nbrQuizReussis.textContent = res.stats.quiz || 0;

            const progEl = document.getElementById("pourcentage-progression");
            if (progEl) progEl.textContent = (res.stats.progression || 0) + "%";

            const fill = document.getElementById("remplissage-barre-progression");
            if (fill) fill.style.width = (res.stats.progression || 0) + "%";

            const actifs = document.getElementById("liste-cours-actifs");
            const coursEnCours = res.cours_en_cours || [];
            if (actifs) {
                actifs.innerHTML = coursEnCours.length === 0
                    ? `<p class="message-vide" id="message-aucun-cours">Vous n'avez aucun cours en cours. Visitez le <a href="#catalogue">catalogue</a> pour commencer.</p>`
                    : coursEnCours.map(c => carteCoursDashboard(c, true)).join("");
            }

            const termines = document.getElementById("liste-cours-termines");
            const coursTermines = res.cours_termines || [];
            if (termines) {
                termines.innerHTML = coursTermines.length === 0
                    ? `<p class="message-vide">Aucun cours termine pour le moment.</p>`
                    : coursTermines.map(c => ligneCompacteCours(c)).join("");
            }

            const quiz = document.getElementById("liste-quiz-reussis");
            const coursAvecQuiz = (res.cours || []).filter(c => Number(c.quiz_reussis) > 0);
            if (quiz) {
                quiz.innerHTML = coursAvecQuiz.length === 0
                    ? `<p class="message-vide">Aucun quiz reussi pour le moment.</p>`
                    : coursAvecQuiz.map(c => `
                        <div class="ligne-compacte">
                            <div>
                                <strong>${echapperHtml(c.titre)}</strong>
                                <span>${Number(c.quiz_reussis)} quiz reussi(s)</span>
                            </div>
                            <span class="badge-module">${echapperHtml(c.module_code)}</span>
                        </div>
                    `).join("");
            }
        }
    });
}

function carteCoursDashboard(cours, avecBouton = false) {
    const pourcentage = Number(cours.pourcentage || 0);
    return `
        <article class="carte-cours carte-cours-progression">
            <span class="badge-module">${echapperHtml(cours.module_titre)}</span>
            <h3>${echapperHtml(cours.titre)}</h3>
            <p>${echapperHtml(cours.description)}</p>
            <small>Enseignant : ${echapperHtml(cours.enseignant_nom || "Non assigne")}</small>
            <div class="mini-progression">
                <div class="fond-barre-progression">
                    <div style="width:${pourcentage}%"></div>
                </div>
                <span>${pourcentage}%</span>
            </div>
            ${avecBouton ? `<button class="btn-action-majeure" onclick="window.location.hash='visionneuse?id=${cours.id}';naviguer('visionneuse?id=${cours.id}')">Continuer</button>` : ""}
        </article>
    `;
}

function ligneCompacteCours(cours) {
    return `
        <div class="ligne-compacte">
            <div>
                <strong>${echapperHtml(cours.titre)}</strong>
                <span>${echapperHtml(cours.module_titre)} - ${Number(cours.lecons_terminees)}/${Number(cours.total_lecons)} lecons</span>
            </div>
            <span class="badge-module">100%</span>
        </div>
    `;
}

function chargerStatsEnseignant() {
    requeteJson("api/dashboard.php").then(res => {
        if (res.succes && res.stats) {
            const tc = document.getElementById("total-cours");
            if (tc) tc.textContent = res.stats.cours;

            const tl = document.getElementById("total-lecons");
            if (tl) tl.textContent = res.stats.lecons;

            const te = document.getElementById("total-evaluations");
            if (te) te.textContent = res.stats.evaluations;
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
    if (!l) return;

    Promise.all([
        requeteJson("api/modules.php"),
        requeteJson("api/cours.php")
    ]).then(([modulesRes, coursRes]) => {
        if (!modulesRes.succes) {
            l.innerHTML = "<p class='message-vide'>Impossible de charger les modules.</p>";
            return;
        }

        const cours = coursRes.succes ? coursRes.cours : [];
        l.innerHTML = modulesRes.modules.map(module => {
            const coursModule = cours.filter(c => Number(c.module_id) === Number(module.id));
            return `
                <details class="module-accordeon">
                    <summary>
                        <span class="module-chevron">&rsaquo;</span>
                        <div>
                            <strong>${echapperHtml(module.titre)}</strong>
                            <span>${echapperHtml(module.description || "Aucune description")}</span>
                        </div>
                        <em>${coursModule.length} cours</em>
                    </summary>
                    <div class="sous-menu-cours">
                        ${coursModule.length === 0
                            ? `<p class="message-vide">Aucun cours reference dans ce module.</p>`
                            : coursModule.map(c => `
                                <div class="item-cours-module">
                                    <div>
                                        <strong>${echapperHtml(c.titre)}</strong>
                                        <span>${echapperHtml(c.description)}</span>
                                    </div>
                                    <small>${echapperHtml(c.enseignant_nom || "Enseignant non assigne")}</small>
                                </div>
                            `).join("")}
                    </div>
                </details>
            `;
        }).join("");
    });
}
