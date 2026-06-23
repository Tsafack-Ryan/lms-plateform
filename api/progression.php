<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$utilisateur = exigerUtilisateur();
$methode = methodeHttp();

if ($methode === 'GET') {
    $coursId = (int) ($_GET['cours_id'] ?? 0);
    $chapitreId = (int) ($_GET['chapitre_id'] ?? 0);
    $verificationChapitre = (int) ($_GET['verifier_chapitre'] ?? 0);

    // Vérifier si toutes les lecons d'un chapitre sont terminees
    if ($verificationChapitre > 0) {
        $stmtTotalLecons = $pdo->prepare('SELECT COUNT(*) FROM lecons WHERE chapitre_id = ?');
        $stmtTotalLecons->execute([$verificationChapitre]);
        $totalLecons = (int) $stmtTotalLecons->fetchColumn();

        $stmtTermineesLecons = $pdo->prepare('
            SELECT COUNT(*) FROM progressions p
            INNER JOIN lecons l ON l.id = p.lecon_id
            WHERE l.chapitre_id = ? AND p.etudiant_id = ? AND p.statut = "terminee"
        ');
        $stmtTermineesLecons->execute([$verificationChapitre, $utilisateur['id']]);
        $termineesLecons = (int) $stmtTermineesLecons->fetchColumn();

        $toutesTerminees = ($totalLecons > 0 && $termineesLecons >= $totalLecons);

        reponseJson([
            'succes' => true,
            'total' => $totalLecons,
            'terminees' => $termineesLecons,
            'toutes_terminees' => $toutesTerminees,
            'pourcentage' => $totalLecons > 0 ? round(($termineesLecons / $totalLecons) * 100) : 0,
        ]);
    }

    // Progression d'un chapitre specifique
    if ($chapitreId > 0) {
        $stmtTotal = $pdo->prepare('SELECT COUNT(*) FROM lecons WHERE chapitre_id = ?');
        $stmtTotal->execute([$chapitreId]);
        $total = (int) $stmtTotal->fetchColumn();

        $stmtTerminees = $pdo->prepare('
            SELECT COUNT(*) FROM progressions p
            INNER JOIN lecons l ON l.id = p.lecon_id
            WHERE l.chapitre_id = ? AND p.etudiant_id = ? AND p.statut = "terminee"
        ');
        $stmtTerminees->execute([$chapitreId, $utilisateur['id']]);
        $terminees = (int) $stmtTerminees->fetchColumn();

        $pourcentage = $total > 0 ? round(($terminees / $total) * 100) : 0;
        reponseJson(['succes' => true, 'pourcentage' => $pourcentage, 'terminees' => $terminees, 'total' => $total]);
    }

    if ($coursId > 0) {
        // Progression globale du cours (toutes lecons)
        $stmtTotal = $pdo->prepare('SELECT COUNT(*) FROM lecons l INNER JOIN chapitres chap ON chap.id = l.chapitre_id WHERE chap.cours_id = ?');
        $stmtTotal->execute([$coursId]);
        $total = (int) $stmtTotal->fetchColumn();

        $stmtTerminees = $pdo->prepare('
            SELECT COUNT(*) FROM progressions p
            INNER JOIN lecons l ON l.id = p.lecon_id
            INNER JOIN chapitres chap ON chap.id = l.chapitre_id
            WHERE chap.cours_id = ? AND p.etudiant_id = ? AND p.statut = "terminee"
        ');
        $stmtTerminees->execute([$coursId, $utilisateur['id']]);
        $terminees = (int) $stmtTerminees->fetchColumn();

        $pourcentage = $total > 0 ? round(($terminees / $total) * 100) : 0;

        // Vérifier si l'examen final est débloqué :
        // 1. Toutes les leçons de tous les chapitres sont terminées
        $stmtChapitresNonFinis = $pdo->prepare('
            SELECT COUNT(*) FROM chapitres chap
            WHERE chap.cours_id = ?
            AND EXISTS (
                SELECT 1 FROM lecons l WHERE l.chapitre_id = chap.id
                AND NOT EXISTS (
                    SELECT 1 FROM progressions p WHERE p.lecon_id = l.id AND p.etudiant_id = ? AND p.statut = "terminee"
                )
            )
        ');
        $stmtChapitresNonFinis->execute([$coursId, $utilisateur['id']]);
        $leconsTerminees = ((int) $stmtChapitresNonFinis->fetchColumn()) === 0 && $total > 0;

        // 2. Tous les quiz de chapitres sont réussis (note >= 80)
        // Un quiz de chapitre est réussi si toutes les leçons du chapitre ont une note >= 80
        // (car soumettre_evaluation_chapitre enregistre la même note pour toutes les leçons du chapitre)
        $stmtChapitresAvecEvals = $pdo->prepare('
            SELECT COUNT(DISTINCT chap.id) FROM chapitres chap
            INNER JOIN lecons l ON l.chapitre_id = chap.id
            INNER JOIN evaluations e ON e.lecon_id = l.id
            WHERE chap.cours_id = ?
        ');
        $stmtChapitresAvecEvals->execute([$coursId]);
        $nbChapitresAvecEvals = (int) $stmtChapitresAvecEvals->fetchColumn();

        $quizReussis = true;
        if ($nbChapitresAvecEvals > 0) {
            // Verifier que chaque chapitre ayant des evaluations a au moins une lecon avec note >= 80
            $stmtChapitresQuizNonReussis = $pdo->prepare('
                SELECT COUNT(DISTINCT chap.id) FROM chapitres chap
                INNER JOIN lecons l ON l.chapitre_id = chap.id
                INNER JOIN evaluations e ON e.lecon_id = l.id
                WHERE chap.cours_id = ?
                AND NOT EXISTS (
                    SELECT 1 FROM progressions p
                    INNER JOIN lecons l2 ON l2.id = p.lecon_id
                    WHERE l2.chapitre_id = chap.id
                    AND p.etudiant_id = ?
                    AND p.statut = "terminee"
                    AND p.note >= 80
                )
            ');
            $stmtChapitresQuizNonReussis->execute([$coursId, $utilisateur['id']]);
            $quizReussis = ((int) $stmtChapitresQuizNonReussis->fetchColumn()) === 0;
        }

        $examen_debloque = $leconsTerminees && $quizReussis;

        reponseJson([
            'succes' => true,
            'pourcentage' => $pourcentage,
            'terminees' => $terminees,
            'total' => $total,
            'examen_debloque' => $examen_debloque,
        ]);
    }

    // Toutes les progressions de l'étudiant
    $stmt = $pdo->prepare('
        SELECT p.lecon_id, p.note, p.statut, l.titre AS lecon_titre, l.chapitre_id,
               chap.titre AS chapitre_titre, chap.cours_id, c.titre AS cours_titre
        FROM progressions p
        INNER JOIN lecons l ON l.id = p.lecon_id
        INNER JOIN chapitres chap ON chap.id = l.chapitre_id
        INNER JOIN cours c ON c.id = chap.cours_id
        WHERE p.etudiant_id = ?
        ORDER BY c.titre ASC, chap.ordre ASC, l.ordre ASC
    ');
    $stmt->execute([$utilisateur['id']]);

    reponseJson(['succes' => true, 'progressions' => $stmt->fetchAll()]);
}

$donnees = $_POST ?: lireJson();
$action = $donnees['action'] ?? '';

if ($action === 'demarrer_cours') {
    $coursId = (int) ($donnees['cours_id'] ?? 0);
    if ($coursId <= 0)
        reponseJson(['succes' => false, 'message' => 'Cours invalide.'], 422);

    $stmt = $pdo->prepare('SELECT id FROM cours WHERE id = ?');
    $stmt->execute([$coursId]);
    if (!$stmt->fetchColumn())
        reponseJson(['succes' => false, 'message' => 'Cours introuvable.'], 404);

    $stmt = $pdo->prepare('INSERT IGNORE INTO inscriptions (etudiant_id, cours_id) VALUES (?, ?)');
    $stmt->execute([$utilisateur['id'], $coursId]);

    reponseJson(['succes' => true, 'message' => 'Cours demarre.']);
}

if ($action === 'marquer_lue') {
    $leconId = (int) ($donnees['lecon_id'] ?? 0);
    if ($leconId <= 0)
        reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);

    $stmtCours = $pdo->prepare('SELECT chap.cours_id FROM lecons l INNER JOIN chapitres chap ON chap.id = l.chapitre_id WHERE l.id = ?');
    $stmtCours->execute([$leconId]);
    $coursId = (int) $stmtCours->fetchColumn();
    if ($coursId <= 0)
        reponseJson(['succes' => false, 'message' => 'Lecon introuvable.'], 404);

    $stmtInscription = $pdo->prepare('INSERT IGNORE INTO inscriptions (etudiant_id, cours_id) VALUES (?, ?)');
    $stmtInscription->execute([$utilisateur['id'], $coursId]);

    $stmt = $pdo->prepare('
        INSERT INTO progressions (etudiant_id, lecon_id, note, statut)
        VALUES (?, ?, 0, "terminee")
        ON DUPLICATE KEY UPDATE statut = "terminee"
    ');
    $stmt->execute([$utilisateur['id'], $leconId]);

    reponseJson(['succes' => true, 'message' => 'Lecon marquee comme lue.']);
}

if ($action === 'soumettre_evaluation') {
    $leconId = (int) ($donnees['lecon_id'] ?? 0);
    $reponsesBrutes = $donnees['reponses'] ?? '[]';
    $reponses = is_string($reponsesBrutes) ? json_decode($reponsesBrutes, true) : $reponsesBrutes;

    if ($leconId <= 0 || empty($reponses))
        reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);

    $stmtCours = $pdo->prepare('SELECT chap.cours_id FROM lecons l INNER JOIN chapitres chap ON chap.id = l.chapitre_id WHERE l.id = ?');
    $stmtCours->execute([$leconId]);
    $coursId = (int) $stmtCours->fetchColumn();
    if ($coursId <= 0)
        reponseJson(['succes' => false, 'message' => 'Lecon introuvable.'], 404);

    $stmtInscription = $pdo->prepare('INSERT IGNORE INTO inscriptions (etudiant_id, cours_id) VALUES (?, ?)');
    $stmtInscription->execute([$utilisateur['id'], $coursId]);

    // Récupérer toutes les évaluations de la leçon
    $stmtEvals = $pdo->prepare('SELECT id FROM evaluations WHERE lecon_id = ? ORDER BY id ASC');
    $stmtEvals->execute([$leconId]);
    $toutesEvals = $stmtEvals->fetchAll(PDO::FETCH_COLUMN);
    $totalQuestions = count($toutesEvals);

    if ($totalQuestions === 0)
        reponseJson(['succes' => false, 'message' => 'Pas d\'evaluation pour cette lecon.'], 404);

    $stmt = $pdo->prepare('
        SELECT e.id, o.code_option FROM evaluations e
        INNER JOIN options_evaluation o ON o.evaluation_id = e.id
        WHERE e.lecon_id = ? AND o.est_correcte = 1
    ');
    $stmt->execute([$leconId]);
    $bonnesReponses = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $points = 0;
    foreach ($toutesEvals as $evalId) {
        if (isset($reponses[$evalId]) && isset($bonnesReponses[$evalId]) && $bonnesReponses[$evalId] === $reponses[$evalId]) {
            $points++;
        }
    }

    $note = ($totalQuestions > 0) ? ($points / $totalQuestions) * 100 : 0;

    $stmt = $pdo->prepare('
        INSERT INTO progressions (etudiant_id, lecon_id, note, statut)
        VALUES (?, ?, ?, "terminee")
        ON DUPLICATE KEY UPDATE
            note = GREATEST(progressions.note, VALUES(note)),
            statut = "terminee"
    ');
    $stmt->execute([$utilisateur['id'], $leconId, $note]);

    reponseJson(['succes' => true, 'message' => 'Evaluation terminee !', 'note' => round($note, 2)]);
}

if ($action === 'soumettre_evaluation_chapitre') {
    $chapitreId = (int) ($donnees['chapitre_id'] ?? 0);
    $reponsesBrutes = $donnees['reponses'] ?? '[]';
    $reponses = is_string($reponsesBrutes) ? json_decode($reponsesBrutes, true) : $reponsesBrutes;

    if ($chapitreId <= 0 || empty($reponses)) {
        reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);
    }

    // Récupérer toutes les leçons du chapitre
    $stmtLecons = $pdo->prepare('SELECT l.id, chap.cours_id FROM lecons l INNER JOIN chapitres chap ON chap.id = l.chapitre_id WHERE l.chapitre_id = ? ORDER BY l.ordre ASC');
    $stmtLecons->execute([$chapitreId]);
    $lecons = $stmtLecons->fetchAll();

    if (empty($lecons)) {
        reponseJson(['succes' => false, 'message' => 'Chapitre introuvable.'], 404);
    }

    $coursId = (int) $lecons[0]['cours_id'];

    // Vérifier inscription
    $stmtInscription = $pdo->prepare('INSERT IGNORE INTO inscriptions (etudiant_id, cours_id) VALUES (?, ?)');
    $stmtInscription->execute([$utilisateur['id'], $coursId]);

    // Récupérer toutes les évaluations de toutes les leçons du chapitre
    $leconIds = array_column($lecons, 'id');
    $placeholders = implode(',', array_fill(0, count($leconIds), '?'));
    $stmtEvals = $pdo->prepare("SELECT id FROM evaluations WHERE lecon_id IN ($placeholders) ORDER BY id ASC");
    $stmtEvals->execute($leconIds);
    $toutesEvals = $stmtEvals->fetchAll(PDO::FETCH_COLUMN);
    $totalQuestions = count($toutesEvals);

    if ($totalQuestions === 0) {
        reponseJson(['succes' => false, 'message' => "Pas d'evaluation pour ce chapitre."], 404);
    }

    // Récupérer les bonnes réponses
    $stmtBonnes = $pdo->prepare("
        SELECT e.id, o.code_option FROM evaluations e
        INNER JOIN options_evaluation o ON o.evaluation_id = e.id
        WHERE e.id IN ($placeholders) AND o.est_correcte = 1
    ");
    $stmtBonnes->execute($toutesEvals);
    $bonnesReponses = $stmtBonnes->fetchAll(PDO::FETCH_KEY_PAIR);

    $points = 0;
    foreach ($toutesEvals as $evalId) {
        if (isset($reponses[$evalId]) && isset($bonnesReponses[$evalId]) && $bonnesReponses[$evalId] === $reponses[$evalId]) {
            $points++;
        }
    }

    $note = ($totalQuestions > 0) ? ($points / $totalQuestions) * 100 : 0;

    // Enregistrer la progression pour chaque leçon du chapitre
    $stmtProg = $pdo->prepare('
        INSERT INTO progressions (etudiant_id, lecon_id, note, statut)
        VALUES (?, ?, ?, "terminee")
        ON DUPLICATE KEY UPDATE
            note = GREATEST(progressions.note, VALUES(note)),
            statut = "terminee"
    ');
    foreach ($lecons as $lecon) {
        $stmtProg->execute([$utilisateur['id'], $lecon['id'], $note]);
    }

    reponseJson(['succes' => true, 'message' => 'Evaluation du chapitre terminee !', 'note' => round($note, 2)]);
}

reponseJson(['succes' => false, 'message' => 'Action inconnue.'], 400);
