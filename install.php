<?php
/**
 * Script d'installation de la base de données
 * Exécutez ce fichier une fois via le navigateur pour créer/mettre à jour les tables
 */

require_once __DIR__ . '/config/database.php';

header('Content-Type: text/html; charset=utf-8');

try {
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