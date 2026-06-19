// --- AUTHENTIFICATION ---

function initFormsAuth() {
    var fc = document.getElementById("formulaire-connexion");
    if (fc) fc.onsubmit = function (e) {
        e.preventDefault();
        var d = new FormData(fc);
        d.append("action", "login");
        requeteJson("api/auth.php", { method: "POST", body: d }).then(function (res) {
            if (res.succes) connecter(res.utilisateur);
            else afficherMessage(res.message, "erreur");
        });
    };

    var fi = document.getElementById("formulaire-inscription");
    if (fi) fi.onsubmit = function (e) {
        e.preventDefault();
        var d = new FormData(fi);
        d.append("action", "register");
        requeteJson("api/auth.php", { method: "POST", body: d }).then(function (res) {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) {
                document.getElementById("boite-inscription").classList.add("masque");
                document.getElementById("connexion-box").classList.remove("masque");
            }
        });
    };
}