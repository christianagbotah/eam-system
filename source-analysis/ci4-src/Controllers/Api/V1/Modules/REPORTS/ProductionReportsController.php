<?php

namespace App\Controllers\Api\V1\Modules\REPORTS;

use App\Controllers\Api\V1\BaseResourceController;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class ProductionReportsController extends BaseResourceController
{
    protected $format = 'json';

    public function generateDataSheet()
    {
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-d');
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');

        $db = \Config\Database::connect();
        $query = $db->table('operator_production_data opd')
                   ->select('pte.work_center, pte.code, pte.units_per_day, pte.hours_per_unit_shift, 
                            pte.target_per_machine, pte.total_time_available_mins,
                            opd.*, u.username as operator_name')
                   ->join('production_targets pte', 'pte.id = opd.target_id')
                   ->join('users u', 'u.id = opd.operator_id')
                   ->where('opd.entry_date >=', $startDate)
                   ->where('opd.entry_date <=', $endDate)
                   ->orderBy('opd.entry_date', 'ASC')
                   ->get();

        $data = $query->getResultArray();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Production Data Sheet');

        // Header styling
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ];

        // TABLE 1 HEADERS - Matching CSV exactly
        $headers = [
            'A1' => 'WORK CENTER',
            'B1' => 'CODES',
            'C1' => 'Date',
            'D1' => 'Units Per Day',
            'E1' => 'Hours Per Unit Shift',
            'F1' => 'Target Per Machine',
            'G1' => 'Total Time Available (mins)',
            'H1' => 'Break (mins)',
            'I1' => 'Repair Maint. (mins)',
            'J1' => 'Input/Del. Problems (mins)',
            'K1' => 'Change Over (mins)',
            'L1' => 'Start-up (mins)',
            'M1' => 'Cleaning (mins)',
            'N1' => 'Others (mins)',
            'O1' => 'Preventive Maint. (mins)',
            'P1' => 'Total Down Time (mins)',
            'Q1' => 'Productive Time (mins)',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
            $sheet->getStyle($cell)->applyFromArray($headerStyle);
        }

        // Auto-size columns
        foreach (range('A', 'Q') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Data rows
        $row = 2;
        foreach ($data as $item) {
            $sheet->setCellValue('A' . $row, $item['work_center']);
            $sheet->setCellValue('B' . $row, $item['code']);
            $sheet->setCellValue('C' . $row, $item['entry_date']);
            $sheet->setCellValue('D' . $row, $item['units_per_day'] ?? 0);
            $sheet->setCellValue('E' . $row, $item['hours_per_unit_shift'] ?? 0);
            $sheet->setCellValue('F' . $row, $item['target_per_machine'] ?? 0);
            $sheet->setCellValue('G' . $row, $item['total_time_available_mins']);
            $sheet->setCellValue('H' . $row, $item['break_mins']);
            $sheet->setCellValue('I' . $row, $item['repair_maint_mins']);
            $sheet->setCellValue('J' . $row, $item['input_delivery_mins']);
            $sheet->setCellValue('K' . $row, $item['change_over_mins']);
            $sheet->setCellValue('L' . $row, $item['startup_mins']);
            $sheet->setCellValue('M' . $row, $item['cleaning_mins']);
            $sheet->setCellValue('N' . $row, $item['others_mins']);
            $sheet->setCellValue('O' . $row, $item['preventive_maint_mins']);
            $sheet->setCellValue('P' . $row, $item['total_downtime_mins']);
            $sheet->setCellValue('Q' . $row, $item['productive_time_mins']);
            $row++;
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Production_Data_Sheet_' . $startDate . '_to_' . $endDate . '.xlsx';
        
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        
        $writer->save('php://output');
        exit;
    }

    public function generateSummary()
    {
        $startDate = $this->request->getGet('start_date') ?? date('Y-m-d');
        $endDate = $this->request->getGet('end_date') ?? date('Y-m-d');

        $db = \Config\Database::connect();
        
        // Aggregate data by work center and date
        $query = $db->query("
            SELECT 
                pte.work_center,
                pte.code,
                opd.entry_date as report_date,
                pte.total_time_available_mins,
                SUM(opd.total_downtime_mins) as total_downtime_mins,
                SUM(opd.productive_time_mins) as productive_time_mins,
                SUM(CASE WHEN opd.shift = 'Morning' THEN opd.production_yards ELSE 0 END) as production_morning,
                SUM(CASE WHEN opd.shift = 'Afternoon' THEN opd.production_yards ELSE 0 END) as production_afternoon,
                SUM(CASE WHEN opd.shift = 'Night' THEN opd.production_yards ELSE 0 END) as production_night,
                SUM(opd.production_yards) as total_production_yards,
                pte.target_per_machine as target_yards,
                AVG(opd.utilization_actual) as utilization_actual,
                pte.utilization_standard_percent as utilization_standard,
                AVG(opd.speed_actual) as speed_actual,
                pte.speed_standard_yds_per_min as speed_standard,
                AVG(opd.productivity) as productivity,
                AVG(opd.efficiency) as efficiency
            FROM operator_production_data opd
            JOIN production_targets pte ON pte.id = opd.target_id
            WHERE opd.entry_date >= ? AND opd.entry_date <= ?
            GROUP BY pte.work_center, pte.code, opd.entry_date, pte.total_time_available_mins,
                     pte.target_per_machine, pte.utilization_standard_percent, pte.speed_standard_yds_per_min
            ORDER BY opd.entry_date ASC
        ", [$startDate, $endDate]);

        $data = $query->getResultArray();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Production Summary');

        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '70AD47']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
        ];

        // TABLE 2 HEADERS - Matching CSV exactly
        $headers = [
            'A1' => 'WORK CENTER',
            'B1' => 'CODES',
            'C1' => 'Date',
            'D1' => 'Total Time (A)',
            'E1' => 'Total Stoppages (B)',
            'F1' => 'Productive Time (C)',
            'G1' => 'Morning Production',
            'H1' => 'Afternoon Production',
            'I1' => 'Night Production',
            'J1' => 'Total Production (D)',
            'K1' => 'Target (E)',
            'L1' => 'Utilization % Actual (F)',
            'M1' => 'Utilization % Standard (G)',
            'N1' => 'Speed Actual (H)',
            'O1' => 'Speed Standard (I)',
            'P1' => 'Productivity (J)',
            'Q1' => 'Efficiency (K)',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
            $sheet->getStyle($cell)->applyFromArray($headerStyle);
        }

        foreach (range('A', 'Q') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $row = 2;
        foreach ($data as $item) {
            $sheet->setCellValue('A' . $row, $item['work_center']);
            $sheet->setCellValue('B' . $row, $item['code']);
            $sheet->setCellValue('C' . $row, $item['report_date']);
            $sheet->setCellValue('D' . $row, $item['total_time_available_mins']);
            $sheet->setCellValue('E' . $row, $item['total_downtime_mins']);
            $sheet->setCellValue('F' . $row, $item['productive_time_mins']);
            $sheet->setCellValue('G' . $row, $item['production_morning']);
            $sheet->setCellValue('H' . $row, $item['production_afternoon']);
            $sheet->setCellValue('I' . $row, $item['production_night']);
            $sheet->setCellValue('J' . $row, $item['total_production_yards']);
            $sheet->setCellValue('K' . $row, $item['target_yards']);
            $sheet->setCellValue('L' . $row, number_format($item['utilization_actual'], 2));
            $sheet->setCellValue('M' . $row, number_format($item['utilization_standard'], 2));
            $sheet->setCellValue('N' . $row, number_format($item['speed_actual'], 2));
            $sheet->setCellValue('O' . $row, number_format($item['speed_standard'], 2));
            $sheet->setCellValue('P' . $row, number_format($item['productivity'], 2));
            $sheet->setCellValue('Q' . $row, number_format($item['efficiency'], 2));
            $row++;
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Production_Summary_' . $startDate . '_to_' . $endDate . '.xlsx';
        
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        
        $writer->save('php://output');
        exit;
    }
}
