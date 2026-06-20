<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();

if ($methode === 'GET') {
    $utilisateur = utilisateurConnecte();
    if ($utilisateur && $utilisateur['role'] === 'enseignant') {
        $requete = $pdo->prepare(
            'SELECT c.*, m.titre AS module_titre, m.code AS module_code
             FROM cours c
             INNER JOIN modules m ON m.id = c.module_id
             WHERE c.enseignant_id = ?
             ORDER BY c.id DESC'
        );
        $requete->execute([$utilisateur['id']]);
    } else {
        $requete = $pdo->query(
            'SELECT c.*, m.titre AS module_titre, m.code AS module_code, u.nom AS enseignant_nom
             FROM cours c
             INNER JOIN modules m ON m.id = c.module_id
             INNER JOIN utilisateurs u ON u.id = c.enseignant_id
             ORDER BY c.id DESC'
        );
    }
    reponseJson(['succes' => true, 'cours' => $requete->fetchAll()]);
}

$enseignant = exigerRole('enseignant');

// DELETE
if ($methode === 'DELETE') {
    $donnees = lireJson();
    $id = (int)($donnees['id'] ?? 0);
    if ($id <= 0) reponseJson(['succes' => false, 'message' => 'ID invalide.'], 422);
    $stmt = $pdo->prepare('DELETE FROM cours WHERE id = ? AND enseignant_id = ?');
    $stmt->execute([$id, $enseignant['id']]);
    if ($stmt->rowCount() === 0) reponseJson(['succes' => false, 'message' => 'Cours introuvable ou non autorise.'], 403);
    reponseJson(['succes' => true, 'message' => 'Cours supprime.']);
}

// PUT (modifier)
if ($methode === 'PUT') {
    $donnees = lireJson();
    $id = (int)($donnees['id'] ?? 0);
    $titre = trim($donnees['titre'] ?? '');
    $description = trim($donnees['description'] ?? '');
    $moduleCode = trim($donnees['module'] ?? '');
    if ($id <= 0 || $titre === '' || $description === '' || $moduleCode === '') {
        reponseJson(['succes' => false, 'message' => 'Tous les champs sont obligatoires.'], 422);
    }
    $module = $pdo->prepare('SELECT id FROM modules WHERE code = ? LIMIT 1');
    $module->execute([$moduleCode]);
    $moduleId = $module->fetchColumn();
    if (!$moduleId) reponseJson(['succes' => false, 'message' => 'Module introuvable.'], 422);
    $stmt = $pdo->prepare('UPDATE cours SET titre = ?, description = ?, module_id = ? WHERE id = ? AND enseignant_id = ?');
    $stmt->execute([$titre, $description, (int)$moduleId, $id, $enseignant['id']]);
    if ($stmt->rowCount() === 0) {
        // Verifier si le cours existe et appartient a cet enseignant
        $check = $pdo->prepare('SELECT id FROM cours WHERE id = ? AND enseignant_id = ?');
        $check->execute([$id, $enseignant['id']]);
        if (!$check->fetchColumn()) {
            reponseJson(['succes' => false, 'message' => 'Cours introuvable ou non autorise.'], 403);
        }
    }
    reponseJson(['succes' => true, 'message' => 'Cours mis a jour.']);
}

// POST (creer)
$donnees = $_POST ?: lireJson();
$titre = trim($donnees['titre'] ?? '');
$moduleCode = trim($donnees['module'] ?? '');
$description = trim($donnees['description'] ?? '');
if ($titre === '' || $moduleCode === '' || $description === '') {
    reponseJson(['succes' => false, 'message' => 'Tous les champs du cours sont obligatoires.'], 422);
}
$module = $pdo->prepare('SELECT id FROM modules WHERE code = ? LIMIT 1');
$module->execute([$moduleCode]);
$moduleId = $module->fetchColumn();
if (!$moduleId) reponseJson(['succes' => false, 'message' => 'Module introuvable.'], 422);
$requete = $pdo->prepare('INSERT INTO cours (module_id, enseignant_id, titre, description) VALUES (?, ?, ?, ?)');
$requete->execute([(int)$moduleId, $enseignant['id'], $titre, $description]);
reponseJson(['succes' => true, 'message' => 'Cours enregistre.', 'id' => (int)$pdo->lastInsertId()]);
