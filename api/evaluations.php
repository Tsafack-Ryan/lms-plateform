<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();

if ($methode === 'GET') {
    $leconId = (int) ($_GET['lecon_id'] ?? 0);

    $requete = $pdo->prepare('SELECT * FROM evaluations WHERE lecon_id = ? ORDER BY id ASC');
    $requete->execute([$leconId]);
    $evaluations = $requete->fetchAll();

    foreach ($evaluations as &$evaluation) {
        $options = $pdo->prepare('SELECT id, libelle, est_correcte FROM options_evaluation WHERE evaluation_id = ?');
        $options->execute([$evaluation['id']]);
        $evaluation['options'] = $options->fetchAll();
    }

    reponseJson(['succes' => true, 'evaluations' => $evaluations]);
}

$enseignant = exigerRole('enseignant');
$donnees = $_POST ?: lireJson();

$leconId = (int) ($donnees['lecon_id'] ?? 0);
$question = trim($donnees['question'] ?? '');
$options = $donnees['options'] ?? [];
$bonneReponse = $donnees['bonne_reponse'] ?? '';

if ($leconId <= 0 || $question === '' || !is_array($options) || $bonneReponse === '') {
    reponseJson(['succes' => false, 'message' => 'Evaluation invalide.'], 422);
}

$verification = $pdo->prepare(
    'SELECT l.id
     FROM lecons l
     INNER JOIN cours c ON c.id = l.cours_id
     WHERE l.id = ? AND c.enseignant_id = ?'
);
$verification->execute([$leconId, $enseignant['id']]);
if (!$verification->fetchColumn()) {
    reponseJson(['succes' => false, 'message' => 'Lecon non autorisee.'], 403);
}

$pdo->beginTransaction();

$requete = $pdo->prepare('INSERT INTO evaluations (lecon_id, question) VALUES (?, ?)');
$requete->execute([$leconId, $question]);
$evaluationId = (int) $pdo->lastInsertId();

$insertionOption = $pdo->prepare(
    'INSERT INTO options_evaluation (evaluation_id, code_option, libelle, est_correcte) VALUES (?, ?, ?, ?)'
);

foreach ($options as $code => $libelle) {
    $libelle = trim((string) $libelle);
    if ($libelle === '') {
        continue;
    }

    $insertionOption->execute([
        $evaluationId,
        strtoupper((string) $code),
        $libelle,
        strtoupper((string) $code) === strtoupper((string) $bonneReponse) ? 1 : 0,
    ]);
}

$pdo->commit();

reponseJson(['succes' => true, 'message' => 'Evaluation ajoutee.', 'id' => $evaluationId]);
