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

// Seul le promoteur (ou un admin) peut creer des modules
if ($utilisateur['role'] !== 'promoteur') {
    reponseJson(['succes' => false, 'message' => 'Seul le promoteur peut gerer les modules.'], 403);
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
