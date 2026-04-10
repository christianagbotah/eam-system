<?php

namespace App\Services;

use App\Repositories\EquipmentRepository;
use App\Repositories\AssemblyRepository;
use App\Repositories\PartRepository;

class AssetHierarchyService
{
    protected $equipmentRepo;
    protected $assemblyRepo;
    protected $partRepo;

    public function __construct()
    {
        $this->equipmentRepo = new EquipmentRepository();
        $this->assemblyRepo = new AssemblyRepository();
        $this->partRepo = new PartRepository();
    }

    public function getEquipment(array $params): array
    {
        return $this->equipmentRepo->findAll($params);
    }

    public function getAssemblies(int $equipmentId, array $params): array
    {
        return $this->assemblyRepo->findByEquipment($equipmentId, $params);
    }

    public function getParts(int $assemblyId, array $params): array
    {
        return $this->partRepo->findByAssembly($assemblyId, $params);
    }

    public function createAssembly(array $data): array
    {
        $id = $this->assemblyRepo->create($data);
        return $id ? ['success' => true, 'data' => $this->assemblyRepo->findById($id)] : ['success' => false, 'message' => 'Failed to create assembly'];
    }

    public function createPart(array $data): array
    {
        $id = $this->partRepo->create($data);
        return $id ? ['success' => true, 'data' => $this->partRepo->findById($id)] : ['success' => false, 'message' => 'Failed to create part'];
    }
}
