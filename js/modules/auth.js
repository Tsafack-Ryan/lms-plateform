// --- AUTHENTIFICATION ---

function initFormsAuth() {
    // Bascule entre connexion et inscription
    var lienInscription = document.getElementById("inscription-link");
    var lienConnexion = document.getElementById("connexion-link");
    var boiteConnexion = document.getElementById("connexion-box");
    var boiteInscription = document.getElementById("boite-inscription");

    if (lienInscription) {
        lienInscription.onclick = function (e) {
            e.preventDefault();
            if (boiteConnexion) boiteConnexion.classList.add("masque");
            if (boiteInscription) boiteInscription.classList.remove("masque");
        };
    }

    if (lienConnexion) {
        lienConnexion.onclick = function (e) {
            e.preventDefault();
            if (boiteInscription) boiteInscription.classList.add("masque");
            if (boiteConnexion) boiteConnexion.classList.remove("masque");
        };
    }

    // Formulaire de connexion (utilise email desormais)
    var fc = document.getElementById("formulaire-connexion");
    if (fc) fc.onsubmit = function (e) {
        e.preventDefault();
        var d = new FormData(fc);
        d.set("action", "login");
        // S'assurer que le champ email est bien envoye
        if (!d.has("email")) {
            var emailInput = document.getElementById("saisie-email");
            if (emailInput) d.append("email", emailInput.value);
        }
        requeteJson("api/auth.php", { method: "POST", body: d }).then(function (res) {
            if (res.succes) connecter(res.utilisateur);
            else afficherMessage(res.message, "erreur");
        });
    };

    // Formulaire d'inscription
    var fi = document.getElementById("formulaire-inscription");
    if (fi) fi.onsubmit = function (e) {
        e.preventDefault();
        var d = new FormData(fi);
        d.append("action", "register");
        requeteJson("api/auth.php", { method: "POST", body: d }).then(function (res) {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) {
                if (boiteInscription) boiteInscription.classList.add("masque");
                if (boiteConnexion) boiteConnexion.classList.remove("masque");
            }
        });
    };
}

// --- BASCULE AFFICHAGE MOT DE PASSE ---

function basculerMotPasse(idChamp, bouton) {
    var champ = document.getElementById(idChamp);
    if (!champ) return;

    var estMasque = champ.type === "password";
    champ.type = estMasque ? "text" : "password";

    // Changer l'icone : oeil ouvert / oeil barre
    bouton.innerHTML = estMasque
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}