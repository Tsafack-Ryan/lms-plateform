<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();

if ($methode === 'GET') {
    $coursId = (int) ($_GET['cours_id'] ?? 0);
    $utilisateur = utilisateurConnecte();
    $modeEnseignant = ($utilisateur && $utilisateur['role'] === 'enseignant');

    if ($coursId > 0) {
        // Chapitres d'un cours specifique
        if ($modeEnseignant) {
            $stmt = $pdo->prepare('
                SELECT chap.*, COUNT(l.id) AS nb_lecons
                FROM chapitres chap
                INNER JOIN cours c ON c.id = chap.cours_id
                LEFT JOIN lecons l ON l.chapitre_id = chap.id
                WHERE chap.cours_id = ? AND c.enseignant_id = ?
                GROUP BY chap.id
                ORDER BY chap.ordre ASC
            ');
            $stmt->execute([$coursId, $utilisateur['id']]);
        } else {
            $stmt = $pdo->prepare('
                SELECT chap.*, COUNT(l.id) AS nb_lecons
                FROM chapitres chap
                LEFT JOIN lecons l ON l.chapitre_id = chap.id
                WHERE chap.cours_id = ?
                GROUP BY chap.id
                ORDER BY chap.ordre ASC
            ');
            $stmt->execute([$coursId]);
        }
        $chapitres = $stmt->fetchAll();

        // Pour chaque chapitre, recuperer les lecons
        foreach ($chapitres as &$chap) {
            $stmtLecons = $pdo->prepare('SELECT id, titre, type_contenu, ordre FROM lecons WHERE chapitre_id = ? ORDER BY ordre ASC');
            $stmtLecons->execute([$chap['id']]);
            $chap['lecons'] = $stmtLecons->fetchAll();
        }
        unset($chap);

        reponseJson(['succes' => true, 'chapitres' => $chapitres]);
    }

    if ($modeEnseignant) {
        $stmt = $pdo->prepare('
            SELECT chap.*
            FROM chapitres chap
            INNER JOIN cours c ON c.id = chap.cours_id
            WHERE c.enseignant_id = ?
            ORDER BY chap.cours_id ASC, chap.ordre ASC
        ');
        $stmt->execute([$utilisateur['id']]);
    } else {
        $stmt = $pdo->query('SELECT * FROM chapitres ORDER BY cours_id ASC, ordre ASC');
    }
    reponseJson(['succes' => true, 'chapitres' => $stmt->fetchAll()]);
}

$enseignant = exigerRole('enseignant');

if ($methode === 'DELETE') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    if ($id <= 0)
        reponseJson(['succes' => false, 'message' => 'ID invalide.'], 422);

    // Verifier que le chapitre appartient a un cours de l'enseignant
    $stmt = $pdo->prepare('
        DELETE chap FROM chapitres chap
        INNER JOIN cours c ON c.id = chap.cours_id
        WHERE chap.id = ? AND c.enseignant_id = ?
    ');
    $stmt->execute([$id, $enseignant['id']]);
    if ($stmt->rowCount() === 0)
        reponseJson(['succes' => false, 'message' => 'Chapitre introuvable ou non autorise.'], 403);

    reponseJson(['succes' => true, 'message' => 'Chapitre supprime.']);
}

if ($methode === 'PUT') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    $titre = trim($donnees['titre'] ?? '');
    $ordre = (int) ($donnees['ordre'] ?? 1);

    if ($id <= 0 || $titre === '')
        reponseJson(['succes' => false, 'message' => 'Titre obligatoire.'], 422);

    // Verifier autorisation d'abord pour distinguer "introuvable/non autorise" de "sans changement"
    $check = $pdo->prepare('
        SELECT chap.id FROM chapitres chap
        INNER JOIN cours c ON c.id = chap.cours_id
        WHERE chap.id = ? AND c.enseignant_id = ?
    ');
    $check->execute([$id, $enseignant['id']]);
    if (!$check->fetchColumn()) {
        reponseJson(['succes' => false, 'message' => 'Chapitre introuvable ou non autorise.'], 403);
    }

    $stmt = $pdo->prepare('
        UPDATE chapitres SET titre = ?, ordre = ? WHERE id = ?
    ');
    $stmt->execute([$titre, $ordre, $id]);

    reponseJson(['succes' => true, 'message' => 'Chapitre mis a jour.']);
}

// POST : creer un chapitre
$donnees = $_POST ?: lireJson();
$coursId = (int) ($donnees['cours_id'] ?? 0);
$titre = trim($donnees['titre'] ?? '');
$ordre = (int) ($donnees['ordre'] ?? 1);

if ($coursId <= 0 || $titre === '') {
    reponseJson(['succes' => false, 'message' => 'Cours et titre obligatoires.'], 422);
}

// Verifier que le cours appartient a l'enseignant
$verif = $pdo->prepare('SELECT id FROM cours WHERE id = ? AND enseignant_id = ?');
$verif->execute([$coursId, $enseignant['id']]);
if (!$verif->fetchColumn()) {
    reponseJson(['succes' => false, 'message' => 'Cours non autorise.'], 403);
}

$stmt = $pdo->prepare('INSERT INTO chapitres (cours_id, titre, ordre) VALUES (?, ?, ?)');
$stmt->execute([$coursId, $titre, $ordre]);

reponseJson(['succes' => true, 'message' => 'Chapitre cree.', 'id' => (int) $pdo->lastInsertId()]);