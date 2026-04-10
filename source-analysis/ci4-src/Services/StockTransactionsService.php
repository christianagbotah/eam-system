<?php

namespace App\Services;

use App\Repositories\StockTransactionsRepository;

class StockTransactionsService
{
    protected $repository;

    public function __construct()
    {
        $this->repository = new StockTransactionsRepository();
    }

    public function getAll(array $params = []): array
    {
        $data = $this->repository->findAll($params);
        return apiSuccess($data);
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
