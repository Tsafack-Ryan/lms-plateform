<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

$pdo = obtenirConnexion();

$utilisateurs = [
    [
        'nom' => 'Ryan Tsafack',
        'email' => 'ryan@staracademy.com',
        'mot_de_passe' => 'admin123',
        'role' => 'promoteur',
    ],
    [
        'nom' => 'Professeur Alpha',
        'email' => 'alpha@staracademy.com',
        'mot_de_passe' => 'pass123',
        'role' => 'enseignant',
    ],
    [
        'nom' => 'Etudiant Test',
        'email' => 'etudiant@staracademy.com',
        'mot_de_passe' => 'pass123',
        'role' => 'etudiant',
    ],
];

$requete = $pdo->prepare(
    'INSERT INTO utilisateurs (nom, email, mot_de_passe, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
        nom = VALUES(nom), 
        role = VALUES(role), 
        mot_de_passe = VALUES(mot_de_passe)'
);

foreach ($utilisateurs as $utilisateur) {
    $requete->execute([
        $utilisateur['nom'],
        $utilisateur['email'],
        password_hash($utilisateur['mot_de_passe'], PASSWORD_DEFAULT),
        $utilisateur['role'],
    ]);
}

echo "Utilisateurs de test crees:\n";
echo "- Promoteur : ryan@staracademy.com / admin123\n";
echo "- Enseignant : alpha@staracademy.com / pass123\n";
echo "- Etudiant : etudiant@staracademy.com / pass123\n";