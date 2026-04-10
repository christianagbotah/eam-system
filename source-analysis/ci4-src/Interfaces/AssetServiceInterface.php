<?php

namespace App\Interfaces;

interface AssetServiceInterface
{
    public function getAllMachines(array $filters = []): array;
    public function getMachineById(int $id): ?array;
    public function createMachine(array $data): array;
    public function updateMachine(int $id, array $data): array;
    public function deleteMachine(int $id): bool;
    public function getMachineAssemblies(int $machineId): array;
    public function getMachineStats(): array;
}