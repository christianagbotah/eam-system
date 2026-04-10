<?php

namespace App\Interfaces;

interface PartServiceInterface
{
    public function getAllParts(array $filters = []): array;
    public function getPartById(int $id): ?array;
    public function createPart(array $data): array;
    public function updatePart(int $id, array $data): array;
    public function deletePart(int $id): bool;
    public function getPartMedia(int $partId): array;
    public function uploadPartMedia(int $partId, array $mediaData): array;
}