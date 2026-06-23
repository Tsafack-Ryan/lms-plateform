<?php
/**
 * Script d'installation de la base de données
 * Exécutez ce fichier une fois via le navigateur pour créer/mettre à jour les tables
 */

require_once __DIR__ . '/config/database.php';

header('Content-Type: text/html; charset=utf-8');

try {
    // Connexion temporaire SANS dbname pour créer la base si elle n'existe pas encore.
    // obtenirConnexion() inclut 'dbname=lms_plateforme' et crasherait si la base est absente.
    $tempPdo = new PDO(
        'mysql:host=' . DB_HOST . ';charset=utf8mb4',
        DB_USER,
        DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $tempPdo->exec(
        "CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
    $tempPdo->exec("USE `" . DB_NAME . "`");
    $tempPdo = null; // libérer la connexion temporaire

    $pdo = obtenirConnexion();

    // Lire et exécuter le schéma SQL
    $sql = file_get_contents(__DIR__ . '/config/schema.sql');

    // Exécuter chaque requête séparément
    $requetes = explode(';', $sql);
    $compte = 0;
    foreach ($requetes as $requete) {
        $requete = trim($requete);
        if (!empty($requete) && (stripos($requete, 'CREATE') !== false || stripos($requete, 'INSERT') !== false || stripos($requete, 'DROP') !== false || stripos($requete, 'USE') !== false)) {
            try {
                $pdo->exec($requete);
                $compte++;
            } catch (PDOException $e) {
                echo "<div style='color:orange;'>⚠️ Requete ignoree: " . htmlspecialchars(substr($requete, 0, 60)) . "... → " . $e->getMessage() . "</div>\n";
            }
        }
    }

    echo "<h2 style='color:green;'>✅ Installation terminee !</h2>";
    echo "<p>$compte requetes executees avec succes.</p>";
    echo "<h3>Tables creees :</h3><ul>";
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        echo "<li>$table</li>";
    }
    echo "</ul>";
    echo "<p><a href='index.html'>Acceder a l'application</a></p>";

} catch (Exception $e) {
    echo "<h2 style='color:red;'>❌ Erreur : " . htmlspecialchars($e->getMessage()) . "</h2>";
}