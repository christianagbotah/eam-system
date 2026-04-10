<?php
namespace App\Services\Analytics;

class OEEService {
    protected $db;

    public function __construct() {
        $this->db = \Config\Database::connect();
    }

    public function calculateOEE($surveyId) {
        $survey = $this->db->query("SELECT * FROM production_surveys WHERE id = ?", [$surveyId])->getRow();
        
        $plannedTime = $survey->planned_production_time_minutes ?: 480;
        $downtime = $survey->downtime_minutes ?: 0;
        $availability = (($plannedTime - $downtime) / $plannedTime) * 100;
        
        $theoreticalOutput = $survey->theoretical_output ?: $survey->target_units;
        $actualOutput = $survey->units_produced ?: 0;
        $performance = $theoreticalOutput > 0 ? ($actualOutput / $theoreticalOutput) * 100 : 0;
        
        $goodUnits = $actualOutput - ($survey->defect_units ?: 0) - ($survey->scrap_quantity ?: 0);
        $quality = $actualOutput > 0 ? ($goodUnits / $actualOutput) * 100 : 0;
        
        $oee = ($availability * $performance * $quality) / 10000;
        
        $this->db->query("UPDATE production_surveys SET availability_percent = ?, performance_percent = ?, quality_percent = ?, oee_percent = ?, oee_status = ? WHERE id = ?", 
            [$availability, $performance, $quality, $oee, $this->getOEEStatus($oee), $surveyId]);
        
        return ['availability' => round($availability, 2), 'performance' => round($performance, 2), 'quality' => round($quality, 2), 'oee' => round($oee, 2), 'status' => $this->getOEEStatus($oee)];
    }

    private function getOEEStatus($oee) {
        if ($oee >= 85) return 'WorldClass';
        if ($oee >= 60) return 'Good';
        if ($oee >= 40) return 'Fair';
        return 'Poor';
    }

    public function getOEETrend($machineId, $days = 30) {
        return $this->db->query("SELECT DATE(created_at) as date, AVG(oee_percent) as avg_oee, AVG(availability_percent) as avg_availability, AVG(performance_percent) as avg_performance, AVG(quality_percent) as avg_quality FROM production_surveys WHERE machine_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date", [$machineId, $days])->getResult();
    }
}
