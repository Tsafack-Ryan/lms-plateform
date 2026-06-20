<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();

if ($methode === 'GET') {
    $requete = $pdo->query('SELECT * FROM modules ORDER BY titre ASC');
    reponseJson(['succes' => true, 'modules' => $requete->fetchAll()]);
}

$utilisateur = exigerUtilisateur();

// Seul le promoteur peut gerer les modules
if ($utilisateur['role'] !== 'promoteur') {
    reponseJson(['succes' => false, 'message' => 'Seul le promoteur peut gerer les modules.'], 403);
}

// DELETE module
if ($methode === 'DELETE') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    if ($id <= 0) {
        reponseJson(['succes' => false, 'message' => 'ID invalide.'], 422);
    }

    $stmt = $pdo->prepare('DELETE FROM modules WHERE id = ?');
    $stmt->execute([$id]);
    if ($stmt->rowCount() === 0) {
        reponseJson(['succes' => false, 'message' => 'Module introuvable.'], 404);
    }

    reponseJson(['succes' => true, 'message' => 'Module supprime.']);
}

// PUT module (modifier)
if ($methode === 'PUT') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    $code = trim($donnees['code'] ?? '');
    $titre = trim($donnees['titre'] ?? '');
    $description = trim($donnees['description'] ?? '');

    if ($id <= 0 || $code === '' || $titre === '') {
        reponseJson(['succes' => false, 'message' => 'Code et titre obligatoires.'], 422);
    }

    $stmt = $pdo->prepare('UPDATE modules SET code = ?, titre = ?, description = ? WHERE id = ?');
    $stmt->execute([$code, $titre, $description, $id]);
    if ($stmt->rowCount() === 0) {
        // Verifier si le module existe (rowCount=0 peut signifier "rien de change")
        $check = $pdo->prepare('SELECT id FROM modules WHERE id = ?');
        $check->execute([$id]);
        if (!$check->fetchColumn()) {
            reponseJson(['succes' => false, 'message' => 'Module introuvable.'], 404);
        }
    }

    reponseJson(['succes' => true, 'message' => 'Module mis a jour.']);
}

$donnees = $_POST ?: lireJson();
$code = trim($donnees['code'] ?? '');
$titre = trim($donnees['titre'] ?? '');
$description = trim($donnees['description'] ?? '');

if ($code === '' || $titre === '') {
    reponseJson(['succes' => false, 'message' => 'Code et titre obligatoires.'], 422);
}

$requete = $pdo->prepare('INSERT INTO modules (code, titre, description) VALUES (?, ?, ?)');
$requete->execute([$code, $titre, $description]);

reponseJson(['succes' => true, 'message' => 'Module cree.']);