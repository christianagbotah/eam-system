<?php

namespace App\Services;

use App\Repositories\ProductionRepository;

class ProductionService
{
    protected $repository;

    public function __construct()
    {
        $this->repository = new ProductionRepository();
    }

    public function getAll(array $params = []): array
    {
        try {
            $data = $this->repository->findAll($params);
            return ['status' => 'success', 'data' => $data];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => $e->getMessage(), 'data' => []];
        }
    }

    public function getById(int $id): array
    {
        $data = $this->repository->findById($id);
        if (!$data) {
            return apiError('Not found', 404);
        }
        return apiSuccess($data);
    }

    public function create(array $data): array
    {
        $id = $this->repository->create($data);
        return apiSuccess(['id' => $id], 'Created successfully');
    }

    public function update(int $id, array $data): array
    {
        $updated = $this->repository->update($id, $data);
        if (!$updated) {
            return apiError('Update failed', 400);
        }
        return apiSuccess(null, 'Updated successfully');
    }

    public function delete(int $id): array
    {
        $deleted = $this->repository->delete($id);
        if (!$deleted) {
            return apiError('Delete failed', 400);
        }
        return apiSuccess(null, 'Deleted successfully');
    }
}
