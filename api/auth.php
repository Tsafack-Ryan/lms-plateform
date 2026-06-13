<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($methode === 'GET') {
    reponseJson([
        'succes' => true,
        'utilisateur' => utilisateurConnecte(),
    ]);
}

if ($action === 'logout') {
    session_destroy();
    reponseJson(['succes' => true]);
}

$donnees = $_POST ?: lireJson();

if ($action === 'register') {
    $nom = trim($donnees['nom'] ?? '');
    $email = trim($donnees['email'] ?? '');
    $motDePasse = $donnees['mot_de_passe'] ?? '';
    $role = $donnees['role'] ?? 'etudiant';

    if ($nom === '' || $email === '' || $motDePasse === '') {
        reponseJson(['succes' => false, 'message' => 'Remplissez tous les champs.'], 422);
    }

    $requete = $pdo->prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)');
    $requete->execute([$nom, $email, password_hash($motDePasse, PASSWORD_DEFAULT), $role]);

    reponseJson(['succes' => true, 'message' => 'Compte cree !']);
}

if ($action === 'login') {
    $nom = trim($donnees['nom'] ?? '');
    $motDePasse = $donnees['mot_de_passe'] ?? '';
    $role = $donnees['role'] ?? 'etudiant';

    $requete = $pdo->prepare('SELECT * FROM utilisateurs WHERE nom = ? AND role = ? LIMIT 1');
    $requete->execute([$nom, $role]);
    $utilisateur = $requete->fetch();

    if (!$utilisateur) {
        reponseJson(['succes' => false, 'message' => 'Utilisateur introuvable pour ce role.'], 401);
    }

    if (!password_verify($motDePasse, $utilisateur['mot_de_passe'])) {
        reponseJson(['succes' => false, 'message' => 'Mot de passe incorrect.'], 401);
    }

    $_SESSION['utilisateur'] = [
        'id' => (int) $utilisateur['id'],
        'nom' => $utilisateur['nom'],
        'email' => $utilisateur['email'],
        'role' => $utilisateur['role'],
    ];

    reponseJson(['succes' => true, 'utilisateur' => $_SESSION['utilisateur']]);
}

reponseJson(['succes' => false, 'message' => 'Action inconnue.'], 400);
