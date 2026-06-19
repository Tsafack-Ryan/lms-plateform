// --- TABLEAU DE BORD ENSEIGNANT ---

function chargerStatsEnseignant() {
    requeteJson("api/dashboard.php").then(function (res) {
        if (res.succes && res.stats) {
            var tc = document.getElementById("total-cours");
            if (tc) tc.textContent = res.stats.cours;

            var tl = document.getElementById("total-lecons");
            if (tl) tl.textContent = res.stats.lecons;

            var te = document.getElementById("total-evaluations");
            if (te) te.textContent = res.stats.evaluations;
        }
    });
}