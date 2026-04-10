<?php

namespace App\Controllers\Api\V1;

/**
 * Example Controller with Permission Protection
 */
class ProtectedController extends BaseApiController
{
    public function index()
    {
        // Check permission in controller
        if (!hasPermission('facilities.view')) {
            return $this->failForbidden('You do not have permission to view facilities');
        }

        return $this->respond(['status' => 'success', 'data' => []]);
    }

    public function create()
    {
        if (!can('facilities.create')) {
            return $this->failForbidden('You do not have permission to create facilities');
        }

        return $this->respond(['status' => 'success', 'message' => 'Created']);
    }

    public function update($id = null)
    {
        if (!can('facilities.update')) {
            return $this->failForbidden('You do not have permission to update facilities');
        }

        return $this->respond(['status' => 'success', 'message' => 'Updated']);
    }

    public function delete($id = null)
    {
        if (!can('facilities.delete')) {
            return $this->failForbidden('You do not have permission to delete facilities');
        }

        return $this->respond(['status' => 'success', 'message' => 'Deleted']);
    }
}
