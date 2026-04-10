<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\OperatorGroupService;

class OperatorGroupsController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new OperatorGroupService();
    }

    public function index()
    {
        $result = $this->service->getAll();
        return $this->respond($result);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $data['created_by'] = $this->getUser()->id ?? 1;
        $result = $this->service->create($data);
        return $this->respond($result, 201);
    }

    public function delete($id = null)
    {
        $result = $this->service->delete($id);
        return $this->respond($result);
    }
}
