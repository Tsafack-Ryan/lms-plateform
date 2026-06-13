<?php

declare(strict_types=1);

session_start();

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');

function reponseJson(array $donnees, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($donnees, JSON_UNESCAPED_UNICODE);
    exit;
}

function lireJson(): array
{
    $contenu = file_get_contents('php://input');
    if ($contenu === false || trim($contenu) === '') {
        return [];
    }

    $donnees = json_decode($contenu, true);
    return is_array($donnees) ? $donnees : [];
}

function methodeHttp(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

function utilisateurConnecte(): ?array
{
    return $_SESSION['utilisateur'] ?? null;
}

function exigerUtilisateur(): array
{
    $utilisateur = utilisateurConnecte();
    if (!$utilisateur) {
        reponseJson(['succes' => false, 'message' => 'Utilisateur non connecte.'], 401);
    }

    return $utilisateur;
}

function exigerRole(string $role): array
{
    $utilisateur = exigerUtilisateur();
    if (($utilisateur['role'] ?? '') !== $role) {
        reponseJson(['succes' => false, 'message' => 'Acces non autorise.'], 403);
    }

    return $utilisateur;
}
