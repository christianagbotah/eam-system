<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\Asset\HierarchyService;

class HierarchyController extends BaseApiController
{
    protected $hierarchyService;

    public function __construct()
    {
        $this->hierarchyService = new HierarchyService();
    }

    public function getTree($id = null)
    {
        try {
            $tree = $this->hierarchyService->getTree($id);
            return $this->respond(['data' => $tree]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getAncestors($id)
    {
        try {
            $ancestors = $this->hierarchyService->getAncestors($id);
            return $this->respond(['data' => $ancestors]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getDescendants($id)
    {
        try {
            $descendants = $this->hierarchyService->getDescendants($id);
            return $this->respond(['data' => $descendants]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function getBreadcrumb($id)
    {
        try {
            $breadcrumb = $this->hierarchyService->getBreadcrumb($id);
            return $this->respond(['data' => $breadcrumb]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function move()
    {
        $data = $this->request->getJSON(true);
        
        if (!isset($data['asset_id']) || !isset($data['new_parent_id'])) {
            return $this->fail('Missing required fields');
        }

        try {
            $result = $this->hierarchyService->moveAsset($data['asset_id'], $data['new_parent_id']);
            return $this->respond(['success' => $result]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function search()
    {
        $query = $this->request->getGet('q');
        $type = $this->request->getGet('type');
        $status = $this->request->getGet('status');

        try {
            $results = $this->hierarchyService->search($query, $type, $status);
            return $this->respond(['data' => $results]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
}
