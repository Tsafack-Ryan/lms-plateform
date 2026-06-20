<?php

declare(strict_types=1);

require_once __DIR__ . '/_bootstrap.php';

$pdo = obtenirConnexion();
$methode = methodeHttp();

if ($methode === 'GET') {
    $coursId = (int) ($_GET['cours_id'] ?? 0);
    $examenId = (int) ($_GET['id'] ?? 0);

    $utilisateur = utilisateurConnecte();
    $modeEnseignant = ($utilisateur && $utilisateur['role'] === 'enseignant');

    if ($examenId > 0) {
        $stmt = $pdo->prepare('SELECT * FROM examens_finaux WHERE id = ?');
        $stmt->execute([$examenId]);
        $examen = $stmt->fetch();
        if (!$examen)
            reponseJson(['succes' => false, 'message' => 'Question introuvable.'], 404);

        if ($modeEnseignant) {
            $stmtOptions = $pdo->prepare('SELECT id, code_option, libelle, est_correcte FROM options_examen_final WHERE examen_id = ? ORDER BY code_option ASC');
        } else {
            $stmtOptions = $pdo->prepare('SELECT id, code_option, libelle FROM options_examen_final WHERE examen_id = ? ORDER BY code_option ASC');
        }
        $stmtOptions->execute([$examenId]);
        $examen['options'] = $stmtOptions->fetchAll();

        reponseJson(['succes' => true, 'examen' => $examen]);
    }

    if ($coursId > 0) {
        // Recuperer toutes les questions de l'examen final d'un cours
        if ($modeEnseignant) {
            $stmt = $pdo->prepare('SELECT ef.*, c.titre AS cours_titre FROM examens_finaux ef INNER JOIN cours c ON c.id = ef.cours_id WHERE ef.cours_id = ? AND c.enseignant_id = ? ORDER BY ef.id ASC');
            $stmt->execute([$coursId, $utilisateur['id']]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM examens_finaux WHERE cours_id = ? ORDER BY id ASC');
            $stmt->execute([$coursId]);
        }
        $questions = $stmt->fetchAll();

        if (!empty($questions)) {
            $qIds = array_column($questions, 'id');
            $placeholders = implode(',', array_fill(0, count($qIds), '?'));
            if ($modeEnseignant) {
                $stmtOptions = $pdo->prepare(
                    "SELECT examen_id, id, code_option, libelle, est_correcte 
                     FROM options_examen_final WHERE examen_id IN ($placeholders)
                     ORDER BY examen_id ASC, code_option ASC"
                );
            } else {
                $stmtOptions = $pdo->prepare(
                    "SELECT examen_id, id, code_option, libelle 
                     FROM options_examen_final WHERE examen_id IN ($placeholders)
                     ORDER BY examen_id ASC, code_option ASC"
                );
            }
            $stmtOptions->execute($qIds);
            $allOptions = $stmtOptions->fetchAll();
            $optionsGrouped = [];
            foreach ($allOptions as $opt) {
                $optionsGrouped[$opt['examen_id']][] = $opt;
            }
            foreach ($questions as &$q) {
                $q['options'] = $optionsGrouped[$q['id']] ?? [];
            }
            unset($q);
        }

        reponseJson(['succes' => true, 'questions' => $questions]);
    }


    // Sans parametre cours_id, retourner toutes les questions d'examen (pour la page enseignant/promoteur)
    if ($modeEnseignant) {
        $stmt = $pdo->prepare('SELECT ef.*, c.titre AS cours_titre FROM examens_finaux ef INNER JOIN cours c ON c.id = ef.cours_id WHERE c.enseignant_id = ? ORDER BY c.titre ASC, ef.id ASC');
        $stmt->execute([$utilisateur['id']]);
    } else {
        $stmt = $pdo->query('SELECT ef.*, c.titre AS cours_titre FROM examens_finaux ef INNER JOIN cours c ON c.id = ef.cours_id ORDER BY c.titre ASC');
    }
    $questions = $stmt->fetchAll();
    if (!empty($questions)) {
        $qIds = array_column($questions, 'id');
        $placeholders = implode(',', array_fill(0, count($qIds), '?'));
        if ($modeEnseignant) {
            $stmtOptions = $pdo->prepare(
                "SELECT examen_id, id, code_option, libelle, est_correcte 
                 FROM options_examen_final WHERE examen_id IN ($placeholders)
                 ORDER BY examen_id ASC, code_option ASC"
            );
        } else {
            $stmtOptions = $pdo->prepare(
                "SELECT examen_id, id, code_option, libelle 
                 FROM options_examen_final WHERE examen_id IN ($placeholders)
                 ORDER BY examen_id ASC, code_option ASC"
            );
        }
        $stmtOptions->execute($qIds);
        $allOptions = $stmtOptions->fetchAll();
        $optionsGrouped = [];
        foreach ($allOptions as $opt) {
            $optionsGrouped[$opt['examen_id']][] = $opt;
        }
        foreach ($questions as &$q) {
            $q['options'] = $optionsGrouped[$q['id']] ?? [];
        }
        unset($q);
    }
    reponseJson(['succes' => true, 'questions' => $questions]);
}

$enseignant = exigerRole('enseignant');

if ($methode === 'DELETE') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    if ($id <= 0)
        reponseJson(['succes' => false, 'message' => 'ID invalide.'], 422);

    $stmt = $pdo->prepare('
        DELETE ef FROM examens_finaux ef
        INNER JOIN cours c ON c.id = ef.cours_id
        WHERE ef.id = ? AND c.enseignant_id = ?
    ');
    $stmt->execute([$id, $enseignant['id']]);
    if ($stmt->rowCount() === 0)
        reponseJson(['succes' => false, 'message' => 'Question introuvable ou non autorisee.'], 403);

    reponseJson(['succes' => true, 'message' => 'Question supprimee.']);
}

if ($methode === 'PUT') {
    $donnees = lireJson();
    $id = (int) ($donnees['id'] ?? 0);
    $question = trim($donnees['question'] ?? '');
    $options = $donnees['options'] ?? [];
    $bonneReponse = strtoupper((string) ($donnees['bonne_reponse'] ?? ''));

    if ($id <= 0 || $question === '' || !is_array($options) || $bonneReponse === '') {
        reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);
    }

    $optionsNettoyees = [];
    foreach ($options as $code => $libelle) {
        $codeNormalise = strtoupper((string) $code);
        $libelle = trim((string) $libelle);
        if ($libelle !== '')
            $optionsNettoyees[$codeNormalise] = $libelle;
    }

    if (count($optionsNettoyees) < 2 || !isset($optionsNettoyees[$bonneReponse])) {
        reponseJson(['succes' => false, 'message' => 'Ajoutez au moins deux options et choisissez une bonne reponse valide.'], 422);
    }

    // Verifier autorisation
    $stmt = $pdo->prepare('
        SELECT ef.id FROM examens_finaux ef
        INNER JOIN cours c ON c.id = ef.cours_id
        WHERE ef.id = ? AND c.enseignant_id = ?
    ');
    $stmt->execute([$id, $enseignant['id']]);
    if (!$stmt->fetchColumn())
        reponseJson(['succes' => false, 'message' => 'Question non autorisee.'], 403);

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('UPDATE examens_finaux SET question = ? WHERE id = ?');
        $stmt->execute([$question, $id]);

        $stmt = $pdo->prepare('DELETE FROM options_examen_final WHERE examen_id = ?');
        $stmt->execute([$id]);

        $insert = $pdo->prepare('INSERT INTO options_examen_final (examen_id, code_option, libelle, est_correcte) VALUES (?, ?, ?, ?)');
        foreach ($optionsNettoyees as $code => $libelle) {
            $insert->execute([$id, $code, $libelle, $code === $bonneReponse ? 1 : 0]);
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        reponseJson(['succes' => false, 'message' => 'Erreur: ' . $e->getMessage()], 500);
    }

    reponseJson(['succes' => true, 'message' => 'Question mise a jour.']);
}

// POST : creer une question d'examen final
$donnees = $_POST ?: lireJson();
$coursId = (int) ($donnees['cours_id'] ?? 0);
$question = trim($donnees['question'] ?? '');
$options = $donnees['options'] ?? [];
$bonneReponse = $donnees['bonne_reponse'] ?? '';

if ($coursId <= 0 || $question === '' || !is_array($options) || $bonneReponse === '') {
    reponseJson(['succes' => false, 'message' => 'Donnees invalides.'], 422);
}

// Verifier que le cours appartient a l'enseignant
$verif = $pdo->prepare('SELECT id FROM cours WHERE id = ? AND enseignant_id = ?');
$verif->execute([$coursId, $enseignant['id']]);
if (!$verif->fetchColumn())
    reponseJson(['succes' => false, 'message' => 'Cours non autorise.'], 403);

$optionsNettoyees = [];
foreach ($options as $code => $libelle) {
    $codeNormalise = strtoupper((string) $code);
    $libelle = trim((string) $libelle);
    if ($libelle !== '')
        $optionsNettoyees[$codeNormalise] = $libelle;
}

if (count($optionsNettoyees) < 2 || !isset($optionsNettoyees[strtoupper((string) $bonneReponse)])) {
    reponseJson(['succes' => false, 'message' => 'Ajoutez au moins deux options et choisissez une bonne reponse valide.'], 422);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('INSERT INTO examens_finaux (cours_id, question) VALUES (?, ?)');
    $stmt->execute([$coursId, $question]);
    $examenId = (int) $pdo->lastInsertId();

    $insert = $pdo->prepare('INSERT INTO options_examen_final (examen_id, code_option, libelle, est_correcte) VALUES (?, ?, ?, ?)');
    foreach ($optionsNettoyees as $code => $libelle) {
        $insert->execute([$examenId, $code, $libelle, $code === strtoupper((string) $bonneReponse) ? 1 : 0]);
    }

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    reponseJson(['succes' => false, 'message' => 'Erreur: ' . $e->getMessage()], 500);
}

reponseJson(['succes' => true, 'message' => 'Question d\'examen ajoutee.', 'id' => $examenId]);