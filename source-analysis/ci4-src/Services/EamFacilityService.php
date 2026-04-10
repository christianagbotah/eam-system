<?php

namespace App\Services;

use App\Repositories\EamFacilityRepository;

class EamFacilityService
{
    protected $repo;

    public function __construct()
    {
        $this->repo = new EamFacilityRepository();
    }

    public function getAll($params)
    {
        $page = $params['page'] ?? 1;
        $limit = $params['limit'] ?? 20;
        $search = $params['search'] ?? '';
        
        return $this->repo->paginate($page, $limit, $search);
    }

    public function getById($id)
    {
        $data = $this->repo->find($id);
        return $data ? ['status' => 'success', 'data' => $data] : ['status' => 'error', 'message' => 'Not found'];
    }

    public function create($data)
    {
        // Validate international fields
        if (isset($data['country_code']) && strlen($data['country_code']) !== 2) {
            return ['status' => 'error', 'message' => 'Country code must be 2 characters (ISO 3166-1)'];
        }
        if (isset($data['latitude']) && ($data['latitude'] < -90 || $data['latitude'] > 90)) {
            return ['status' => 'error', 'message' => 'Latitude must be between -90 and 90'];
        }
        if (isset($data['longitude']) && ($data['longitude'] < -180 || $data['longitude'] > 180)) {
            return ['status' => 'error', 'message' => 'Longitude must be between -180 and 180'];
        }
        
        $id = $this->repo->create($data);
        return $id ? ['status' => 'success', 'data' => ['id' => $id]] : ['status' => 'error', 'message' => 'Creation failed'];
    }

    public function update($id, $data)
    {
        // Validate international fields
        if (isset($data['country_code']) && strlen($data['country_code']) !== 2) {
            return ['status' => 'error', 'message' => 'Country code must be 2 characters (ISO 3166-1)'];
        }
        if (isset($data['latitude']) && ($data['latitude'] < -90 || $data['latitude'] > 90)) {
            return ['status' => 'error', 'message' => 'Latitude must be between -90 and 90'];
        }
        if (isset($data['longitude']) && ($data['longitude'] < -180 || $data['longitude'] > 180)) {
            return ['status' => 'error', 'message' => 'Longitude must be between -180 and 180'];
        }
        
        $result = $this->repo->update($id, $data);
        return $result ? ['status' => 'success', 'message' => 'Updated'] : ['status' => 'error', 'message' => 'Update failed'];
    }

    public function delete($id)
    {
        $result = $this->repo->delete($id);
        return $result ? ['status' => 'success', 'message' => 'Deleted'] : ['status' => 'error', 'message' => 'Delete failed'];
    }
}
