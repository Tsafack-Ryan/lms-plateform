<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();

if ($methode === 'GET') {
    $coursId = (int) ($_GET['cours_id'] ?? 0);
    $leconId = (int) ($_GET['id'] ?? 0);

    if ($leconId > 0) {
        $requete = $pdo->prepare('SELECT * FROM lecons WHERE id = ?');
        $requete->execute([$leconId]);
        $lecon = $requete->fetch();

        if (!$lecon) {
            reponseJson(['succes' => false, 'message' => 'Lecon introuvable.'], 404);
        }

        reponseJson(['succes' => true, 'lecon' => $lecon]);
    }

    if ($coursId > 0) {
        $requete = $pdo->prepare('SELECT * FROM lecons WHERE cours_id = ? ORDER BY ordre ASC');
        $requete->execute([$coursId]);
    } else {
        $utilisateur = utilisateurConnecte();
        if ($utilisateur && $utilisateur['role'] === 'enseignant') {
            $requete = $pdo->prepare(
                'SELECT l.*, c.titre AS cours_titre
                 FROM lecons l
                 INNER JOIN cours c ON c.id = l.cours_id
                 WHERE c.enseignant_id = ?
                 ORDER BY c.titre ASC, l.ordre ASC'
            );
            $requete->execute([$utilisateur['id']]);
        } else {
            $requete = $pdo->query(
                'SELECT l.*, c.titre AS cours_titre
                 FROM lecons l
                 INNER JOIN cours c ON c.id = l.cours_id
                 ORDER BY c.titre ASC, l.ordre ASC'
            );
        }
    }

    reponseJson(['succes' => true, 'lecons' => $requete->fetchAll()]);
}

$enseignant = exigerRole('enseignant');

if ($methode === 'DELETE') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    if ($id <= 0) {
        reponseJson(['succes' => false, 'message' => 'ID invalide.'], 422);
    }

    $stmt = $pdo->prepare(
        'DELETE l FROM lecons l
         INNER JOIN cours c ON c.id = l.cours_id
         WHERE l.id = ? AND c.enseignant_id = ?'
    );
    $stmt->execute([$id, $enseignant['id']]);
    if ($stmt->rowCount() === 0) {
        reponseJson(['succes' => false, 'message' => 'Lecon introuvable ou non autorisee.'], 403);
    }

    reponseJson(['succes' => true, 'message' => 'Lecon supprimee.']);
}

if ($methode === 'PUT') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    $coursId = (int) ($donnees['cours_id'] ?? 0);
    $titre = trim($donnees['titre'] ?? '');
    $typeContenu = trim($donnees['type_contenu'] ?? '');
    $ordre = (int) ($donnees['ordre'] ?? 1);

    if ($id <= 0 || $coursId <= 0 || $titre === '' || !in_array($typeContenu, ['pdf', 'video'], true) || $ordre <= 0) {
        reponseJson(['succes' => false, 'message' => 'Informations de lecon invalides.'], 422);
    }

    $verification = $pdo->prepare('SELECT id FROM cours WHERE id = ? AND enseignant_id = ?');
    $verification->execute([$coursId, $enseignant['id']]);
    if (!$verification->fetchColumn()) {
        reponseJson(['succes' => false, 'message' => 'Cours non autorise.'], 403);
    }

    $autorisation = $pdo->prepare(
        'SELECT l.id
         FROM lecons l
         INNER JOIN cours c ON c.id = l.cours_id
         WHERE l.id = ? AND c.enseignant_id = ?'
    );
    $autorisation->execute([$id, $enseignant['id']]);
    if (!$autorisation->fetchColumn()) {
        reponseJson(['succes' => false, 'message' => 'Lecon introuvable ou non autorisee.'], 403);
    }

    $stmt = $pdo->prepare(
        'UPDATE lecons l
         INNER JOIN cours c ON c.id = l.cours_id
         SET l.cours_id = ?, l.titre = ?, l.type_contenu = ?, l.ordre = ?
         WHERE l.id = ? AND c.enseignant_id = ?'
    );
    $stmt->execute([$coursId, $titre, $typeContenu, $ordre, $id, $enseignant['id']]);

    reponseJson(['succes' => true, 'message' => 'Lecon mise a jour.']);
}

$coursId = (int) ($_POST['cours_id'] ?? 0);
$titre = trim($_POST['titre'] ?? '');
$typeContenu = trim($_POST['type_contenu'] ?? '');
$ordre = (int) ($_POST['ordre'] ?? 1);

if ($coursId <= 0 || $titre === '' || !in_array($typeContenu, ['pdf', 'video'], true)) {
    reponseJson(['succes' => false, 'message' => 'Informations de lecon invalides.'], 422);
}

$verification = $pdo->prepare('SELECT id FROM cours WHERE id = ? AND enseignant_id = ?');
$verification->execute([$coursId, $enseignant['id']]);
if (!$verification->fetchColumn()) {
    reponseJson(['succes' => false, 'message' => 'Cours non autorise.'], 403);
}
$cheminFichier = '';
if (!empty($_FILES['fichier']['name'])) {
    $dossier = '../uploads/lecons/';
    if (!is_dir($dossier))
        mkdir($dossier, 0777, true);

    $nomFichier = time() . '_' . $_FILES['fichier']['name'];
    if (move_uploaded_file($_FILES['fichier']['tmp_name'], $dossier . $nomFichier)) {
        $cheminFichier = 'uploads/lecons/' . $nomFichier;
    }
}

$stmt = $pdo->prepare('INSERT INTO lecons (cours_id, titre, type_contenu, chemin_fichier, ordre) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$coursId, $titre, $typeContenu, $cheminFichier, $ordre]);

reponseJson(['succes' => true, 'message' => 'Lecon ajoutee.']);
