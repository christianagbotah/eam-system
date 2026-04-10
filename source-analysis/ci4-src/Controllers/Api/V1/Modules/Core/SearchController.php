<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class SearchController extends ResourceController
{
    public function global()
    {
        $query = $this->request->getGet('q');
        $type = $this->request->getGet('type');

        if (empty($query)) {
            return $this->fail('Search query required');
        }

        $db = \Config\Database::connect();
        $results = [];

        // Search assets
        if (!$type || $type === 'assets') {
            $results['assets'] = $db->table('assets_unified')
                ->like('asset_name', $query)
                ->orLike('asset_code', $query)
                ->limit(10)->get()->getResultArray();
        }

        // Search work orders
        if (!$type || $type === 'work_orders') {
            $results['work_orders'] = $db->table('work_orders')
                ->like('wo_number', $query)
                ->orLike('description', $query)
                ->limit(10)->get()->getResultArray();
        }

        // Search inventory
        if (!$type || $type === 'inventory') {
            $results['inventory'] = $db->table('inventory_items')
                ->like('item_name', $query)
                ->orLike('part_number', $query)
                ->limit(10)->get()->getResultArray();
        }

        return $this->respond($results);
    }

    public function advanced()
    {
        $filters = $this->request->getJSON(true);
        $table = $filters['table'] ?? 'assets';
        
        $db = \Config\Database::connect();
        $builder = $db->table($table);

        foreach ($filters['conditions'] ?? [] as $condition) {
            $field = $condition['field'];
            $operator = $condition['operator'];
            $value = $condition['value'];

            switch ($operator) {
                case 'equals':
                    $builder->where($field, $value);
                    break;
                case 'contains':
                    $builder->like($field, $value);
                    break;
                case 'greater_than':
                    $builder->where("$field >", $value);
                    break;
                case 'less_than':
                    $builder->where("$field <", $value);
                    break;
            }
        }

        $results = $builder->limit(100)->get()->getResultArray();

        return $this->respond(['results' => $results, 'count' => count($results)]);
    }
}
