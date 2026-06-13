<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';

$pdo = obtenirConnexion();

$utilisateurs = [
    [
        'nom' => 'enseignant',
        'email' => 'enseignant@lms.local',
        'mot_de_passe' => 'enseignant123',
        'role' => 'enseignant',
    ],
    [
        'nom' => 'etudiant',
        'email' => 'etudiant@lms.local',
        'mot_de_passe' => 'etudiant123',
        'role' => 'etudiant',
    ],
    [
        'nom' => 'promoteur',
        'email' => 'promoteur@lms.local',
        'mot_de_passe' => 'promoteur123',
        'role' => 'promoteur',
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
echo "- enseignant / enseignant123\n";
echo "- etudiant / etudiant123\n";
