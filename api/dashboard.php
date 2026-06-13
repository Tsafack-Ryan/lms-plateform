<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$utilisateur = exigerUtilisateur();

if ($utilisateur['role'] === 'enseignant') {
    $id = $utilisateur['id'];

    $stmtCours = $pdo->prepare('SELECT COUNT(*) FROM cours WHERE enseignant_id = ?');
    $stmtCours->execute([$id]);

    $stmtLecons = $pdo->prepare(
        'SELECT COUNT(*)
         FROM lecons l
         INNER JOIN cours c ON c.id = l.cours_id
         WHERE c.enseignant_id = ?'
    );
    $stmtLecons->execute([$id]);

    $stmtEvaluations = $pdo->prepare(
        'SELECT COUNT(*)
         FROM evaluations e
         INNER JOIN lecons l ON l.id = e.lecon_id
         INNER JOIN cours c ON c.id = l.cours_id
         WHERE c.enseignant_id = ?'
    );
    $stmtEvaluations->execute([$id]);

    reponseJson([
        'succes' => true,
        'role' => 'enseignant',
        'stats' => [
            'cours' => (int) $stmtCours->fetchColumn(),
            'lecons' => (int) $stmtLecons->fetchColumn(),
            'evaluations' => (int) $stmtEvaluations->fetchColumn(),
        ],
    ]);
}

$id = $utilisateur['id'];

$stmtCours = $pdo->prepare('SELECT COUNT(*) FROM inscriptions WHERE etudiant_id = ?');
$stmtCours->execute([$id]);

$stmtLecons = $pdo->prepare(
    'SELECT COUNT(*) FROM progressions WHERE etudiant_id = ? AND statut = "terminee"'
);
$stmtLecons->execute([$id]);

$stmtQuiz = $pdo->prepare(
    'SELECT COUNT(*) FROM progressions WHERE etudiant_id = ? AND note >= 80'
);
$stmtQuiz->execute([$id]);

$stmtProgression = $pdo->prepare(
    'SELECT COALESCE(ROUND(AVG(note)), 0) FROM progressions WHERE etudiant_id = ?'
);
$stmtProgression->execute([$id]);

reponseJson([
    'succes' => true,
    'role' => 'etudiant',
    'stats' => [
        'cours' => (int) $stmtCours->fetchColumn(),
        'lecons' => (int) $stmtLecons->fetchColumn(),
        'quiz' => (int) $stmtQuiz->fetchColumn(),
        'progression' => (int) $stmtProgression->fetchColumn(),
    ],
]);
