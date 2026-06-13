<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$utilisateur = exigerUtilisateur();
$donnees = $_POST ?: lireJson();

$action = $donnees['action'] ?? '';

if ($action === 'soumettre_evaluation') {
    $leconId = (int) ($donnees['lecon_id'] ?? 0);
    $reponsesBrutes = $donnees['reponses'] ?? '[]';
    
    // Si c'est une chaine (JSON envoyé via FormData), on décode
    $reponses = is_string($reponsesBrutes) ? json_decode($reponsesBrutes, true) : $reponsesBrutes;

    if ($leconId <= 0 || empty($reponses)) {
        reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);
    }

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

    // 3. Enregistrer la progression
    $stmt = $pdo->prepare('
        INSERT INTO progressions (etudiant_id, lecon_id, note, statut) 
        VALUES (?, ?, ?, "terminee")
        ON DUPLICATE KEY UPDATE note = VALUES(note), statut = "terminee"
    ');
    $stmt->execute([$utilisateur['id'], $leconId, $note]);

    reponseJson([
        'succes' => true, 
        'message' => 'Evaluation terminee !', 
        'note' => round($note, 2)
    ]);
}

reponseJson(['succes' => false, 'message' => 'Action inconnue.'], 400);
