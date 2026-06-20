<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();

const MIMES_AUTORISEES = [
    'application/pdf' => 'pdf',
    'video/mp4' => 'mp4',
    'video/webm' => 'webm',
    'video/ogg' => 'ogg',
];

if ($methode === 'GET') {
    $chapitreId = (int) ($_GET['chapitre_id'] ?? 0);
    $leconId = (int) ($_GET['id'] ?? 0);

    if ($leconId > 0) {
        $requete = $pdo->prepare('SELECT l.*, chap.titre AS chapitre_titre, chap.cours_id, c.titre AS cours_titre
            FROM lecons l
            INNER JOIN chapitres chap ON chap.id = l.chapitre_id
            INNER JOIN cours c ON c.id = chap.cours_id
            WHERE l.id = ?');
        $requete->execute([$leconId]);
        $lecon = $requete->fetch();

        if (!$lecon)
            reponseJson(['succes' => false, 'message' => 'Lecon introuvable.'], 404);

        reponseJson(['succes' => true, 'lecon' => $lecon]);
    }

    if ($chapitreId > 0) {
        $requete = $pdo->prepare('SELECT * FROM lecons WHERE chapitre_id = ? ORDER BY ordre ASC');
        $requete->execute([$chapitreId]);
    } else {
        $utilisateur = utilisateurConnecte();
        $coursId = (int) ($_GET['cours_id'] ?? 0);
        if ($utilisateur && $utilisateur['role'] === 'enseignant') {
            if ($coursId > 0) {
                $requete = $pdo->prepare(
                    'SELECT l.*, chap.titre AS chapitre_titre, chap.cours_id, c.titre AS cours_titre
                     FROM lecons l
                     INNER JOIN chapitres chap ON chap.id = l.chapitre_id
                     INNER JOIN cours c ON c.id = chap.cours_id
                     WHERE c.enseignant_id = ? AND c.id = ?
                     ORDER BY c.titre ASC, chap.ordre ASC, l.ordre ASC'
                );
                $requete->execute([$utilisateur['id'], $coursId]);
            } else {
                $requete = $pdo->prepare(
                    'SELECT l.*, chap.titre AS chapitre_titre, chap.cours_id, c.titre AS cours_titre
                     FROM lecons l
                     INNER JOIN chapitres chap ON chap.id = l.chapitre_id
                     INNER JOIN cours c ON c.id = chap.cours_id
                     WHERE c.enseignant_id = ?
                     ORDER BY c.titre ASC, chap.ordre ASC, l.ordre ASC'
                );
                $requete->execute([$utilisateur['id']]);
            }
        } else {
            if ($coursId > 0) {
                $requete = $pdo->prepare(
                    'SELECT l.*, chap.titre AS chapitre_titre, chap.cours_id, c.titre AS cours_titre
                     FROM lecons l
                     INNER JOIN chapitres chap ON chap.id = l.chapitre_id
                     INNER JOIN cours c ON c.id = chap.cours_id
                     WHERE c.id = ?
                     ORDER BY c.titre ASC, chap.ordre ASC, l.ordre ASC'
                );
                $requete->execute([$coursId]);
            } else {
                $requete = $pdo->query(
                    'SELECT l.*, chap.titre AS chapitre_titre, chap.cours_id, c.titre AS cours_titre
                     FROM lecons l
                     INNER JOIN chapitres chap ON chap.id = l.chapitre_id
                     INNER JOIN cours c ON c.id = chap.cours_id
                     ORDER BY c.titre ASC, chap.ordre ASC, l.ordre ASC'
                );
            }
        }
    }

    reponseJson(['succes' => true, 'lecons' => $requete->fetchAll()]);
}

$enseignant = exigerRole('enseignant');

if ($methode === 'DELETE') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    if ($id <= 0)
        reponseJson(['succes' => false, 'message' => 'ID invalide.'], 422);

    $stmtFichier = $pdo->prepare('SELECT chemin_fichier FROM lecons WHERE id = ?');
    $stmtFichier->execute([$id]);
    $cheminFichier = $stmtFichier->fetchColumn();

    $stmt = $pdo->prepare(
        'DELETE l FROM lecons l
         INNER JOIN chapitres chap ON chap.id = l.chapitre_id
         INNER JOIN cours c ON c.id = chap.cours_id
         WHERE l.id = ? AND c.enseignant_id = ?'
    );
    $stmt->execute([$id, $enseignant['id']]);
    if ($stmt->rowCount() === 0)
        reponseJson(['succes' => false, 'message' => 'Lecon introuvable ou non autorisee.'], 403);

    if ($cheminFichier) {
        $cheminAbsolu = __DIR__ . '/../' . $cheminFichier;
        if (file_exists($cheminAbsolu))
            unlink($cheminAbsolu);
    }

    reponseJson(['succes' => true, 'message' => 'Lecon supprimee.']);
}

