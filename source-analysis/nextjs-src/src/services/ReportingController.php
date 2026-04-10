<?php

namespace App\Controllers\Api\V1;

use CodeIgniter\RESTful\ResourceController;
use App\Services\MaintenanceCostService;

class ReportingController extends ResourceController
{
    protected $format = 'json';
    protected $costService;
    
    public function __construct()
    {
        $this->costService = new MaintenanceCostService();
    }
    
    /**
     * Get dashboard widget data
     */
    public function getDashboardWidget($widgetCode = null)
    {
        try {
            $db = \Config\Database::connect();
            
            switch ($widgetCode) {
                case 'OPEN_WO_COUNT':
                    $query = "SELECT COUNT(*) as value FROM work_orders WHERE status IN ('open', 'in_progress')";
                    break;
                    
                case 'SLA_BREACHES':
                    $query = "SELECT COUNT(*) as value FROM work_orders 
                             WHERE status IN ('open', 'in_progress') 
                             AND DATE_ADD(created_at, INTERVAL sla_repair_hours HOUR) < NOW()";
                    break;
                    
                case 'DOWNTIME_COST_TODAY':
                    $query = "SELECT COALESCE(SUM(downtime_cost_total), 0) as value 
                             FROM work_orders WHERE DATE(created_at) = CURDATE()";
                    break;
                    
                case 'PLANT_RISK_INDEX':
                    $query = "CALL GetPlantRiskIndex(@risk_index); SELECT @risk_index as value";
                    break;
                    
                case 'MAINTENANCE_SPEND':
                    $query = "SELECT DATE_FORMAT(created_at, '%Y-%m') as name, 
                                    SUM(total_maintenance_cost) as value 
                             FROM work_orders 
                             WHERE status = 'completed' 
                             AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH) 
                             GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
                             ORDER BY name";
                    break;
                    
                default:
                    return $this->failNotFound('Widget not found');
            }
            
            $result = $db->query($query);
            
            if ($widgetCode === 'MAINTENANCE_SPEND') {
                $data = $result->getResultArray();
            } else {
                $data = $result->getRow();
            }
            
            return $this->respond([
                'success' => true,
                'data' => $data,
                'timestamp' => date('c')
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch widget data: ' . $e->getMessage());
        }
    }
    
    /**
     * Generate report
     */
    public function generateReport()
    {
        try {
            $reportCode = $this->request->getGet('report_code');
            $format = $this->request->getGet('format') ?? 'json';
            
            if (!$reportCode) {
                return $this->failValidationError('Report code is required');
            }
            
            $db = \Config\Database::connect();
            
            // Get report definition
            $reportDef = $db->table('report_definitions')
                           ->where('report_code', $reportCode)
                           ->where('is_active', 1)
                           ->get()
                           ->getRow();
            
            if (!$reportDef) {
                return $this->failNotFound('Report definition not found');
            }
            
            // Execute report query
            $data = $db->query($reportDef->sql_query)->getResultArray();
            
            if ($format === 'json') {
                return $this->respond([
                    'success' => true,
                    'report_name' => $reportDef->report_name,
                    'data' => $data,
                    'generated_at' => date('c')
                ]);
            }
            
            // For file exports, return data for frontend processing
            return $this->respond([
                'success' => true,
                'report_name' => $reportDef->report_name,
                'data' => $data,
                'format' => $format
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to generate report: ' . $e->getMessage());
        }
    }
    
    /**
     * Get financial summary
     */
    public function getFinancialSummary()
    {
        try {
            $period = $this->request->getGet('period') ?? 'monthly';
            $db = \Config\Database::connect();
            
            $data = $db->table('vw_financial_summary')
                      ->orderBy('month', 'DESC')
                      ->limit(12)
                      ->get()
                      ->getResultArray();
            
            return $this->respond([
                'success' => true,
                'data' => $data,
                'period' => $period
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch financial summary: ' . $e->getMessage());
        }
    }
    
    /**
     * Get SLA performance
     */
    public function getSLAPerformance()
    {
        try {
            $days = $this->request->getGet('days') ?? 30;
            $db = \Config\Database::connect();
            
            $data = $db->table('vw_sla_performance')
                      ->where('date >=', date('Y-m-d', strtotime("-{$days} days")))
                      ->orderBy('date', 'DESC')
                      ->get()
                      ->getResultArray();
            
            return $this->respond([
                'success' => true,
                'data' => $data,
                'days' => $days
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch SLA performance: ' . $e->getMessage());
        }
    }
    
    /**
     * Get asset reliability
     */
    public function getAssetReliability($assetId = null)
    {
        try {
            $db = \Config\Database::connect();
            
            $builder = $db->table('vw_asset_reliability_metrics');
            
            if ($assetId) {
                $builder->where('asset_id', $assetId);
            }
            
            $data = $builder->orderBy('total_maintenance_cost', 'DESC')
                           ->limit(20)
                           ->get()
                           ->getResultArray();
            
            return $this->respond([
                'success' => true,
                'data' => $data,
                'asset_id' => $assetId
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch asset reliability: ' . $e->getMessage());
        }
    }
    
    /**
     * Get downtime cost analysis
     */
    public function getDowntimeCostAnalysis()
    {
        try {
            $period = $this->request->getGet('period') ?? 'monthly';
            $db = \Config\Database::connect();
            
            $data = $db->table('vw_downtime_cost_analysis')
                      ->orderBy('total_production_loss', 'DESC')
                      ->limit(50)
                      ->get()
                      ->getResultArray();
            
            return $this->respond([
                'success' => true,
                'data' => $data,
                'period' => $period
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch downtime analysis: ' . $e->getMessage());
        }
    }
    
    /**
     * Calculate work order costs
     */
    public function calculateWorkOrderCosts($workOrderId = null)
    {
        try {
            if (!$workOrderId) {
                return $this->failValidationError('Work order ID is required');
            }
            
            $costs = $this->costService->calculateWorkOrderCosts($workOrderId);
            
            return $this->respond([
                'success' => true,
                'work_order_id' => $workOrderId,
                'costs' => $costs,
                'calculated_at' => date('c')
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to calculate costs: ' . $e->getMessage());
        }
    }
    
    /**
     * Get cost breakdown
     */
    public function getCostBreakdown($workOrderId = null)
    {
        try {
            if (!$workOrderId) {
                return $this->failValidationError('Work order ID is required');
            }
            
            $breakdown = $this->costService->getCostBreakdown($workOrderId);
            
            return $this->respond([
                'success' => true,
                'work_order_id' => $workOrderId,
                'breakdown' => $breakdown
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to get cost breakdown: ' . $e->getMessage());
        }
    }
}