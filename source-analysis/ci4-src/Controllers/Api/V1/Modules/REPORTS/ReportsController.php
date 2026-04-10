<?php

namespace App\Controllers\Api\V1\Modules\REPORTS;

use CodeIgniter\RESTful\ResourceController;

class ReportsController extends ResourceController
{
    protected $format = 'json';

    public function generate()
    {
        $data = $this->request->getJSON(true);
        $reportType = $data['report_type'];
        $dateRange = $data['date_range'];
        $format = $data['format'] ?? 'pdf';

        $reportData = $this->getReportData($reportType, $dateRange);

        switch ($format) {
            case 'pdf':
                return $this->generatePDF($reportType, $reportData);
            case 'excel':
                return $this->generateExcel($reportType, $reportData);
            case 'csv':
                return $this->generateCSV($reportType, $reportData);
        }
    }

    private function getReportData($type, $dateRange)
    {
        $db = \Config\Database::connect();
        $start = $dateRange['start'] ?? date('Y-m-01');
        $end = $dateRange['end'] ?? date('Y-m-d');

        switch ($type) {
            case 'work_orders':
                return $db->query("SELECT * FROM work_orders WHERE created_at BETWEEN ? AND ?", [$start, $end])->getResultArray();
            
            case 'maintenance_costs':
                return $db->query("SELECT asset_id, SUM(cost) as total_cost, COUNT(*) as wo_count FROM work_orders WHERE created_at BETWEEN ? AND ? GROUP BY asset_id", [$start, $end])->getResultArray();
            
            case 'asset_utilization':
                return $db->query("SELECT a.id, a.name, COUNT(w.id) as work_orders, AVG(TIMESTAMPDIFF(HOUR, w.created_at, w.completed_at)) as avg_completion_hours FROM assets a LEFT JOIN work_orders w ON a.id = w.asset_id WHERE w.created_at BETWEEN ? AND ? GROUP BY a.id", [$start, $end])->getResultArray();
            
            case 'pm_compliance':
                return $db->query("SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed FROM work_orders WHERE work_type='preventive' AND created_at BETWEEN ? AND ?", [$start, $end])->getResultArray();
            
            case 'inventory_movements':
                return $db->query("SELECT * FROM inventory_transactions WHERE created_at BETWEEN ? AND ?", [$start, $end])->getResultArray();
            
            default:
                return [];
        }
    }

    private function generatePDF($title, $data)
    {
        $html = "<h1>$title</h1><table border='1'><tr>";
        
        if (!empty($data)) {
            foreach (array_keys($data[0]) as $header) {
                $html .= "<th>$header</th>";
            }
            $html .= "</tr>";
            
            foreach ($data as $row) {
                $html .= "<tr>";
                foreach ($row as $cell) {
                    $html .= "<td>$cell</td>";
                }
                $html .= "</tr>";
            }
        }
        $html .= "</table>";

        return $this->response->setContentType('application/pdf')->setBody($html);
    }

    private function generateExcel($title, $data)
    {
        $csv = '';
        if (!empty($data)) {
            $csv .= implode(',', array_keys($data[0])) . "\n";
            foreach ($data as $row) {
                $csv .= implode(',', $row) . "\n";
            }
        }

        return $this->response
            ->setContentType('application/vnd.ms-excel')
            ->setHeader('Content-Disposition', 'attachment; filename="report.xls"')
            ->setBody($csv);
    }

    private function generateCSV($title, $data)
    {
        $csv = '';
        if (!empty($data)) {
            $csv .= implode(',', array_keys($data[0])) . "\n";
            foreach ($data as $row) {
                $csv .= implode(',', $row) . "\n";
            }
        }

        return $this->response
            ->setContentType('text/csv')
            ->setHeader('Content-Disposition', 'attachment; filename="report.csv"')
            ->setBody($csv);
    }

    public function schedule()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $db->table('scheduled_reports')->insert([
            'report_type' => $data['report_type'],
            'frequency' => $data['frequency'],
            'format' => $data['format'],
            'recipients' => json_encode($data['recipients']),
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respond(['status' => 'success', 'message' => 'Report scheduled']);
    }

    public function getScheduled()
    {
        $db = \Config\Database::connect();
        $reports = $db->table('scheduled_reports')->where('is_active', true)->get()->getResultArray();
        return $this->respond(['status' => 'success', 'data' => $reports]);
    }
}
