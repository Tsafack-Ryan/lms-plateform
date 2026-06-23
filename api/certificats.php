<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$utilisateur = exigerUtilisateur();
$methode = methodeHttp();

if ($methode === 'GET') {
    if ($utilisateur['role'] === 'etudiant') {
        $stmt = $pdo->prepare('
            SELECT cert.id, cert.code_certificat, cert.date_obtention,
                   m.titre AS module_titre, m.code AS module_code,
                   c.titre AS cours_titre, c.id AS cours_id
            FROM certificats cert
            INNER JOIN cours c ON c.id = cert.cours_id
            INNER JOIN modules m ON m.id = c.module_id
            WHERE cert.etudiant_id = ?
            ORDER BY cert.date_obtention DESC
        ');
        $stmt->execute([$utilisateur['id']]);
        $certificats = $stmt->fetchAll();

        reponseJson(['succes' => true, 'certificats' => $certificats]);
    }

    reponseJson(['succes' => true, 'certificats' => []]);
}

// POST : soumettre examen final et créer un certificat si réussi
$donnees = $_POST ?: lireJson();
$action = $donnees['action'] ?? '';

if ($action === 'soumettre_examen') {
    $coursId = (int) ($donnees['cours_id'] ?? 0);
    $reponsesBrutes = $donnees['reponses'] ?? '[]';
    $reponses = is_string($reponsesBrutes) ? json_decode($reponsesBrutes, true) : $reponsesBrutes;

    if ($coursId <= 0 || empty($reponses)) {
        reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);
    }

    // Vérifier inscription
    $stmtInscription = $pdo->prepare('SELECT id FROM inscriptions WHERE etudiant_id = ? AND cours_id = ?');
    $stmtInscription->execute([$utilisateur['id'], $coursId]);
    if (!$stmtInscription->fetchColumn()) {
        reponseJson(['succes' => false, 'message' => 'Vous n\'etes pas inscrit a ce cours.'], 403);
    }

    // Vérifier que l'examen final est débloqué (toutes les leçons de tous les chapitres sont terminées)
    $stmtVerif = $pdo->prepare('
        SELECT COUNT(*) FROM chapitres chap
        WHERE chap.cours_id = ?
        AND EXISTS (
            SELECT 1 FROM lecons l WHERE l.chapitre_id = chap.id
            AND NOT EXISTS (
                SELECT 1 FROM progressions p WHERE p.lecon_id = l.id AND p.etudiant_id = ? AND p.statut = "terminee"
            )
        )
    ');
    $stmtVerif->execute([$coursId, $utilisateur['id']]);
    if ((int) $stmtVerif->fetchColumn() > 0) {
        reponseJson(['succes' => false, 'message' => 'Terminez toutes les lecons avant l\'examen final.'], 403);
    }

    // Vérifier que tous les quiz associés aux leçons sont réussis (note >= 80)
    $stmtQuiz = $pdo->prepare('
        SELECT COUNT(*) FROM lecons l
        INNER JOIN evaluations e ON e.lecon_id = l.id
        INNER JOIN chapitres chap ON chap.id = l.chapitre_id
        WHERE chap.cours_id = ?
        AND NOT EXISTS (
            SELECT 1 FROM progressions p 
            WHERE p.lecon_id = l.id AND p.etudiant_id = ? AND p.statut = "terminee" AND p.note >= 80
        )
    ');
    $stmtQuiz->execute([$coursId, $utilisateur['id']]);
    if ((int) $stmtQuiz->fetchColumn() > 0) {
        reponseJson(['succes' => false, 'message' => 'Reussissez tous les quiz avant l\'examen final.'], 403);
    }

    // Récupérer toutes les questions de l'examen final
    $stmtQuestions = $pdo->prepare('SELECT id FROM examens_finaux WHERE cours_id = ? ORDER BY id ASC');
    $stmtQuestions->execute([$coursId]);
    $toutesQuestions = $stmtQuestions->fetchAll(PDO::FETCH_COLUMN);
    $totalQuestions = count($toutesQuestions);

    if ($totalQuestions === 0) {
        reponseJson(['succes' => false, 'message' => 'Aucune question d\'examen pour ce cours.'], 404);
    }

    // Récupérer les bonnes réponses
    $stmtBonnesReponses = $pdo->prepare('
        SELECT ef.id, oef.code_option FROM examens_finaux ef
        INNER JOIN options_examen_final oef ON oef.examen_id = ef.id
        WHERE ef.cours_id = ? AND oef.est_correcte = 1
    ');
    $stmtBonnesReponses->execute([$coursId]);
    $bonnesReponses = $stmtBonnesReponses->fetchAll(PDO::FETCH_KEY_PAIR);

    // Calculer le score sur TOUTES les questions (même celles non répondus = 0)
    $points = 0;
    foreach ($toutesQuestions as $qId) {
        if (isset($reponses[$qId]) && isset($bonnesReponses[$qId]) && $bonnesReponses[$qId] === $reponses[$qId]) {
            $points++;
        }
    }

    $note = ($totalQuestions > 0) ? ($points / $totalQuestions) * 100 : 0;
    $reussi = $note >= 80;
    $codeCertificat = '';

    if ($reussi) {
        // Vérifier si un certificat existe déjà pour ce cours
        $stmtExistant = $pdo->prepare('SELECT code_certificat FROM certificats WHERE etudiant_id = ? AND cours_id = ?');
        $stmtExistant->execute([$utilisateur['id'], $coursId]);
        $existant = $stmtExistant->fetchColumn();

        if ($existant) {
            $codeCertificat = $existant;
        } else {
            $codeCertificat = 'CERT-' . strtoupper(bin2hex(random_bytes(8)));
            $stmt = $pdo->prepare('INSERT INTO certificats (etudiant_id, cours_id, code_certificat) VALUES (?, ?, ?)');
            $stmt->execute([$utilisateur['id'], $coursId, $codeCertificat]);
        }
    }

    reponseJson([
        'succes' => true,
        'message' => $reussi ? 'Felicitations ! Examen final reussi !' : 'Score insuffisant. Vous devez obtenir au moins 80%.',
        'note' => round($note, 2),
        'reussi' => $reussi,
        'code_certificat' => $codeCertificat,
    ]);
}

reponseJson(['succes' => false, 'message' => 'Action inconnue.'], 400);