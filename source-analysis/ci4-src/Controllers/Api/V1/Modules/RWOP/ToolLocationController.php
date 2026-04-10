<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class ToolLocationController extends ResourceController
{
    use ResponseTrait;

    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    // GET /api/v1/eam/tool-location/current
    public function current()
    {
        try {
            $plantId = $this->request->getGet('plant_id') ?? 1;
            
            $sql = "SELECT 
                        t.id, t.name, t.code, tc.name as category,
                        tl.latitude, tl.longitude, tl.location_name, tl.location_type,
                        tl.accuracy, tl.updated_at, u.username as updated_by_name
                    FROM tools t
                    LEFT JOIN tool_categories tc ON tc.id = t.category_id
                    LEFT JOIN tool_locations tl ON tl.tool_id = t.id
                    LEFT JOIN users u ON u.id = tl.updated_by
                    WHERE t.plant_id = ? AND t.status = 'ACTIVE'
                    ORDER BY t.name";
            
            $result = $this->db->query($sql, [$plantId])->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching locations: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-location/update
    public function updateLocation()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'tool_id' => 'required|integer',
                'location_type' => 'required|in_list[GPS,MANUAL,ZONE,BUILDING]'
            ]);

            if (!$validation->run($data)) {
                return $this->fail($validation->getErrors());
            }

            $locationData = [
                'tool_id' => $data['tool_id'],
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'location_name' => $data['location_name'] ?? null,
                'location_type' => $data['location_type'],
                'accuracy' => $data['accuracy'] ?? null,
                'updated_by' => session('user_id'),
                'plant_id' => $data['plant_id'] ?? 1
            ];

            // Update current location
            $existing = $this->db->table('tool_locations')
                ->where('tool_id', $data['tool_id'])
                ->get()->getRowArray();

            if ($existing) {
                $this->db->table('tool_locations')
                    ->where('tool_id', $data['tool_id'])
                    ->update($locationData);
            } else {
                $this->db->table('tool_locations')->insert($locationData);
            }

            // Add to history
            $historyData = $locationData;
            $historyData['created_at'] = date('Y-m-d H:i:s');
            unset($historyData['updated_by']);
            $historyData['updated_by'] = session('user_id');
            
            $this->db->table('tool_location_history')->insert($historyData);

            return $this->respond([
                'status' => 'success',
                'message' => 'Location updated successfully'
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error updating location: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-location/history/{tool_id}
    public function history($toolId)
    {
        try {
            $sql = "SELECT 
                        tlh.*, u.username as updated_by_name
                    FROM tool_location_history tlh
                    LEFT JOIN users u ON u.id = tlh.updated_by
                    WHERE tlh.tool_id = ?
                    ORDER BY tlh.created_at DESC
                    LIMIT 50";
            
            $result = $this->db->query($sql, [$toolId])->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching history: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-location/zones
    public function zones()
    {
        try {
            $plantId = $this->request->getGet('plant_id') ?? 1;
            
            $zones = $this->db->table('location_zones')
                ->where('plant_id', $plantId)
                ->orderBy('name')
                ->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $zones
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching zones: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-location/zones
    public function createZone()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'name' => 'required|string|max_length[255]',
                'center_latitude' => 'required|decimal',
                'center_longitude' => 'required|decimal',
                'radius' => 'required|decimal'
            ]);

            if (!$validation->run($data)) {
                return $this->fail($validation->getErrors());
            }

            $zoneData = [
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'center_latitude' => $data['center_latitude'],
                'center_longitude' => $data['center_longitude'],
                'radius' => $data['radius'],
                'plant_id' => $data['plant_id'] ?? 1
            ];

            $this->db->table('location_zones')->insert($zoneData);

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Zone created successfully'
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error creating zone: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-location/nearby
    public function nearby()
    {
        try {
            $latitude = $this->request->getGet('latitude');
            $longitude = $this->request->getGet('longitude');
            $radius = $this->request->getGet('radius') ?? 100; // meters
            $plantId = $this->request->getGet('plant_id') ?? 1;

            if (!$latitude || !$longitude) {
                return $this->fail('Latitude and longitude are required');
            }

            // Haversine formula for distance calculation
            $sql = "SELECT 
                        t.id, t.name, t.code, tc.name as category,
                        tl.latitude, tl.longitude, tl.location_name,
                        (6371000 * acos(cos(radians(?)) * cos(radians(tl.latitude)) * 
                         cos(radians(tl.longitude) - radians(?)) + 
                         sin(radians(?)) * sin(radians(tl.latitude)))) AS distance
                    FROM tools t
                    LEFT JOIN tool_categories tc ON tc.id = t.category_id
                    INNER JOIN tool_locations tl ON tl.tool_id = t.id
                    WHERE t.plant_id = ? AND t.status = 'ACTIVE'
                        AND tl.latitude IS NOT NULL AND tl.longitude IS NOT NULL
                    HAVING distance <= ?
                    ORDER BY distance";
            
            $result = $this->db->query($sql, [
                $latitude, $longitude, $latitude, $plantId, $radius
            ])->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error finding nearby tools: ' . $e->getMessage());
        }
    }
}