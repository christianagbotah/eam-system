<?php

namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\Api\V1\BaseApiController;

class DashboardController extends BaseApiController
{
    protected $db;

    public function initController(\CodeIgniter\HTTP\RequestInterface $request, \CodeIgniter\HTTP\ResponseInterface $response, \Psr\Log\LoggerInterface $logger)
    {
        parent::initController($request, $response, $logger);
        $this->db = \Config\Database::connect();
    }

    public function unified()
    {
        if (!$this->db) $this->db = \Config\Database::connect();
        
        try {
            $userData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = $userData->user_id ?? 1;
            $userRole = $userData->role ?? 'technician';
            $plantIds = $this->getPlantIds();
            
            $plantFilter = !empty($plantIds) ? "plant_id IN (" . implode(',', $plantIds) . ")" : "1=1";
            
            // Work Orders Stats
            $woBuilder = $this->db->table('work_orders');
            if ($userRole === 'technician') {
                $woBuilder->groupStart()
                    ->where('assigned_to', $userId)
                    ->orWhere('id IN (SELECT work_order_id FROM work_order_team_members WHERE technician_id = ' . $userId . ')')
                    ->groupEnd();
            } elseif (!empty($plantIds)) {
                $woBuilder->whereIn('plant_id', $plantIds);
            }
            
            $totalWO = $woBuilder->countAllResults(false);
            $pendingWO = $woBuilder->whereIn('status', ['requested', 'approved', 'planned'])->countAllResults(false);
            $inProgressWO = $woBuilder->where('status', 'in_progress')->countAllResults(false);
            $completedWO = $woBuilder->where('status', 'completed')->countAllResults();
            
            // Assets Stats
            $assetsBuilder = $this->db->table('assets_unified');
            if (!empty($plantIds)) {
                $assetsBuilder->whereIn('plant_id', $plantIds);
            }
            $totalAssets = $assetsBuilder->countAllResults(false);
            $activeAssets = $assetsBuilder->where('status', 'active')->countAllResults(false);
            $maintenanceAssets = $assetsBuilder->whereIn('status', ['maintenance', 'down'])->countAllResults();
            
            // Inventory Stats
            $totalInventory = $this->db->table('inventory')->countAllResults(false);
            $lowStock = $this->db->table('inventory')
                ->where('quantity <=', 'reorder_level', false)
                ->countAllResults(false);
            $outOfStock = $this->db->table('inventory')->where('quantity', 0)->countAllResults();
            
            // Production Stats
            $oeeQuery = $this->db->query("
                SELECT AVG(oee_percentage) as avg_oee
                FROM production_runs
                WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $oee = $oeeQuery->getRow()->avg_oee ?? 82;
            
            $efficiencyQuery = $this->db->query("
                SELECT AVG(efficiency_percentage) as avg_efficiency
                FROM production_runs
                WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ");
            $efficiency = $efficiencyQuery->getRow()->avg_efficiency ?? 87;
            
            return $this->respond([
                'status' => 'success',
                'data' => [
                    'workOrders' => [
                        'total' => (int)$totalWO,
                        'pending' => (int)$pendingWO,
                        'inProgress' => (int)$inProgressWO,
                        'completed' => (int)$completedWO
                    ],
                    'assets' => [
                        'total' => (int)$totalAssets,
                        'active' => (int)$activeAssets,
                        'maintenance' => (int)$maintenanceAssets
                    ],
                    'inventory' => [
                        'total' => (int)$totalInventory,
                        'lowStock' => (int)$lowStock,
                        'outOfStock' => (int)$outOfStock
                    ],
                    'production' => [
                        'oee' => round($oee, 1),
                        'efficiency' => round($efficiency, 1),
                        'downtime' => 3.5
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Unified dashboard error: ' . $e->getMessage());
            return $this->failServerError('Failed to fetch unified dashboard data');
        }
    }

    public function stats()
    {
        if (!$this->db) $this->db = \Config\Database::connect();
        try {
            $plantIds = $this->getPlantIds();
            error_log('Dashboard stats - Plant IDs: ' . json_encode($plantIds));
            
            // If no plant selected, get first accessible plant
            if (empty($plantIds)) {
                $allPlants = $this->getAllAccessiblePlantIds();
                if (!empty($allPlants)) {
                    $plantIds = [$allPlants[0]];
                    session()->set('default_plant_id', $allPlants[0]);
                }
            }
            
            $plantFilter = !empty($plantIds) ? "plant_id IN (" . implode(',', $plantIds) . ")" : "1=1";
            error_log('Dashboard stats - Plant filter: ' . $plantFilter);
            
            // Total Assets
            $totalAssets = $this->db->table('assets_unified')
                ->where($plantFilter, null, false)
                ->countAllResults();
            
            // Active Work Orders
            $activeWorkOrders = $this->db->table('work_orders')
                ->where($plantFilter, null, false)
                ->whereIn('status', ['requested', 'approved', 'planned', 'assigned', 'in_progress'])
                ->countAllResults();
            
            // Overdue Work Orders
            $overdueWorkOrders = $this->db->table('work_orders')
                ->where($plantFilter, null, false)
                ->where('planned_end <', date('Y-m-d H:i:s'))
                ->whereNotIn('status', ['completed', 'closed', 'cancelled'])
                ->where('planned_end IS NOT NULL')
                ->countAllResults();
            
            // Completed Today
            $completedToday = $this->db->table('work_orders')
                ->where($plantFilter, null, false)
                ->where('status', 'completed')
                ->where('DATE(actual_end)', date('Y-m-d'))
                ->countAllResults();
            // MTBF Calculation
            $mtbfQuery = $this->db->query("
                SELECT AVG(time_between_failures) as avg_mtbf FROM (
                    SELECT 
                        asset_id,
                        TIMESTAMPDIFF(HOUR, 
                            LAG(actual_end) OVER (PARTITION BY asset_id ORDER BY actual_end),
                            actual_end
                        ) as time_between_failures
                    FROM work_orders 
                    WHERE type IN ('breakdown', 'corrective')
                    AND status = 'completed'
                    AND actual_end IS NOT NULL
                    AND actual_end >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                    AND {$plantFilter}
                ) as mtbf_data
                WHERE time_between_failures IS NOT NULL
            ");
            $avgMTBF = $mtbfQuery->getRow()->avg_mtbf ?? 0;
            
            // MTTR Calculation
            $mttrQuery = $this->db->query("
                SELECT AVG(TIMESTAMPDIFF(HOUR, actual_start, actual_end)) as avg_mttr
                FROM work_orders 
                WHERE status = 'completed'
                AND actual_start IS NOT NULL
                AND actual_end IS NOT NULL
                AND type IN ('breakdown', 'corrective')
                AND actual_end >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND {$plantFilter}
            ");
            $avgMTTR = $mttrQuery->getRow()->avg_mttr ?? 0;
            
            // OEE from production data
            $oeeQuery = $this->db->query("
                SELECT 
                    AVG(CASE 
                        WHEN TIMESTAMPDIFF(HOUR, start_time, end_time) > 0 
                        THEN (produced_qty / TIMESTAMPDIFF(HOUR, start_time, end_time)) * 10
                        ELSE 0 
                    END) as avg_oee
                FROM production_runs 
                WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                AND end_time IS NOT NULL
                AND produced_qty > 0
                AND {$plantFilter}
            ");
            $oee = $oeeQuery->getRow()->avg_oee ?? 0;
            
            // System Uptime
            $uptimeQuery = $this->db->query("
                SELECT 
                    (COUNT(CASE WHEN status = 'active' THEN 1 END) / COUNT(*)) * 100 as uptime
                FROM assets_unified 
                WHERE status IN ('active', 'maintenance', 'inactive')
                AND {$plantFilter}
            ");
            $uptime = $uptimeQuery->getRow()->uptime ?? 0;
            // Performance Improvements
            $currentPeriodCompletion = $this->db->query("
                SELECT 
                    (COUNT(CASE WHEN actual_end <= planned_end THEN 1 END) / COUNT(*)) * 100 as rate
                FROM work_orders 
                WHERE status = 'completed'
                AND actual_end >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND planned_end IS NOT NULL
                AND {$plantFilter}
            ")->getRow()->rate ?? 0;
            
            $previousPeriodCompletion = $this->db->query("
                SELECT 
                    (COUNT(CASE WHEN actual_end <= planned_end THEN 1 END) / COUNT(*)) * 100 as rate
                FROM work_orders 
                WHERE status = 'completed'
                AND actual_end >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                AND actual_end < DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND planned_end IS NOT NULL
                AND {$plantFilter}
            ")->getRow()->rate ?? 0;
            
            $completionImprovement = $previousPeriodCompletion > 0 ? 
                $currentPeriodCompletion - $previousPeriodCompletion : 0;
            
            $data = [
                'totalAssets' => (int)$totalAssets,
                'activeWorkOrders' => (int)$activeWorkOrders,
                'overdueWorkOrders' => (int)$overdueWorkOrders,
                'completedToday' => (int)$completedToday,
                'avgMTBF' => round($avgMTBF, 1),
                'avgMTTR' => round($avgMTTR, 1),
                'oee' => round($oee, 1),
                'uptime' => round($uptime, 1),
                'assetGrowth' => 0,
                'workOrderReduction' => 0,
                'completionImprovement' => round($completionImprovement, 1),
                'mtbfImprovement' => 0,
                'mttrImprovement' => 0
            ];

            return $this->respond([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Dashboard stats error: ' . $e->getMessage());
            return $this->failServerError('Failed to fetch dashboard statistics');
        }
    }

    public function admin()
    {
        // Initialize database connection
        if (!$this->db) {
            $this->db = \Config\Database::connect();
        }
        
        try {
            $plantIds = $this->getPlantIds();
            error_log('Dashboard admin - Plant IDs: ' . json_encode($plantIds));
            
            // If no plant selected, get first accessible plant
            if (empty($plantIds)) {
                $allPlants = $this->getAllAccessiblePlantIds();
                if (!empty($allPlants)) {
                    $plantIds = [$allPlants[0]];
                    session()->set('default_plant_id', $allPlants[0]);
                }
            }
            
            $plantFilter = !empty($plantIds) ? "wo.plant_id IN (" . implode(',', $plantIds) . ")" : "1=1";
            error_log('Dashboard admin - Plant filter: ' . $plantFilter);
            
            $recentActivity = [];
            
            // Recent work order completions
            $completedOrders = $this->db->table('work_orders wo')
                ->select('wo.wo_number as work_order_number, wo.actual_end, au.asset_name, wo.type')
                ->join('assets_unified au', 'au.id = wo.asset_id', 'left')
                ->where('wo.status', 'completed')
                ->where('wo.actual_end >=', date('Y-m-d H:i:s', strtotime('-7 days')))
                ->where($plantFilter, null, false)
                ->orderBy('wo.actual_end', 'DESC')
                ->limit(2)
                ->get()->getResultArray();
            
            foreach ($completedOrders as $order) {
                $recentActivity[] = [
                    'type' => 'success',
                    'message' => "Work Order #{$order['work_order_number']} completed for {$order['asset_name']}",
                    'time' => $this->timeAgo($order['actual_end'])
                ];
            }
            
            // Recently created work orders
            $newOrders = $this->db->table('work_orders wo')
                ->select('wo.wo_number as work_order_number, wo.created_at, au.asset_name, wo.type')
                ->join('assets_unified au', 'au.id = wo.asset_id', 'left')
                ->where('wo.created_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))
                ->where($plantFilter, null, false)
                ->orderBy('wo.created_at', 'DESC')
                ->limit(2)
                ->get()->getResultArray();
            
            foreach ($newOrders as $order) {
                $recentActivity[] = [
                    'type' => 'info',
                    'message' => "New {$order['type']} work order #{$order['work_order_number']} created for {$order['asset_name']}",
                    'time' => $this->timeAgo($order['created_at'])
                ];
            }
            // Critical work orders
            $criticalOrders = $this->db->table('work_orders wo')
                ->select('wo.wo_number as work_order_number, wo.created_at, au.asset_name, wo.priority, wo.type')
                ->join('assets_unified au', 'au.id = wo.asset_id', 'left')
                ->where($plantFilter, null, false)
                ->groupStart()
                    ->where('wo.priority', 'critical')
                    ->orWhere('wo.type', 'breakdown')
                ->groupEnd()
                ->whereIn('wo.status', ['requested', 'approved', 'assigned', 'in_progress'])
                ->where('wo.created_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))
                ->orderBy('wo.created_at', 'DESC')
                ->limit(2)
                ->get()->getResultArray();
            
            foreach ($criticalOrders as $order) {
                $recentActivity[] = [
                    'type' => 'error',
                    'message' => "Critical {$order['type']} work order for {$order['asset_name']}",
                    'time' => $this->timeAgo($order['created_at'])
                ];
            }
            // Overdue work orders
            $overdueOrders = $this->db->table('work_orders wo')
                ->select('wo.wo_number as work_order_number, wo.planned_end, au.asset_name')
                ->join('assets_unified au', 'au.id = wo.asset_id', 'left')
                ->where('wo.planned_end <', date('Y-m-d H:i:s'))
                ->whereNotIn('wo.status', ['completed', 'closed', 'cancelled'])
                ->where('wo.planned_end IS NOT NULL')
                ->where($plantFilter, null, false)
                ->orderBy('wo.planned_end', 'ASC')
                ->limit(2)
                ->get()->getResultArray();
            
            foreach ($overdueOrders as $order) {
                $recentActivity[] = [
                    'type' => 'warning',
                    'message' => "Work Order #{$order['work_order_number']} overdue for {$order['asset_name']}",
                    'time' => $this->timeAgo($order['planned_end'])
                ];
            }
            
            // Sort by timestamp and limit to 8 most recent
            $recentActivity = array_slice($recentActivity, 0, 8);
            
            $data = [
                'recentActivity' => $recentActivity
            ];

            return $this->respond([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Admin dashboard error: ' . $e->getMessage());
            log_message('error', 'Stack trace: ' . $e->getTraceAsString());
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to fetch admin dashboard data',
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ], 500);
        }
    }
    
    private function timeAgo($datetime)
    {
        $time = time() - strtotime($datetime);
        
        if ($time < 60) return 'just now';
        if ($time < 3600) return floor($time/60) . ' min ago';
        if ($time < 86400) return floor($time/3600) . ' hour' . (floor($time/3600) > 1 ? 's' : '') . ' ago';
        return floor($time/86400) . ' day' . (floor($time/86400) > 1 ? 's' : '') . ' ago';
    }

    public function supervisor()
    {
        // Initialize database connection
        if (!$this->db) {
            $this->db = \Config\Database::connect();
        }
        
        try {
            $userData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = $userData->user_id ?? 1;
            
            // Get supervisor's department
            $supervisor = $this->db->table('users')->where('id', $userId)->get()->getRowArray();
            $departmentId = $supervisor['department_id'] ?? null;
            
            // Get work orders assigned to supervisor's team
            $teamWorkOrders = $this->db->table('work_orders wo')
                ->join('users u', 'u.id = wo.assigned_to', 'left')
                ->where('u.supervisor_id', $userId)
                ->whereIn('wo.status', ['open', 'in_progress', 'assigned'])
                ->countAllResults();
            
            // Get pending maintenance requests from department members
            $pendingApprovals = $this->db->table('maintenance_requests mr')
                ->join('users u', 'u.id = mr.created_by', 'left')
                ->groupStart()
                    ->where('u.department_id', $departmentId)
                    ->orWhere('u.supervisor_id', $userId)
                ->groupEnd()
                ->whereIn('mr.workflow_status', ['pending', 'supervisor_review'])
                ->countAllResults();
            
            // Calculate team efficiency
            $efficiencyQuery = $this->db->query("
                SELECT 
                    AVG(CASE WHEN wo.actual_end <= wo.planned_end THEN 100 ELSE 50 END) as efficiency
                FROM work_orders wo
                JOIN users u ON u.id = wo.assigned_to
                WHERE u.supervisor_id = ? 
                AND wo.status = 'completed'
                AND wo.actual_end >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND wo.planned_end IS NOT NULL
            ", [$userId]);
            $teamEfficiency = $efficiencyQuery->getRow()->efficiency ?? 0;
            
            $data = [
                'teamWorkOrders' => (int)$teamWorkOrders,
                'pendingApprovals' => (int)$pendingApprovals,
                'teamEfficiency' => round($teamEfficiency, 1)
            ];

            return $this->respond([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Supervisor dashboard error: ' . $e->getMessage());
            return $this->failServerError('Failed to fetch supervisor dashboard: ' . $e->getMessage());
        }
    }

    public function technician()
    {
        if (!$this->db) $this->db = \Config\Database::connect();
        try {
            $userData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = $userData->user_id ?? $userData->id ?? 1;
            
            log_message('debug', 'Technician dashboard - userId: ' . $userId);
            
            // Get work orders assigned to technician (either via assigned_to or team_members)
            $assignedWorkOrders = $this->db->query("
                SELECT COUNT(DISTINCT wo.id) as count
                FROM work_orders wo
                LEFT JOIN work_order_team_members wotm ON wotm.work_order_id = wo.id
                WHERE (wo.assigned_to = ? OR wotm.technician_id = ?)
                AND wo.status IN ('open', 'in_progress', 'assigned')
            ", [$userId, $userId])->getRow()->count ?? 0;
            
            log_message('debug', 'Assigned work orders: ' . $assignedWorkOrders);
            
            // Get in progress
            $inProgress = $this->db->query("
                SELECT COUNT(DISTINCT wo.id) as count
                FROM work_orders wo
                LEFT JOIN work_order_team_members wotm ON wotm.work_order_id = wo.id
                WHERE (wo.assigned_to = ? OR wotm.technician_id = ?)
                AND wo.status = 'in_progress'
            ", [$userId, $userId])->getRow()->count ?? 0;
            
            // Get completed today by technician
            $completedToday = $this->db->query("
                SELECT COUNT(DISTINCT wo.id) as count
                FROM work_orders wo
                LEFT JOIN work_order_team_members wotm ON wotm.work_order_id = wo.id
                WHERE (wo.assigned_to = ? OR wotm.technician_id = ?)
                AND wo.status = 'completed'
                AND DATE(wo.actual_end) = CURDATE()
            ", [$userId, $userId])->getRow()->count ?? 0;
            
            // Get overdue
            $overdue = $this->db->query("
                SELECT COUNT(DISTINCT wo.id) as count
                FROM work_orders wo
                LEFT JOIN work_order_team_members wotm ON wotm.work_order_id = wo.id
                WHERE (wo.assigned_to = ? OR wotm.technician_id = ?)
                AND wo.planned_end < NOW()
                AND wo.status NOT IN ('completed', 'closed', 'cancelled')
                AND wo.planned_end IS NOT NULL
            ", [$userId, $userId])->getRow()->count ?? 0;
            
            $data = [
                'assigned' => (int)$assignedWorkOrders,
                'in_progress' => (int)$inProgress,
                'completed_today' => (int)$completedToday,
                'overdue' => (int)$overdue
            ];
            
            log_message('debug', 'Technician dashboard data: ' . json_encode($data));

            return $this->respond([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Technician dashboard error: ' . $e->getMessage());
            return $this->failServerError('Failed to fetch technician dashboard: ' . $e->getMessage());
        }
    }

    public function operator()
    {
        // Initialize database connection
        if (!$this->db) {
            $this->db = \Config\Database::connect();
        }
        
        try {
            $userId = $this->request->getHeaderLine('User-ID') ?? 1;
            
            // Get production targets for operator's shift
            $productionTargets = $this->db->table('production_targets pt')
                ->join('shifts s', 's.id = pt.shift_id')
                ->where('s.operator_id', $userId)
                ->where('pt.target_date', date('Y-m-d'))
                ->countAllResults();
            
            // Calculate quality metrics from production runs
            $qualityQuery = $this->db->query("
                SELECT AVG(quality_percentage) as avg_quality
                FROM production_runs pr
                JOIN shifts s ON s.id = pr.shift_id
                WHERE s.operator_id = ?
                AND pr.run_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            ", [$userId]);
            $qualityMetrics = $qualityQuery->getRow()->avg_quality ?? 95;
            
            // Get equipment status for operator's assigned assets
            $equipmentQuery = $this->db->table('assets a')
                ->join('asset_assignments aa', 'aa.asset_id = a.id')
                ->where('aa.user_id', $userId)
                ->where('aa.assignment_type', 'operator')
                ->where('a.status', 'operational')
                ->countAllResults();
            
            $totalAssigned = $this->db->table('assets a')
                ->join('asset_assignments aa', 'aa.asset_id = a.id')
                ->where('aa.user_id', $userId)
                ->where('aa.assignment_type', 'operator')
                ->countAllResults();
            
            $equipmentStatus = $totalAssigned > 0 && $equipmentQuery == $totalAssigned ? 'operational' : 'mixed';
            
            $data = [
                'productionTargets' => (int)$productionTargets,
                'qualityMetrics' => round($qualityMetrics, 1),
                'equipmentStatus' => $equipmentStatus
            ];

            return $this->respond([
                'status' => 'success',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch operator dashboard: ' . $e->getMessage());
        }
    }

    public function planner()
    {
        if (!$this->db) $this->db = \Config\Database::connect();
        try {
            $userData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = $userData->user_id ?? 1;
            $plantIds = $this->getPlantIds();
            
            // Pending maintenance requests - assigned to this planner and not yet converted to work order
            $pendingRequests = 0;
            try {
                $pendingRequests = $this->db->table('maintenance_requests')
                    ->where('assigned_planner_id', $userId)
                    ->where('work_order_id IS NULL', null, false)
                    ->countAllResults();
            } catch (\Exception $e) {
                log_message('error', 'Pending requests query: ' . $e->getMessage());
            }
            
            // Scheduled PM work orders
            $scheduledPM = 0;
            try {
                $builder = $this->db->table('work_orders');
                if (!empty($plantIds)) {
                    $builder->whereIn('plant_id', $plantIds);
                }
                $scheduledPM = $builder
                    ->where('type', 'preventive')
                    ->whereIn('status', ['planned', 'scheduled'])
                    ->countAllResults();
            } catch (\Exception $e) {
                log_message('error', 'Scheduled PM query: ' . $e->getMessage());
            }
            
            // Work orders in progress
            $inProgressWO = 0;
            try {
                $builder = $this->db->table('work_orders');
                if (!empty($plantIds)) {
                    $builder->whereIn('plant_id', $plantIds);
                }
                $inProgressWO = $builder
                    ->where('status', 'in_progress')
                    ->countAllResults();
            } catch (\Exception $e) {
                log_message('error', 'In progress WO query: ' . $e->getMessage());
            }
            
            // PM tasks due
            $pmTasksDue = 0;
            try {
                if ($this->db->tableExists('pm_schedules')) {
                    $pmTasksDue = $this->db->table('pm_schedules')
                        ->where('due_date <=', date('Y-m-d', strtotime('+7 days')))
                        ->where('status', 'scheduled')
                        ->countAllResults();
                }
            } catch (\Exception $e) {
                log_message('error', 'PM tasks query: ' . $e->getMessage());
            }
            
            // Completed today
            $completedToday = 0;
            try {
                $builder = $this->db->table('work_orders');
                if (!empty($plantIds)) {
                    $builder->whereIn('plant_id', $plantIds);
                }
                $completedToday = $builder
                    ->where('status', 'completed')
                    ->where('DATE(actual_end)', date('Y-m-d'))
                    ->countAllResults();
            } catch (\Exception $e) {
                log_message('error', 'Completed today query: ' . $e->getMessage());
            }
            
            // Critical assets
            $criticalAssets = 0;
            try {
                $builder = $this->db->table('assets_unified');
                if (!empty($plantIds)) {
                    $builder->whereIn('plant_id', $plantIds);
                }
                $criticalAssets = $builder
                    ->whereIn('status', ['down', 'maintenance'])
                    ->countAllResults();
            } catch (\Exception $e) {
                log_message('error', 'Critical assets query: ' . $e->getMessage());
            }
            
            // Active targets
            $activeTargets = 0;
            try {
                if ($this->db->tableExists('production_targets')) {
                    $activeTargets = $this->db->table('production_targets')
                        ->where('target_date', date('Y-m-d'))
                        ->countAllResults();
                }
            } catch (\Exception $e) {
                log_message('error', 'Production targets query: ' . $e->getMessage());
            }
            
            // Calculate average efficiency from completed work orders
            $avgEfficiency = 0;
            try {
                $builder = $this->db->table('work_orders');
                if (!empty($plantIds)) {
                    $builder->whereIn('plant_id', $plantIds);
                }
                $efficiencyQuery = $builder
                    ->select('AVG(CASE WHEN actual_end <= planned_end THEN 100 ELSE 50 END) as efficiency')
                    ->where('status', 'completed')
                    ->where('actual_end >=', date('Y-m-d', strtotime('-30 days')))
                    ->where('planned_end IS NOT NULL')
                    ->where('actual_end IS NOT NULL')
                    ->get();
                $avgEfficiency = $efficiencyQuery->getRow()->efficiency ?? 0;
            } catch (\Exception $e) {
                log_message('error', 'Efficiency query: ' . $e->getMessage());
            }
            
            // Overdue work orders
            $overdueWO = 0;
            try {
                $builder = $this->db->table('work_orders');
                if (!empty($plantIds)) {
                    $builder->whereIn('plant_id', $plantIds);
                }
                $overdueWO = $builder
                    ->where('planned_end <', date('Y-m-d H:i:s'))
                    ->whereNotIn('status', ['completed', 'closed', 'cancelled'])
                    ->where('planned_end IS NOT NULL')
                    ->countAllResults();
            } catch (\Exception $e) {
                log_message('error', 'Overdue WO query: ' . $e->getMessage());
            }
            
            // Recent Activity
            $recentActivity = [];
            try {
                $plantFilter = !empty($plantIds) ? 'wo.plant_id IN (' . implode(',', $plantIds) . ')' : '1=1';
                
                // Recent work order creations
                $builder = $this->db->table('work_orders wo')
                    ->select('wo.work_order_number, wo.created_at, wo.title, wo.type')
                    ->where('wo.created_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))
                    ->where($plantFilter, null, false)
                    ->orderBy('wo.created_at', 'DESC')
                    ->limit(2);
                $newOrders = $builder->get()->getResultArray();
                
                foreach ($newOrders as $order) {
                    $recentActivity[] = [
                        'type' => 'wo',
                        'color' => 'blue',
                        'title' => 'Work Order Created',
                        'description' => "WO #{$order['work_order_number']}: {$order['title']}",
                        'time' => $order['created_at']
                    ];
                }
                
                // Recent completions
                $builder = $this->db->table('work_orders wo')
                    ->select('wo.work_order_number, wo.actual_end, wo.title')
                    ->where('wo.status', 'completed')
                    ->where('wo.actual_end >=', date('Y-m-d H:i:s', strtotime('-7 days')))
                    ->where($plantFilter, null, false)
                    ->orderBy('wo.actual_end', 'DESC')
                    ->limit(2);
                $completedOrders = $builder->get()->getResultArray();
                
                foreach ($completedOrders as $order) {
                    $recentActivity[] = [
                        'type' => 'wo',
                        'color' => 'green',
                        'title' => 'Work Order Completed',
                        'description' => "WO #{$order['work_order_number']}: {$order['title']}",
                        'time' => $order['actual_end']
                    ];
                }
                
                // Recent production targets
                try {
                    if ($this->db->tableExists('production_targets')) {
                        $targets = $this->db->table('production_targets pt')
                            ->select('pt.created_at, pt.units_per_day, pt.target_date')
                            ->where('pt.created_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))
                            ->orderBy('pt.created_at', 'DESC')
                            ->limit(2)
                            ->get()->getResultArray();
                        
                        foreach ($targets as $target) {
                            $recentActivity[] = [
                                'type' => 'target',
                                'color' => 'purple',
                                'title' => 'Production Target Set',
                                'description' => "Target: {$target['units_per_day']} units/day for " . date('M d', strtotime($target['target_date'])),
                                'time' => $target['created_at']
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    log_message('error', 'Production targets activity query: ' . $e->getMessage());
                }
                
                // Recent maintenance requests converted
                $requests = $this->db->table('maintenance_requests mr')
                    ->select('mr.request_number, mr.updated_at, mr.title')
                    ->where('mr.assigned_planner_id', $userId)
                    ->where('mr.work_order_id IS NOT NULL', null, false)
                    ->where('mr.updated_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))
                    ->orderBy('mr.updated_at', 'DESC')
                    ->limit(2)
                    ->get()->getResultArray();
                
                foreach ($requests as $req) {
                    $recentActivity[] = [
                        'type' => 'request',
                        'color' => 'orange',
                        'title' => 'Request Converted to WO',
                        'description' => "Request #{$req['request_number']}: {$req['title']}",
                        'time' => $req['updated_at']
                    ];
                }
                
                // Sort by time and limit to 5
                usort($recentActivity, function($a, $b) {
                    return strtotime($b['time']) - strtotime($a['time']);
                });
                $recentActivity = array_slice($recentActivity, 0, 5);
            } catch (\Exception $e) {
                log_message('error', 'Recent activity query: ' . $e->getMessage());
            }
            
            return $this->respond([
                'status' => 'success',
                'data' => [
                    'pendingRequests' => (int)$pendingRequests,
                    'scheduledPM' => (int)$scheduledPM,
                    'inProgressWO' => (int)$inProgressWO,
                    'pmTasksDue' => (int)$pmTasksDue,
                    'completedToday' => (int)$completedToday,
                    'criticalAssets' => (int)$criticalAssets,
                    'activeTargets' => (int)$activeTargets,
                    'workOrders' => (int)$inProgressWO,
                    'overdueWO' => (int)$overdueWO,
                    'avgEfficiency' => round($avgEfficiency, 1),
                    'recentActivity' => $recentActivity
                ]
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Planner dashboard error: ' . $e->getMessage());
            return $this->respond([
                'status' => 'success',
                'data' => [
                    'pendingRequests' => 0,
                    'scheduledPM' => 0,
                    'inProgressWO' => 0,
                    'pmTasksDue' => 0,
                    'completedToday' => 0,
                    'criticalAssets' => 0,
                    'activeTargets' => 0,
                    'workOrders' => 0,
                    'overdueWO' => 0,
                    'avgEfficiency' => 0,
                    'recentActivity' => []
                ]
            ]);
        }
    }
}
