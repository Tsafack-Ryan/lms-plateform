<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();

if ($methode === 'GET') {
    $leconId = (int) ($_GET['lecon_id'] ?? 0);

    if ($leconId > 0) {
        $requete = $pdo->prepare('
            SELECT e.*, l.titre AS lecon_titre, c.titre AS cours_titre
            FROM evaluations e
            INNER JOIN lecons l ON l.id = e.lecon_id
            INNER JOIN cours c ON c.id = l.cours_id
            WHERE e.lecon_id = ?
            ORDER BY e.id ASC
        ');
        $requete->execute([$leconId]);
    } else {
        $utilisateur = utilisateurConnecte();
        if ($utilisateur && $utilisateur['role'] === 'enseignant') {
            $requete = $pdo->prepare(
                'SELECT e.*, l.titre AS lecon_titre, c.titre AS cours_titre
                 FROM evaluations e
                 INNER JOIN lecons l ON l.id = e.lecon_id
                 INNER JOIN cours c ON c.id = l.cours_id
                 WHERE c.enseignant_id = ?
                 ORDER BY c.titre ASC, l.ordre ASC, e.id ASC'
            );
            $requete->execute([$utilisateur['id']]);
        } else {
            $requete = $pdo->query(
                'SELECT e.*, l.titre AS lecon_titre, c.titre AS cours_titre
                 FROM evaluations e
                 INNER JOIN lecons l ON l.id = e.lecon_id
                 INNER JOIN cours c ON c.id = l.cours_id
                 ORDER BY c.titre ASC, l.ordre ASC, e.id ASC'
            );
        }
    }
    $evaluations = $requete->fetchAll();

    // Mélanger les questions pour éviter l'ordre prévisible
    shuffle($evaluations);

    foreach ($evaluations as &$evaluation) {
        $options = $pdo->prepare('SELECT id, code_option, libelle, est_correcte FROM options_evaluation WHERE evaluation_id = ? ORDER BY code_option ASC');
        $options->execute([$evaluation['id']]);
        $evaluation['options'] = $options->fetchAll();
    }

    reponseJson(['succes' => true, 'evaluations' => $evaluations]);
}

$enseignant = exigerRole('enseignant');

if ($methode === 'DELETE') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    if ($id <= 0) {
        reponseJson(['succes' => false, 'message' => 'ID invalide.'], 422);
    }

    $stmt = $pdo->prepare(
        'DELETE e FROM evaluations e
         INNER JOIN lecons l ON l.id = e.lecon_id
         INNER JOIN cours c ON c.id = l.cours_id
         WHERE e.id = ? AND c.enseignant_id = ?'
    );
    $stmt->execute([$id, $enseignant['id']]);
    if ($stmt->rowCount() === 0) {
        reponseJson(['succes' => false, 'message' => 'Evaluation introuvable ou non autorisee.'], 403);
    }

    reponseJson(['succes' => true, 'message' => 'Evaluation supprimee.']);
}

