<?php
namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;

class PlantScopeFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $session = session();
        $userId = $session->get('user_id');
        
        if (!$userId) {
            return services('response')
                ->setJSON(['success' => false, 'message' => 'Unauthorized'])
                ->setStatusCode(401);
        }
        
        // Check if plant_ids already loaded in session
        if ($session->has('allowed_plant_ids')) {
            return null;
        }
        
        $db = \Config\Database::connect();
        $plants = $db->table('user_plants')
            ->where('user_id', $userId)
            ->get()
            ->getResultArray();
        
        if (empty($plants)) {
            return services('response')
                ->setJSON(['success' => false, 'message' => 'No plant access assigned'])
                ->setStatusCode(403);
        }
        
        $plantIds = array_column($plants, 'plant_id');
        $defaultPlant = current(array_filter($plants, fn($p) => $p['is_primary'] ?? false));
        
        $session->set('allowed_plant_ids', $plantIds);
        $session->set('default_plant_id', $defaultPlant['plant_id'] ?? $plantIds[0]);
        
        return null;
    }
    
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // No action needed
    }
}
