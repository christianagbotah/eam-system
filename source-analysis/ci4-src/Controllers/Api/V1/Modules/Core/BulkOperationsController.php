<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class BulkOperationsController extends ResourceController
{
    public function updateAssets()
    {
        $data = $this->request->getJSON(true);
        $ids = $data['ids'] ?? [];
        $updates = $data['updates'] ?? [];

        if (empty($ids) || empty($updates)) {
            return $this->fail('IDs and updates required');
        }

        $db = \Config\Database::connect();
        $db->transStart();

        foreach ($ids as $id) {
            $db->table('assets_unified')->where('id', $id)->update($updates);
        }

        $db->transComplete();

        return $this->respond([
            'success' => $db->transStatus(),
            'updated' => count($ids)
        ]);
    }

    public function createWorkOrders()
    {
        $data = $this->request->getJSON(true);
        $assetIds = $data['asset_ids'] ?? [];
        $woData = $data['work_order'] ?? [];

        $db = \Config\Database::connect();
        $db->transStart();

        $created = [];
        foreach ($assetIds as $assetId) {
            $woData['asset_id'] = $assetId;
            $woData['wo_number'] = 'WO-' . time() . '-' . $assetId;
            $id = $db->table('work_orders')->insert($woData);
            $created[] = $id;
        }

        $db->transComplete();

        return $this->respond([
            'success' => $db->transStatus(),
            'created' => count($created),
            'ids' => $created
        ]);
    }

    public function deleteMultiple()
    {
        $data = $this->request->getJSON(true);
        $table = $data['table'] ?? '';
        $ids = $data['ids'] ?? [];

        if (empty($table) || empty($ids)) {
            return $this->fail('Table and IDs required');
        }

        $db = \Config\Database::connect();
        $db->table($table)->whereIn('id', $ids)->delete();

        return $this->respond([
            'success' => true,
            'deleted' => count($ids)
        ]);
    }
}
