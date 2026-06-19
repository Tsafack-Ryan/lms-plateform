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
    $_SESSION = [];
    session_destroy();
    reponseJson(['succes' => true]);
}

$donnees = $_POST ?: lireJson();

if ($action === 'register') {
    $nom = trim($donnees['nom'] ?? '');
    $email = trim($donnees['email'] ?? '');
    $motDePasse = $donnees['mot_de_passe'] ?? '';
    // Sécurité : forcer les rôles autorisés, empêcher la création de compte promoteur
    $role = $donnees['role'] ?? 'etudiant';
    $rolesAutorises = ['etudiant', 'enseignant'];
    if (!in_array($role, $rolesAutorises, true)) {
        $role = 'etudiant';
    }

    if ($nom === '' || $email === '' || $motDePasse === '') {
        reponseJson(['succes' => false, 'message' => 'Remplissez tous les champs.'], 422);
    }

    // Validation du format email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        reponseJson(['succes' => false, 'message' => 'Adresse email invalide.'], 422);
    }

    // Vérifier si l'email existe déjà
    $verif = $pdo->prepare('SELECT id FROM utilisateurs WHERE email = ? LIMIT 1');
    $verif->execute([$email]);
    if ($verif->fetchColumn()) {
        reponseJson(['succes' => false, 'message' => 'Cet email est deja utilise.'], 409);
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

    // Sécurité : régénérer l'ID de session pour éviter le session fixation
    session_regenerate_id(true);

    $_SESSION['utilisateur'] = [
        'id' => (int) $utilisateur['id'],
        'nom' => $utilisateur['nom'],
        'email' => $utilisateur['email'],
        'role' => $utilisateur['role'],
    ];

    reponseJson(['succes' => true, 'utilisateur' => $_SESSION['utilisateur']]);
}

reponseJson(['succes' => false, 'message' => 'Action inconnue.'], 400);