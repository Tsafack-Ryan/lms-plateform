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
         INNER JOIN chapitres chap ON chap.id = l.chapitre_id
         INNER JOIN cours c ON c.id = chap.cours_id
         WHERE c.enseignant_id = ?'
    );
    $stmtLecons->execute([$id]);

    $stmtEvaluations = $pdo->prepare(
        'SELECT COUNT(*)
         FROM evaluations e
         INNER JOIN lecons l ON l.id = e.lecon_id
         INNER JOIN chapitres chap ON chap.id = l.chapitre_id
         INNER JOIN cours c ON c.id = chap.cours_id
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

$stmtCours = $pdo->prepare(
    'SELECT c.id, c.titre, c.description, m.code AS module_code, m.titre AS module_titre,
            u.nom AS enseignant_nom,
            COUNT(DISTINCT l.id) AS total_lecons,
            COUNT(DISTINCT CASE WHEN p.statut = "terminee" THEN l.id END) AS lecons_terminees,
            COUNT(DISTINCT CASE WHEN p.note >= 80 THEN p.lecon_id END) AS quiz_reussis,
            COALESCE(MAX(p.updated_at), i.created_at) AS derniere_activite
     FROM inscriptions i
     INNER JOIN cours c ON c.id = i.cours_id
     INNER JOIN modules m ON m.id = c.module_id
     INNER JOIN utilisateurs u ON u.id = c.enseignant_id
     LEFT JOIN chapitres chap ON chap.cours_id = c.id
     LEFT JOIN lecons l ON l.chapitre_id = chap.id
     LEFT JOIN progressions p ON p.lecon_id = l.id AND p.etudiant_id = i.etudiant_id
     WHERE i.etudiant_id = ?
     GROUP BY c.id, c.titre, c.description, m.code, m.titre, u.nom, i.created_at
     ORDER BY derniere_activite DESC'
);
$stmtCours->execute([$id]);
$cours = $stmtCours->fetchAll();

$coursEnCours = [];
$coursTermines = [];
$totalLecons = 0;
$leconsTerminees = 0;
$quizReussis = 0;

foreach ($cours as &$coursItem) {
    $coursItem['total_lecons'] = (int) $coursItem['total_lecons'];
    $coursItem['lecons_terminees'] = (int) $coursItem['lecons_terminees'];
    $coursItem['quiz_reussis'] = (int) $coursItem['quiz_reussis'];
    $coursItem['pourcentage'] = $coursItem['total_lecons'] > 0
        ? (int) round(($coursItem['lecons_terminees'] / $coursItem['total_lecons']) * 100)
        : 0;

    $totalLecons += $coursItem['total_lecons'];
    $leconsTerminees += $coursItem['lecons_terminees'];
    $quizReussis += $coursItem['quiz_reussis'];

    if ($coursItem['pourcentage'] >= 100 && $coursItem['total_lecons'] > 0) {
        $coursTermines[] = $coursItem;
    } else {
        $coursEnCours[] = $coursItem;
    }
}
unset($coursItem);

$progression = $totalLecons > 0 ? (int) round(($leconsTerminees / $totalLecons) * 100) : 0;

reponseJson([
    'succes' => true,
    'role' => 'etudiant',
    'stats' => [
        'cours' => count($coursEnCours),
        'cours_total' => count($cours),
        'cours_termines' => count($coursTermines),
        'lecons' => $leconsTerminees,
        'lecons_total' => $totalLecons,
        'quiz' => $quizReussis,
        'progression' => $progression,
    ],
    'cours' => $cours,
    'cours_en_cours' => $coursEnCours,
    'cours_termines' => $coursTermines,
]);
