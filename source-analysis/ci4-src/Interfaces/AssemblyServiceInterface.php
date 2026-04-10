<?php

namespace App\Interfaces;

interface AssemblyServiceInterface
{
    public function getAllAssemblies(array $filters = []): array;
    public function getAssemblyById(int $id): ?array;
    public function createAssembly(array $data): array;
    public function updateAssembly(int $id, array $data): array;
    public function deleteAssembly(int $id): bool;
    public function getAssemblyParts(int $assemblyId): array;
}