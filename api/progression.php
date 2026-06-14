<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$utilisateur = exigerUtilisateur();
$methode = methodeHttp();

if ($methode === 'GET') {
    $coursId = (int)($_GET['cours_id'] ?? 0);

    if ($coursId > 0) {
        // Progression specifique a un cours : nb lecons terminees / total lecons
        $stmtTotal = $pdo->prepare('SELECT COUNT(*) FROM lecons WHERE cours_id = ?');
        $stmtTotal->execute([$coursId]);
        $total = (int)$stmtTotal->fetchColumn();

        $stmtTerminees = $pdo->prepare('
            SELECT COUNT(*) FROM progressions p
            INNER JOIN lecons l ON l.id = p.lecon_id
            WHERE l.cours_id = ? AND p.etudiant_id = ? AND p.statut = "terminee"
        ');
        $stmtTerminees->execute([$coursId, $utilisateur['id']]);
        $terminees = (int)$stmtTerminees->fetchColumn();

        $pourcentage = $total > 0 ? round(($terminees / $total) * 100) : 0;
        reponseJson(['succes' => true, 'pourcentage' => $pourcentage, 'terminees' => $terminees, 'total' => $total]);
    }

    $stmt = $pdo->prepare('
        SELECT p.lecon_id, p.note, p.statut, l.titre AS lecon_titre, l.cours_id,
               c.titre AS cours_titre, c.module_id, m.code AS module_code, m.titre AS module_titre
        FROM progressions p
        INNER JOIN lecons l ON l.id = p.lecon_id
        INNER JOIN cours c ON c.id = l.cours_id
        INNER JOIN modules m ON m.id = c.module_id
        WHERE p.etudiant_id = ?
        ORDER BY c.titre ASC
    ');
    $stmt->execute([$utilisateur['id']]);

    reponseJson(['succes' => true, 'progressions' => $stmt->fetchAll()]);
}

$donnees = $_POST ?: lireJson();

$action = $donnees['action'] ?? '';

if ($action === 'demarrer_cours') {
    $coursId = (int) ($donnees['cours_id'] ?? 0);

    if ($coursId <= 0) {
        reponseJson(['succes' => false, 'message' => 'Cours invalide.'], 422);
    }

    $stmt = $pdo->prepare('SELECT id FROM cours WHERE id = ?');
    $stmt->execute([$coursId]);
    if (!$stmt->fetchColumn()) {
        reponseJson(['succes' => false, 'message' => 'Cours introuvable.'], 404);
    }

    $stmt = $pdo->prepare('
        INSERT IGNORE INTO inscriptions (etudiant_id, cours_id)
        VALUES (?, ?)
    ');
    $stmt->execute([$utilisateur['id'], $coursId]);

    reponseJson(['succes' => true, 'message' => 'Cours demarre.']);
}

if ($action === 'marquer_lue') {
    $leconId = (int) ($donnees['lecon_id'] ?? 0);

    if ($leconId <= 0) {
        reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);
    }

    $stmtCours = $pdo->prepare('SELECT cours_id FROM lecons WHERE id = ?');
    $stmtCours->execute([$leconId]);
    $coursId = (int) $stmtCours->fetchColumn();
    if ($coursId <= 0) {
        reponseJson(['succes' => false, 'message' => 'Lecon introuvable.'], 404);
    }

    $stmtInscription = $pdo->prepare('
        INSERT IGNORE INTO inscriptions (etudiant_id, cours_id)
        VALUES (?, ?)
    ');
    $stmtInscription->execute([$utilisateur['id'], $coursId]);

    // Ne jamais ecraser une note existante : INSERT seulement si absent,
    // UPDATE seulement le statut si deja present (preserve la note du quiz)
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
    
    // Si c'est une chaine (JSON envoyé via FormData), on décode
    $reponses = is_string($reponsesBrutes) ? json_decode($reponsesBrutes, true) : $reponsesBrutes;

    if ($leconId <= 0 || empty($reponses)) {
        reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);
    }

    $stmtCours = $pdo->prepare('SELECT cours_id FROM lecons WHERE id = ?');
    $stmtCours->execute([$leconId]);
    $coursId = (int) $stmtCours->fetchColumn();
    if ($coursId <= 0) {
        reponseJson(['succes' => false, 'message' => 'Lecon introuvable.'], 404);
    }

    $stmtInscription = $pdo->prepare('
        INSERT IGNORE INTO inscriptions (etudiant_id, cours_id)
        VALUES (?, ?)
    ');
    $stmtInscription->execute([$utilisateur['id'], $coursId]);

    // 1. Recuperer les bonnes reponses
    $stmt = $pdo->prepare('
        SELECT e.id, o.code_option 
        FROM evaluations e 
        INNER JOIN options_evaluation o ON o.evaluation_id = e.id 
        WHERE e.lecon_id = ? AND o.est_correcte = 1
    ');
    $stmt->execute([$leconId]);
    $bonnesReponses = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    if (empty($bonnesReponses)) {
        reponseJson(['succes' => false, 'message' => 'Pas d\'evaluation pour cette lecon.'], 404);
    }

    // 2. Calculer le score
    $totalQuestions = count($bonnesReponses);
    $points = 0;
    foreach ($reponses as $evalId => $choix) {
        if (isset($bonnesReponses[$evalId]) && $bonnesReponses[$evalId] === $choix) {
            $points++;
        }
    }

    $note = ($totalQuestions > 0) ? ($points / $totalQuestions) * 100 : 0;

    // Conserver la meilleure note en cas de re-tentative
    $stmt = $pdo->prepare('
        INSERT INTO progressions (etudiant_id, lecon_id, note, statut) 
        VALUES (?, ?, ?, "terminee")
        ON DUPLICATE KEY UPDATE 
            note = GREATEST(note, VALUES(note)),
            statut = "terminee"
    ');
    $stmt->execute([$utilisateur['id'], $leconId, $note]);

    reponseJson([
        'succes' => true,
        'message' => 'Evaluation terminee !',
        'note' => round($note, 2)
    ]);
}

reponseJson(['succes' => false, 'message' => 'Action inconnue.'], 400);
