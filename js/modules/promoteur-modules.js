// --- PROMOTEUR : GESTION DES MODULES ---

function initFormModule() {
    var f = document.getElementById("formulaire-module");
    if (f) f.onsubmit = function (e) {
        e.preventDefault();
        requeteJson("api/modules.php", { method: "POST", body: new FormData(f) }).then(function (res) {
            afficherMessage(res.message, res.succes ? "succes" : "erreur");
            if (res.succes) { f.reset(); chargerModules(); }
        });
    };
}

function chargerModules() {
    var l = document.getElementById("liste-modules");
    if (!l) return;

    Promise.all([
        requeteJson("api/modules.php"),
        requeteJson("api/cours.php")
    ]).then(function (results) {
        var modulesRes = results[0];
        var coursRes = results[1];

        if (!modulesRes.succes) {
            l.innerHTML = "<p class='message-vide'>Impossible de charger les modules.</p>";
            return;
        }

        var cours = coursRes.succes ? coursRes.cours : [];
        var html = "";
        for (var i = 0; i < modulesRes.modules.length; i++) {
            var module = modulesRes.modules[i];
            var coursModule = cours.filter(function (c) { return Number(c.module_id) === Number(module.id); });
            html += '<details class="module-accordeon">' +
                '<summary>' +
                '<span class="module-chevron">&rsaquo;</span>' +
                '<div>' +
                '<strong>' + echapperHtml(module.titre) + '</strong>' +
                '<span>' + echapperHtml(module.description || "Aucune description") + '</span>' +
                '</div>' +
                '<em>' + coursModule.length + ' cours</em>' +
                '</summary>' +
                '<div class="sous-menu-cours">';

            if (coursModule.length === 0) {
                html += '<p class="message-vide">Aucun cours reference dans ce module.</p>';
            } else {
                for (var j = 0; j < coursModule.length; j++) {
                    var c = coursModule[j];
                    html += '<div class="item-cours-module">' +
                        '<div>' +
                        '<strong>' + echapperHtml(c.titre) + '</strong>' +
                        '<span>' + echapperHtml(c.description) + '</span>' +
                        '</div>' +
                        '<small>' + echapperHtml(c.enseignant_nom || "Enseignant non assigne") + '</small>' +
                        '</div>';
                }
            }

            html += '</div></details>';
        }
        l.innerHTML = html;
    });
}