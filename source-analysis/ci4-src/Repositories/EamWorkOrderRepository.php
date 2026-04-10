<?php

namespace App\Repositories;

class EamWorkOrderRepository extends BaseRepository
{
    protected $table = 'work_orders';

    public function paginate($page, $limit, $search = '', $filters = [])
    {
        $offset = ($page - 1) * $limit;
        $builder = $this->db->table($this->table . ' wo');
        
        $this->applyPlantScope($builder, 'wo');
        
        // Apply assigned_to filter - check both assigned_to and team_members
        if (!empty($filters['assigned_to'])) {
            $userId = $filters['assigned_to'];
            $builder->groupStart()
                ->where('wo.assigned_to', $userId)
                ->orWhere('wo.id IN (SELECT work_order_id FROM work_order_team_members WHERE technician_id = ' . $userId . ')', null, false)
                ->groupEnd();
        }
        
        if ($search) {
            $builder->groupStart()
                ->like('wo.title', $search)
                ->orLike('wo.work_order_number', $search)
                ->orLike('wo.description', $search)
                ->groupEnd();
        }
        
        $total = $builder->countAllResults(false);
        $data = $builder->select('wo.*')->orderBy('wo.created_at', 'DESC')->limit($limit, $offset)->get()->getResultArray();
        
        return [
            'status' => 'success',
            'data' => $data,
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]
        ];
    }

    public function assignTechnician($id, $technicianId)
    {
        $builder = $this->db->table($this->table)->where('id', $id);
        $this->applyPlantScope($builder);
        return $builder->update(['assigned_to' => $technicianId, 'status' => 'assigned']);
    }

    public function complete($id, $data)
    {
        $updateData = [
            'status' => 'completed',
            'completed_at' => date('Y-m-d H:i:s'),
            'completion_notes' => $data['notes'] ?? null
        ];
        $builder = $this->db->table($this->table)->where('id', $id);
        $this->applyPlantScope($builder);
        return $builder->update($updateData);
    }

    public function countByMonth($year, $month)
    {
        $builder = $this->db->table($this->table)
            ->where('YEAR(created_at)', $year)
            ->where('MONTH(created_at)', $month);
        $this->applyPlantScope($builder);
        return $builder->countAllResults();
    }
}
