<?php

namespace App\Controllers\Api\V1\Modules\IMS;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\PartsCategoryModel;

class PartsCategoriesController extends BaseApiController
{
    protected $model;

    public function __construct()
    {
        $this->model = new PartsCategoryModel();
    }

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('inventory', 'view')) {
            return $this->failForbidden('Insufficient permissions to view parts categories');
        }

        try {
            $categories = $this->model->findAll();

            // Audit log
            $this->auditLog('VIEW', 'parts_categories', 0, null, ['count' => count($categories)]);

            return $this->respond([
                'status' => 'success',
                'data' => $categories
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Parts categories index error: ' . $e->getMessage());
            return $this->fail('Failed to load categories', 500);
        }
    }
}
