<?php

namespace App\Controllers\Api\V1\Modules\REPORTS;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\WorkOrderReportsService;

/**
 * Work Order Reports Controller
 * 
 * Enterprise-grade reporting endpoints for maintenance analytics
 * 
 * @package App\Controllers\Api\V1
 * @version 1.0.0
 */
class WorkOrderReportsController extends BaseResourceController
{
    protected $format = 'json';
    protected WorkOrderReportsService $reportsService;

    public function __construct()
    {
        $this->reportsService = new WorkOrderReportsService();
    }

    /**
     * Work Order Performance Report
     */
    public function performance()
    {
        try {
            $dateFrom = $this->request->getGet('date_from') ?? date('Y-m-01');
            $dateTo = $this->request->getGet('date_to') ?? date('Y-m-t');
            $departmentId = $this->request->getGet('department_id');

            $report = $this->reportsService->getPerformanceReport($dateFrom, $dateTo, $departmentId);

            return $this->respond([
                'status' => 'success',
                'data' => $report,
                'period' => ['from' => $dateFrom, 'to' => $dateTo]
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Labor Utilization Report
     */
    public function laborUtilization()
    {
        try {
            $dateFrom = $this->request->getGet('date_from') ?? date('Y-m-01');
            $dateTo = $this->request->getGet('date_to') ?? date('Y-m-t');

            $report = $this->reportsService->getLaborUtilizationReport($dateFrom, $dateTo);

            return $this->respond([
                'status' => 'success',
                'data' => $report
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Cost Analysis Report
     */
    public function costAnalysis()
    {
        try {
            $dateFrom = $this->request->getGet('date_from') ?? date('Y-m-01');
            $dateTo = $this->request->getGet('date_to') ?? date('Y-m-t');

            $report = $this->reportsService->getCostAnalysisReport($dateFrom, $dateTo);

            return $this->respond([
                'status' => 'success',
                'data' => $report
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * MTTR/MTBF Report
     */
    public function mttrMtbf()
    {
        try {
            $assetId = $this->request->getGet('asset_id');

            $report = $this->reportsService->getMTTRMTBFReport($assetId);

            return $this->respond([
                'status' => 'success',
                'data' => $report
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Work Order Aging Report
     */
    public function aging()
    {
        try {
            $report = $this->reportsService->getAgingReport();

            return $this->respond([
                'status' => 'success',
                'data' => $report
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Technician Performance Report
     */
    public function technicianPerformance($technicianId = null)
    {
        try {
            if (!$technicianId) {
                return $this->fail('Technician ID is required');
            }

            $dateFrom = $this->request->getGet('date_from') ?? date('Y-m-01');
            $dateTo = $this->request->getGet('date_to') ?? date('Y-m-t');

            $report = $this->reportsService->getTechnicianPerformanceReport($technicianId, $dateFrom, $dateTo);

            return $this->respond([
                'status' => 'success',
                'data' => $report
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    /**
     * Supervisor Dashboard Report
     */
    public function supervisorDashboard()
    {
        try {
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $supervisorId = $userData->user_id ?? null;

            if (!$supervisorId) {
                return $this->fail('Authentication required', 401);
            }

            $report = $this->reportsService->getSupervisorDashboard($supervisorId);

            return $this->respond([
                'status' => 'success',
                'data' => $report
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }
}
