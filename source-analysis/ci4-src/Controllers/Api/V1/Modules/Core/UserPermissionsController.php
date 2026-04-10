<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class BomController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        return $this->respond([
            'status' => 'success',
            'data' => []
        ]);
    }

    public function show($id = null)
    {
        return $this->respond([
            'status' => 'success',
            'data' => []
        ]);
    }

    public function create()
    {
        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Created successfully'
        ]);
    }

    public function update($id = null)
    {
        return $this->respond([
            'status' => 'success',
            'message' => 'Updated successfully'
        ]);
    }

    public function delete($id = null)
    {
        return $this->respondDeleted([
            'status' => 'success',
            'message' => 'Deleted successfully'
        ]);
    }
}
C;IAED,KAAK,C
