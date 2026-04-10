<?php

namespace App\Models;

use CodeIgniter\Model;

class OeeModel extends Model
{
    protected $table = 'oee_metrics';
    protected $primaryKey = 'id';
    protected $allowedFields = ['asset_id', 'shift_date', 'shift_name', 'planned_production_time', 'downtime_minutes', 'runtime_minutes', 'ideal_cycle_time', 'total_pieces', 'good_pieces', 'rejected_pieces', 'availability', 'performance', 'quality', 'oee'];
    protected $useTimestamps = true;

    public function calculateOee($assetId, $date, $shift)
    {
        $db = \Config\Database::connect();
        
        // Get target
        $target = $db->table('oee_asset_targets')->where('asset_id', $assetId)->get()->getRowArray();
        if (!$target) {
            return ['error' => 'No target configured for asset'];
        }

        // Get downtime
        $downtime = $db->table('oee_downtime_events')
            ->where('asset_id', $assetId)
            ->where('DATE(start_time)', $date)
            ->selectSum('duration_minutes')
            ->get()->getRow()->duration_minutes ?? 0;

        // Get production counts
        $production = $db->table('oee_production_counts')
            ->where('asset_id', $assetId)
            ->where('DATE(timestamp)', $date)
            ->where('shift_name', $shift)
            ->select('SUM(good_count) as good, SUM(reject_count) as reject')
            ->get()->getRowArray();

        $goodPieces = $production['good'] ?? 0;
        $rejectPieces = $production['reject'] ?? 0;
        $totalPieces = $goodPieces + $rejectPieces;

        // Calculate OEE components
        $plannedTime = 480; // 8 hours in minutes
        $runtime = $plannedTime - $downtime;
        $availability = $plannedTime > 0 ? ($runtime / $plannedTime) * 100 : 0;
        
        $idealCycleTime = $target['ideal_cycle_time'];
        $theoreticalOutput = $runtime > 0 ? ($runtime * 60) / $idealCycleTime : 0;
        $performance = $theoreticalOutput > 0 ? ($totalPieces / $theoreticalOutput) * 100 : 0;
        
        $quality = $totalPieces > 0 ? ($goodPieces / $totalPieces) * 100 : 0;
        
        $oee = ($availability * $performance * $quality) / 10000;

        // Save metrics
        $data = [
            'asset_id' => $assetId,
            'shift_date' => $date,
            'shift_name' => $shift,
            'planned_production_time' => $plannedTime,
            'downtime_minutes' => $downtime,
            'runtime_minutes' => $runtime,
            'ideal_cycle_time' => $idealCycleTime,
            'total_pieces' => $totalPieces,
            'good_pieces' => $goodPieces,
            'rejected_pieces' => $rejectPieces,
            'availability' => round($availability, 2),
            'performance' => round($performance, 2),
            'quality' => round($quality, 2),
            'oee' => round($oee, 2),
        ];

        $existing = $db->table('oee_metrics')
            ->where('asset_id', $assetId)
            ->where('shift_date', $date)
            ->where('shift_name', $shift)
            ->get()->getRowArray();

        if ($existing) {
            $db->table('oee_metrics')->where('id', $existing['id'])->update($data);
        } else {
            $db->table('oee_metrics')->insert($data);
        }

        return $data;
    }

    public function getMetrics($assetId, $startDate, $endDate, $groupBy = 'day')
    {
        $builder = $this->db->table('oee_metrics')
            ->where('shift_date >=', $startDate)
            ->where('shift_date <=', $endDate);

        if ($assetId) {
            $builder->where('asset_id', $assetId);
        }

        if ($groupBy === 'asset') {
            $builder->select('asset_id, AVG(oee) as avg_oee, AVG(availability) as avg_availability, AVG(performance) as avg_performance, AVG(quality) as avg_quality')
                ->groupBy('asset_id');
        } else {
            $builder->select('shift_date, AVG(oee) as avg_oee, AVG(availability) as avg_availability, AVG(performance) as avg_performance, AVG(quality) as avg_quality')
                ->groupBy('shift_date')
                ->orderBy('shift_date', 'ASC');
        }

        return $builder->get()->getResultArray();
    }

    public function logDowntime($data)
    {
        if (isset($data['end_time']) && $data['end_time']) {
            $start = strtotime($data['start_time']);
            $end = strtotime($data['end_time']);
            $data['duration_minutes'] = round(($end - $start) / 60);
        }

        $data['created_at'] = date('Y-m-d H:i:s');
        
        $reason = $this->db->table('oee_downtime_reasons')->where('id', $data['reason_code_id'])->get()->getRowArray();
        if ($reason) {
            $data['is_planned'] = $reason['is_planned'];
        }

        $this->db->table('oee_downtime_events')->insert($data);
        return $this->db->insertID();
    }

    public function logProduction($data)
    {
        $data['timestamp'] = date('Y-m-d H:i:s');
        $data['created_at'] = date('Y-m-d H:i:s');
        
        $this->db->table('oee_production_counts')->insert($data);
        return $this->db->insertID();
    }

    public function getDowntimeAnalysis($assetId, $startDate, $endDate)
    {
        $builder = $this->db->table('oee_downtime_events e')
            ->join('oee_downtime_reasons r', 'e.reason_code_id = r.id')
            ->where('DATE(e.start_time) >=', $startDate)
            ->where('DATE(e.start_time) <=', $endDate);

        if ($assetId) {
            $builder->where('e.asset_id', $assetId);
        }

        $byReason = $builder->select('r.code, r.description, r.category, SUM(e.duration_minutes) as total_minutes, COUNT(*) as occurrences')
            ->groupBy('r.id')
            ->orderBy('total_minutes', 'DESC')
            ->get()->getResultArray();

        return ['by_reason' => $byReason];
    }

    public function getAssetTarget($assetId)
    {
        return $this->db->table('oee_asset_targets')->where('asset_id', $assetId)->get()->getRowArray();
    }

    public function getAllTargets()
    {
        return $this->db->table('oee_asset_targets')->get()->getResultArray();
    }

    public function updateAssetTarget($assetId, $data)
    {
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        $existing = $this->db->table('oee_asset_targets')->where('asset_id', $assetId)->get()->getRowArray();
        
        if ($existing) {
            $this->db->table('oee_asset_targets')->where('asset_id', $assetId)->update($data);
        } else {
            $data['asset_id'] = $assetId;
            $this->db->table('oee_asset_targets')->insert($data);
        }
    }

    public function getDowntimeReasons()
    {
        return $this->db->table('oee_downtime_reasons')->where('is_active', 1)->get()->getResultArray();
    }

    public function getDashboardSummary($assetId, $date)
    {
        $metrics = $this->db->table('oee_metrics')
            ->where('asset_id', $assetId)
            ->where('shift_date', $date)
            ->get()->getResultArray();

        $target = $this->getAssetTarget($assetId);

        return [
            'metrics' => $metrics,
            'target' => $target,
            'avg_oee' => !empty($metrics) ? array_sum(array_column($metrics, 'oee')) / count($metrics) : 0,
        ];
    }
}