if ($methode === 'PUT') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    $leconId = (int) ($donnees['lecon_id'] ?? 0);
    $question = trim($donnees['question'] ?? '');
    $options = $donnees['options'] ?? [];
    $bonneReponse = strtoupper((string) ($donnees['bonne_reponse'] ?? ''));

    if ($id <= 0 || $leconId <= 0 || $question === '' || !is_array($options) || $bonneReponse === '') {
        reponseJson(['succes' => false, 'message' => 'Evaluation invalide.'], 422);
    }

    $optionsNettoyees = [];
    foreach ($options as $code => $libelle) {
        $codeNormalise = strtoupper((string) $code);
        $libelle = trim((string) $libelle);
        if ($libelle !== '') {
            $optionsNettoyees[$codeNormalise] = $libelle;
        }
    }

    if (count($optionsNettoyees) < 2 || !isset($optionsNettoyees[$bonneReponse])) {
        reponseJson(['succes' => false, 'message' => 'Ajoutez au moins deux options et choisissez une bonne reponse valide.'], 422);
    }

    $verification = $pdo->prepare(
        'SELECT e.id
         FROM evaluations e
         INNER JOIN lecons l ON l.id = e.lecon_id
         INNER JOIN cours c ON c.id = l.cours_id
         WHERE e.id = ? AND c.enseignant_id = ?'
    );
    $verification->execute([$id, $enseignant['id']]);
    if (!$verification->fetchColumn()) {
        reponseJson(['succes' => false, 'message' => 'Evaluation non autorisee.'], 403);
    }

    $verificationLecon = $pdo->prepare(
        'SELECT l.id
         FROM lecons l
         INNER JOIN cours c ON c.id = l.cours_id
         WHERE l.id = ? AND c.enseignant_id = ?'
    );
    $verificationLecon->execute([$leconId, $enseignant['id']]);
    if (!$verificationLecon->fetchColumn()) {
        reponseJson(['succes' => false, 'message' => 'Lecon non autorisee.'], 403);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare('UPDATE evaluations SET lecon_id = ?, question = ? WHERE id = ?');
        $stmt->execute([$leconId, $question, $id]);

        $stmt = $pdo->prepare('DELETE FROM options_evaluation WHERE evaluation_id = ?');
        $stmt->execute([$id]);

        $insertionOption = $pdo->prepare(
            'INSERT INTO options_evaluation (evaluation_id, code_option, libelle, est_correcte) VALUES (?, ?, ?, ?)'
        );

        foreach ($optionsNettoyees as $code => $libelle) {
            $insertionOption->execute([
                $id,
                $code,
                $libelle,
                $code === $bonneReponse ? 1 : 0,
            ]);
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        reponseJson(['succes' => false, 'message' => 'Erreur lors de la mise a jour: ' . $e->getMessage()], 500);
    }

    reponseJson(['succes' => true, 'message' => 'Evaluation mise a jour.']);
}

$donnees = $_POST ?: lireJson();

$leconId = (int) ($donnees['lecon_id'] ?? 0);
$question = trim($donnees['question'] ?? '');
$options = $donnees['options'] ?? [];
$bonneReponse = $donnees['bonne_reponse'] ?? '';

if ($leconId <= 0 || $question === '' || !is_array($options) || $bonneReponse === '') {
    reponseJson(['succes' => false, 'message' => 'Evaluation invalide.'], 422);
}

$codesOptions = array_map(fn($c) => strtoupper((string) $c), array_keys($options));
if (!in_array(strtoupper((string) $bonneReponse), $codesOptions, true)) {
    reponseJson(['succes' => false, 'message' => 'La bonne reponse doit correspondre a une option existante.'], 422);
}

$optionsNettoyees = [];
foreach ($options as $code => $libelle) {
    $codeNormalise = strtoupper((string) $code);
    $libelle = trim((string) $libelle);
    if ($libelle !== '') {
        $optionsNettoyees[$codeNormalise] = $libelle;
    }
}

if (count($optionsNettoyees) < 2 || !isset($optionsNettoyees[strtoupper((string) $bonneReponse)])) {
    reponseJson(['succes' => false, 'message' => 'Ajoutez au moins deux options et choisissez une bonne reponse valide.'], 422);
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

try {
    $pdo->beginTransaction();

    $requete = $pdo->prepare('INSERT INTO evaluations (lecon_id, question) VALUES (?, ?)');
    $requete->execute([$leconId, $question]);
    $evaluationId = (int) $pdo->lastInsertId();

    $insertionOption = $pdo->prepare(
        'INSERT INTO options_evaluation (evaluation_id, code_option, libelle, est_correcte) VALUES (?, ?, ?, ?)'
    );

    foreach ($optionsNettoyees as $code => $libelle) {
        $insertionOption->execute([
            $evaluationId,
            $code,
            $libelle,
            $code === strtoupper((string) $bonneReponse) ? 1 : 0,
        ]);
    }

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    reponseJson(['succes' => false, 'message' => 'Erreur lors de la creation: ' . $e->getMessage()], 500);
}

reponseJson(['succes' => true, 'message' => 'Evaluation ajoutee.', 'id' => $evaluationId]);