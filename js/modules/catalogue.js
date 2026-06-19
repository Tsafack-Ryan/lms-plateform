// --- CATALOGUE ---

function chargerCatalogue() {
    var g = document.getElementById("grille-catalogue-cours");
    if (!g) return;
    requeteJson("api/cours.php").then(function (res) {
        if (!res.succes || res.cours.length === 0) {
            g.innerHTML = "<p class='message-vide'>Aucun cours disponible.</p>";
            return;
        }

        var barreFiltres = document.querySelector(".barre-filtres");
        var modules = Array.from(new Map(res.cours.map(function (c) {
            return [c.module_code, { code: c.module_code, titre: c.module_titre }];
        })).values());

        if (barreFiltres) {
            var filtresHtml = '<button class="btn-filter active" data-technologie="tous">Tous</button>';
            for (var i = 0; i < modules.length; i++) {
                var m = modules[i];
                filtresHtml += '<button class="btn-filter" data-technologie="' + String(m.code).toLowerCase() + '">' + echapperHtml(m.titre) + '</button>';
            }
            barreFiltres.innerHTML = filtresHtml;
        }

        function afficher(filtre) {
            var liste;
            if (filtre === "tous") {
                liste = res.cours;
            } else {
                liste = res.cours.filter(function (c) {
                    return (c.module_code || "").toLowerCase().indexOf(filtre) !== -1 || (c.module_titre || "").toLowerCase().indexOf(filtre) !== -1;
                });
            }

            if (liste.length === 0) {
                g.innerHTML = "<p class='message-vide'>Aucun cours pour ce filtre.</p>";
                return;
            }

            var html = "";
            for (var i = 0; i < liste.length; i++) {
                var c = liste[i];
                html += '<article class="carte-cours">' +
                    '<span class="badge-module">' + echapperHtml(c.module_titre) + '</span>' +
                    '<h3>' + echapperHtml(c.titre) + '</h3>' +
                    '<p>' + echapperHtml(c.description) + '</p>' +
                    '<small>Enseignant : ' + echapperHtml(c.enseignant_nom || "Non assigne") + '</small>' +
                    '<button onclick="window.location.hash=\'visionneuse?id=' + c.id + '\';naviguer(\'visionneuse?id=' + c.id + '\')" class="btn-action-majeure">Demarrer le cours</button>' +
                    '</article>';
            }
            g.innerHTML = html;
        }

        afficher("tous");

        var filtres = document.querySelectorAll(".btn-filter");
        for (var i = 0; i < filtres.length; i++) {
            (function (btn) {
                btn.onclick = function () {
                    var actifs = document.querySelectorAll(".btn-filter");
                    for (var j = 0; j < actifs.length; j++) {
                        actifs[j].classList.remove("active");
                    }
                    btn.classList.add("active");
                    afficher(btn.dataset.technologie);
                };
            })(filtres[i]);
        }
    });
}