if ($methode === 'PUT') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    $chapitreId = (int) ($donnees['chapitre_id'] ?? 0);
    $titre = trim($donnees['titre'] ?? '');
    $typeContenu = trim($donnees['type_contenu'] ?? '');
    $ordre = (int) ($donnees['ordre'] ?? 1);

    if ($id <= 0 || $chapitreId <= 0 || $titre === '' || !in_array($typeContenu, ['pdf', 'video'], true) || $ordre <= 0) {
        reponseJson(['succes' => false, 'message' => 'Informations de lecon invalides.'], 422);
    }

    $verif = $pdo->prepare('
        SELECT chap.id FROM chapitres chap
        INNER JOIN cours c ON c.id = chap.cours_id
        WHERE chap.id = ? AND c.enseignant_id = ?
    ');
    $verif->execute([$chapitreId, $enseignant['id']]);
    if (!$verif->fetchColumn())
        reponseJson(['succes' => false, 'message' => 'Chapitre non autorise.'], 403);

    $autorisation = $pdo->prepare(
        'SELECT l.id FROM lecons l
         INNER JOIN chapitres chap ON chap.id = l.chapitre_id
         INNER JOIN cours c ON c.id = chap.cours_id
         WHERE l.id = ? AND c.enseignant_id = ?'
    );
    $autorisation->execute([$id, $enseignant['id']]);
    if (!$autorisation->fetchColumn())
        reponseJson(['succes' => false, 'message' => 'Lecon introuvable ou non autorisee.'], 403);

    $stmt = $pdo->prepare('UPDATE lecons SET chapitre_id = ?, titre = ?, type_contenu = ?, ordre = ? WHERE id = ?');
    $stmt->execute([$chapitreId, $titre, $typeContenu, $ordre, $id]);

    reponseJson(['succes' => true, 'message' => 'Lecon mise a jour.']);
}

// POST : creer une lecon
$chapitreId = (int) ($_POST['chapitre_id'] ?? 0);
$titre = trim($_POST['titre'] ?? '');
$typeContenu = trim($_POST['type_contenu'] ?? '');
$ordre = (int) ($_POST['ordre'] ?? 1);

if ($chapitreId <= 0 || $titre === '' || !in_array($typeContenu, ['pdf', 'video'], true)) {
    reponseJson(['succes' => false, 'message' => 'Informations de lecon invalides.'], 422);
}

$verif = $pdo->prepare('
    SELECT chap.id FROM chapitres chap
    INNER JOIN cours c ON c.id = chap.cours_id
    WHERE chap.id = ? AND c.enseignant_id = ?
');
$verif->execute([$chapitreId, $enseignant['id']]);
if (!$verif->fetchColumn())
    reponseJson(['succes' => false, 'message' => 'Chapitre non autorise.'], 403);

$cheminFichier = '';
if (!empty($_FILES['fichier']['name'])) {
    if ($_FILES['fichier']['size'] > 50 * 1024 * 1024) {
        reponseJson(['succes' => false, 'message' => 'Le fichier est trop volumineux (max 50 Mo).'], 413);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeReel = finfo_file($finfo, $_FILES['fichier']['tmp_name']);
    finfo_close($finfo);

    if (!isset(MIMES_AUTORISEES[$mimeReel])) {
        reponseJson(['succes' => false, 'message' => 'Type de fichier non autorise. Seuls les PDF et videos sont acceptes.'], 422);
    }

    $dossier = __DIR__ . '/../uploads/lecons/';
    if (!is_dir($dossier))
        mkdir($dossier, 0777, true);

    $extension = MIMES_AUTORISEES[$mimeReel];
    $nomFichier = time() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
    if (move_uploaded_file($_FILES['fichier']['tmp_name'], $dossier . $nomFichier)) {
        $cheminFichier = 'uploads/lecons/' . $nomFichier;
    } else {
        reponseJson(['succes' => false, 'message' => 'Erreur lors de l\'upload du fichier.'], 500);
    }
}

$stmt = $pdo->prepare('INSERT INTO lecons (chapitre_id, titre, type_contenu, chemin_fichier, ordre) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$chapitreId, $titre, $typeContenu, $cheminFichier, $ordre]);

reponseJson(['succes' => true, 'message' => 'Lecon ajoutee.']);