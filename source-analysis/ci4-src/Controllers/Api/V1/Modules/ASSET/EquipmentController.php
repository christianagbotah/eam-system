<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Services\EamEquipmentService;

class EquipmentController extends BaseApiController
{
    protected $service;

    public function __construct()
    {
        $this->service = new EamEquipmentService();
    }

    public function index()
    {
        $params = $this->request->getGet();
        $result = $this->service->getAll($params);
        return $this->respond($result);
    }

    public function show($id = null)
    {
        $result = $this->service->getById($id);
        return $this->respond($result);
    }

    public function create()
    {
        $data = $this->request->getPost();
        $file = $this->request->getFile('image');
        
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'uploads/assets', $newName);
            $data['image'] = base_url('uploads/assets/' . $newName);
        }
        
        $result = $this->service->create($data);
        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->update($id, $data);
        return $this->respond($result);
    }

    public function delete($id = null)
    {
        $result = $this->service->delete($id);
        return $this->respond($result);
    }
}

