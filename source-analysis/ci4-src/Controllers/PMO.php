<?php

namespace App\Controllers;

use App\Models\PmWorkOrderModel;
use App\Models\PmScheduleNewModel;
use App\Models\MaintenanceFindingModel;
use App\Models\UserModel;
use App\Models\PartsModel;
use App\Models\EquipmentModel;
use App\Models\AssemblyModel;
use App\Models\PmPartTaskModel;
use App\Models\MaintenanceChecklistModel;
use App\Models\PartChecklistTemplateModel;

class PMO extends BaseController
{
    protected $workOrderModel;
    protected $scheduleModel;
    protected $findingModel;
    protected $userModel;
    protected $partsModel;
    protected $equipmentModel;
    protected $assemblyModel;

    public function __construct()
    {
        $this->workOrderModel = new PmWorkOrderModel();
        $this->scheduleModel = new PmScheduleNewModel();
        $this->findingModel = new MaintenanceFindingModel();
        $this->userModel = new UserModel();
        $this->partsModel = new PartsModel();
        $this->equipmentModel = new EquipmentModel();
        $this->assemblyModel = new AssemblyModel();
        
        helper(['form']);
        
        if (!session()->get('isLoggedIn')) {
            header('Location: ' . base_url('auth/login'));
            exit();
        }
    }

    public function index()
    {
        $data = [
            'workOrders' => $this->workOrderModel->orderBy('scheduled_date', 'DESC')->findAll(),
            'equipmentModel' => $this->equipmentModel,
            'partsModel' => $this->partsModel,
            'userModel' => $this->userModel
        ];
        return view('backend/pmo/index', $data);
    }

    public function dashboard()
    {
        $db = db_connect();
        $dueSchedules = $db->query("
            SELECT ps.*, e.id as equipment_id, p.id as part_id, p.assembly_id,
                   ppt.task_name, ppt.pm_inspection_type_id as inspection_id,
                   ppt.frequency_value, pit.inspection_name
            FROM pm_schedules ps
            JOIN pm_part_tasks ppt ON ps.part_task_id = ppt.id
            JOIN parts p ON ppt.part_id = p.id
            JOIN equipment e ON p.equipment_id = e.id
            LEFT JOIN pm_inspection_type pit ON ppt.pm_inspection_type_id = pit.inspection_id
            WHERE ps.next_due_date <= CURDATE()
            AND ps.status = 'scheduled'
        ")->getResultArray();
        
        $equipmentWithDueParts = [];
        foreach ($dueSchedules as $schedule) {
            $equipmentId = $schedule['equipment_id'];
            
            if (!isset($equipmentWithDueParts[$equipmentId])) {
                $equipment = $this->equipmentModel->find($equipmentId);
                if (!$equipment) continue;
                $equipmentWithDueParts[$equipmentId] = [
                    'equipment' => $equipment,
                    'parts' => []
                ];
            }
            
            $part = $this->partsModel->find($schedule['part_id']);
            $assembly = $this->assemblyModel->find($schedule['assembly_id']);
            
            if ($part && $assembly) {
                $partKey = $schedule['part_id'];
                if (!isset($equipmentWithDueParts[$equipmentId]['parts'][$partKey])) {
                    $equipmentWithDueParts[$equipmentId]['parts'][$partKey] = [
                        'part' => $part,
                        'assembly' => $assembly,
                        'schedules' => []
                    ];
                }
                $equipmentWithDueParts[$equipmentId]['parts'][$partKey]['schedules'][] = $schedule;
            }
        }
        
        $overdueCount = $db->query("
            SELECT COUNT(*) as count FROM pm_schedules ps
            WHERE ps.next_due_date < CURDATE()
            AND ps.status = 'scheduled'
        ")->getRow()->count;
        
        $data = [
            'equipment_with_due_parts' => $equipmentWithDueParts,
            'total_due_schedules' => count($dueSchedules),
            'total_overdue' => $overdueCount
        ];
        
        return view('maintenance/pm_dashboard', $data);
    }

    public function saveInspection()
    {
        $equipmentId = $this->request->getPost('equipment_id');
        $inspectionTypeId = $this->request->getPost('inspection_type_id');
        $items = $this->request->getPost('items');
        $overallNotes = $this->request->getPost('overall_notes');
        
        $db = db_connect();
        
        // Update schedules to completed and calculate next due dates
        $scheduleIds = array_unique(array_column($items, 'schedule_id'));
        $taskModel = new PmPartTaskModel();
        
        foreach ($scheduleIds as $scheduleId) {
            $schedule = $this->scheduleModel->find($scheduleId);
            if ($schedule) {
                $task = $taskModel->find($schedule['part_task_id']);
                
                $updateData = [
                    'last_completed_date' => date('Y-m-d'),
                    'status' => 'scheduled'
                ];
                
                if ($task['frequency_type'] === 'usage') {
                    $updateData['accumulated_usage'] = 0;
                } else {
                    $updateData['next_due_date'] = $this->scheduleModel->calculateNextDueDate($schedule);
                }
                
                $this->scheduleModel->update($scheduleId, $updateData);
            }
        }
        
        session()->setFlashdata('success', 'Inspection recorded successfully');
        return redirect()->to('/pmo/dashboard');
    }

    public function getInspectionTypes($equipmentId)
    {
        $db = db_connect();
        $inspectionTypes = $db->query("
            SELECT DISTINCT ppt.pm_inspection_type_id as inspection_id, pit.inspection_name
            FROM pm_schedules ps
            JOIN pm_part_tasks ppt ON ps.part_task_id = ppt.id
            JOIN parts p ON ppt.part_id = p.id
            LEFT JOIN pm_inspection_type pit ON ppt.pm_inspection_type_id = pit.inspection_id
            WHERE p.equipment_id = ?
            AND ps.next_due_date <= CURDATE()
            AND ps.status = 'scheduled'
        ", [$equipmentId])->getResultArray();
        
        return $this->response->setJSON($inspectionTypes);
    }

    public function generateWorkOrders()
    {
        $dueSchedules = $this->scheduleModel->getDueSchedules();
        $generated = 0;

        foreach ($dueSchedules as $schedule) {
            $existing = $this->workOrderModel->where('schedule_id', $schedule['id'])
                                             ->where('status !=', 'completed')
                                             ->first();
            
            if (!$existing) {
                $workOrderNumber = 'PMO-' . date('Y') . '-' . str_pad($this->workOrderModel->countAll() + 1, 4, '0', STR_PAD_LEFT);
                
                $this->workOrderModel->insert([
                    'work_order_number' => $workOrderNumber,
                    'schedule_id' => $schedule['id'],
                    'equipment_id' => $schedule['equipment_id'],
                    'part_id' => $schedule['part_id'],
                    'task_name' => $schedule['task_name'],
                    'task_description' => $schedule['task_description'] ?? '',
                    'scheduled_date' => $schedule['next_due_date'],
                    'estimated_duration_minutes' => $schedule['estimated_duration'] ?? '01:00:00'
                ]);
                $generated++;
            }
        }

        session()->setFlashdata('success', "$generated work orders generated successfully");
        return redirect()->to('/pmo');
    }

    public function assign($id)
    {
        $workOrder = $this->workOrderModel->find($id);
        
        if ($this->request->getMethod() === 'POST') {
            $this->workOrderModel->update($id, [
                'assigned_to' => $this->request->getPost('technician_id'),
                'status' => 'assigned'
            ]);
            return redirect()->to('/pmo')->with('success', 'Work order assigned successfully');
        }

        $data = [
            'workOrder' => $workOrder,
            'technicians' => $this->userModel->findAll()
        ];
        return view('backend/pmo/assign', $data);
    }
    
    public function bulkAssign()
    {
        $workOrderIds = $this->request->getPost('work_order_ids');
        $technicianId = $this->request->getPost('technician_id');
        
        if (empty($workOrderIds) || empty($technicianId)) {
            return redirect()->to('/pmo')->with('error', 'Invalid data provided');
        }
        
        $ids = explode(',', $workOrderIds);
        $updated = 0;
        
        foreach ($ids as $id) {
            $this->workOrderModel->update($id, [
                'assigned_to' => $technicianId,
                'status' => 'assigned'
            ]);
            $updated++;
        }
        
        return redirect()->to('/pmo')->with('success', "$updated work orders assigned successfully");
    }

    public function recordFindings($id)
    {
        $workOrder = $this->workOrderModel->find($id);
        
        if ($this->request->getMethod() === 'POST') {
            $this->findingModel->insert([
                'work_order_id' => $id,
                'part_id' => $workOrder['part_id'],
                'technician_id' => session()->get('id'),
                'condition' => $this->request->getPost('condition'),
                'remarks' => $this->request->getPost('remarks'),
                'parts_replaced' => $this->request->getPost('parts_replaced'),
                'completed_at' => date('Y-m-d H:i:s')
            ]);

            $this->workOrderModel->update($id, [
                'status' => 'completed',
                'completed_date' => date('Y-m-d'),
                'completion_notes' => $this->request->getPost('remarks')
            ]);

            $schedule = $this->scheduleModel->find($workOrder['schedule_id']);
            $taskModel = new PmPartTaskModel();
            $task = $taskModel->find($schedule['part_task_id']);
            
            $updateData = [
                'last_completed_date' => date('Y-m-d'),
                'status' => 'scheduled'
            ];
            
            if ($task['frequency_type'] === 'usage') {
                $updateData['accumulated_usage'] = 0;
            } else {
                $updateData['next_due_date'] = $this->scheduleModel->calculateNextDueDate($schedule);
            }
            
            $this->scheduleModel->update($workOrder['schedule_id'], $updateData);

            return redirect()->to('/pmo')->with('success', 'Findings recorded and next maintenance scheduled');
        }

        $data = [
            'workOrder' => $workOrder,
            'part' => $this->partsModel->find($workOrder['part_id'])
        ];
        return view('backend/pmo/record_findings', $data);
    }

    public function recordInspection($equipmentId)
    {
        $equipment = $this->equipmentModel->find($equipmentId);
        if (!$equipment) {
            return redirect()->back()->with('error', 'Equipment not found');
        }
        
        $inspectionTypeId = $this->request->getGet('inspection_type_id');
        
        $db = db_connect();
        $pmSchedules = $db->query("
            SELECT ps.*, ppt.*, p.id as part_id, p.assembly_id,
                   ppt.estimated_duration as pm_duration,
                   ppt.id as pm_task_id
            FROM pm_schedules ps
            JOIN pm_part_tasks ppt ON ps.part_task_id = ppt.id
            JOIN parts p ON ppt.part_id = p.id
            WHERE p.equipment_id = ?
            AND ppt.pm_inspection_type_id = ?
            AND ps.next_due_date <= CURDATE()
            AND ps.status = 'scheduled'
        ", [$equipmentId, $inspectionTypeId])->getResultArray();
        
        if (empty($pmSchedules)) {
            return redirect()->back()->with('error', 'No scheduled PM tasks found. Please initialize PM schedules first.');
        }
        
        $finalChecklistItems = [];
        $blockNo = 1;
        $totalDuration = 0;
        
        foreach ($pmSchedules as $schedule) {
            $part = $this->partsModel->find($schedule['part_id']);
            $assembly = $this->assemblyModel->find($schedule['assembly_id']);
            
            if (!$part || !$assembly) continue;
            
            $totalDuration += intval($schedule['pm_duration'] ?? 0);
            
            $partChecklistModel = new PartChecklistTemplateModel();
            $maintenanceChecklistModel = new MaintenanceChecklistModel();
            
            $partTemplates = $partChecklistModel->where('part_id', $part['id'])->findAll();
            
            if (empty($partTemplates)) continue;
            
            $methodDisplay = [];
            $standardDisplay = [];
            $itemIds = [];
            
            foreach ($partTemplates as $partTemplate) {
                $templateWithItems = $maintenanceChecklistModel->getTemplateWithItems($partTemplate['template_id']);
                if ($templateWithItems && !empty($templateWithItems['items'])) {
                    $items = explode('||', $templateWithItems['items']);
                    foreach ($items as $itemData) {
                        if (empty($itemData)) continue;
                        $item = explode('|', $itemData);
                        $itemId = $item[0] ?? '';
                        $itemName = $item[1] ?? '';
                        
                        if (!empty($itemName)) {
                            $methodDisplay[] = $itemName;
                            $itemIds[] = $itemId;
                        }
                        
                        if (!empty($partTemplate['custom_ranges'])) {
                            $ranges = json_decode($partTemplate['custom_ranges'], true);
                            if (is_array($ranges) && isset($ranges[$itemId]['normal_min']) && isset($ranges[$itemId]['normal_max'])) {
                                $standardDisplay[] = $ranges[$itemId]['normal_min'] . '-' . $ranges[$itemId]['normal_max'];
                            } else {
                                $standardDisplay[] = '';
                            }
                        } else {
                            $standardDisplay[] = '';
                        }
                    }
                }
            }
            
            $finalChecklistItems[] = [
                'block_no' => sprintf('%02d', $blockNo),
                'assembly_no' => $assembly['assembly_id'] ?? '',
                'part_no' => $part['part_number'] ?? '',
                'store_no' => $part['part_number'] ?? '',
                'part_description' => $part['name'],
                'task_description' => $schedule['task_name'],
                'methods' => $methodDisplay,
                'standards' => $standardDisplay,
                'item_ids' => $itemIds,
                'part_id' => $part['id'],
                'schedule_id' => $schedule['id'],
                'unit' => ''
            ];
            
            $blockNo++;
        }
        
        $inspectionType = $db->query("SELECT * FROM pm_inspection_type WHERE inspection_id = ?", [$inspectionTypeId])->getRowArray();
        if (!$inspectionType) {
            $inspectionType = ['inspection_id' => $inspectionTypeId, 'inspection_name' => 'Type ' . $inspectionTypeId];
        }
        
        $data = [
            'machine' => $equipment,
            'checklist_items' => $finalChecklistItems,
            'inspection_type' => $inspectionType,
            'total_duration' => $totalDuration,
            'pmo_code' => 'PMO-' . $equipment['equipment_id'],
            'equipment_id' => $equipmentId,
            'inspection_type_id' => $inspectionTypeId
        ];
        
        return view('maintenance/record_inspection', $data);
    }

    public function printChecklist($equipmentId)
    {
        $equipment = $this->equipmentModel->find($equipmentId);
        if (!$equipment) {
            return redirect()->back()->with('error', 'Equipment not found');
        }
        
        $inspectionTypeId = $this->request->getGet('inspection_type_id');
        
        $db = db_connect();
        $pmSchedules = $db->query("
            SELECT ps.*, ppt.*, p.id as part_id, p.assembly_id,
                   ppt.estimated_duration as pm_duration,
                   ppt.id as pm_task_id
            FROM pm_schedules ps
            JOIN pm_part_tasks ppt ON ps.part_task_id = ppt.id
            JOIN parts p ON ppt.part_id = p.id
            WHERE p.equipment_id = ?
            AND ppt.pm_inspection_type_id = ?
            AND ps.next_due_date <= CURDATE()
            AND ps.status = 'scheduled'
        ", [$equipmentId, $inspectionTypeId])->getResultArray();
        
        if (empty($pmSchedules)) {
            return redirect()->back()->with('error', 'No scheduled PM tasks found. Please initialize PM schedules first.');
        }
        
        $taskGroups = [];
        $totalDuration = 0;
        
        foreach ($pmSchedules as $schedule) {
            $taskName = $schedule['task_name'];
            if (!isset($taskGroups[$taskName])) {
                $taskGroups[$taskName] = [];
            }
            $taskGroups[$taskName][] = $schedule;
            $totalDuration += intval($schedule['pm_duration'] ?? 0);
        }
        
        $finalChecklistItems = [];
        $blockNo = 1;
        
        foreach ($taskGroups as $taskName => $schedules) {
            foreach ($schedules as $schedule) {
                $part = $this->partsModel->find($schedule['part_id']);
                $assembly = $this->assemblyModel->find($schedule['assembly_id']);
                
                if (!$part || !$assembly) continue;
                
                $partChecklistModel = new PartChecklistTemplateModel();
                $maintenanceChecklistModel = new MaintenanceChecklistModel();
                
                $partTemplates = $partChecklistModel->where('part_id', $part['id'])->findAll();
                
                $methodDisplay = [];
                $standardDisplay = [];
                
                if (!empty($partTemplates)) {
                    foreach ($partTemplates as $partTemplate) {
                        $templateWithItems = $maintenanceChecklistModel->getTemplateWithItems($partTemplate['template_id']);
                        if ($templateWithItems && !empty($templateWithItems['items'])) {
                            $items = explode('||', $templateWithItems['items']);
                            foreach ($items as $itemData) {
                                if (empty($itemData)) continue;
                                $item = explode('|', $itemData);
                                $itemId = $item[0] ?? '';
                                $itemName = $item[1] ?? '';
                                
                                if (!empty($itemName)) {
                                    $methodDisplay[] = $itemName;
                                }
                                
                                if (!empty($partTemplate['custom_ranges'])) {
                                    $ranges = json_decode($partTemplate['custom_ranges'], true);
                                    if (is_array($ranges) && isset($ranges[$itemId]['normal_min']) && isset($ranges[$itemId]['normal_max'])) {
                                        $standardDisplay[] = $ranges[$itemId]['normal_min'] . '-' . $ranges[$itemId]['normal_max'];
                                    }
                                }
                            }
                        }
                    }
                }
                
                $finalChecklistItems[] = [
                    'block_no' => sprintf('%02d', $blockNo),
                    'assembly_no' => $assembly['assembly_id'] ?? '',
                    'part_no' => $part['part_number'] ?? '',
                    'store_no' => $part['part_number'] ?? '',
                    'part_description' => $part['name'],
                    'task_description' => $taskName,
                    'method' => !empty($methodDisplay) ? implode(', ', $methodDisplay) : 'Visual',
                    'standard' => !empty($standardDisplay) ? implode(', ', $standardDisplay) : '',
                    'unit' => ''
                ];
                
                $blockNo++;
            }
        }
        
        
        $inspectionType = $db->query("SELECT * FROM pm_inspection_type WHERE inspection_id = ?", [$inspectionTypeId])->getRowArray();
        if (!$inspectionType) {
            $inspectionType = ['inspection_id' => $inspectionTypeId, 'inspection_name' => 'Type ' . $inspectionTypeId];
        }
        
        $data = [
            'machine' => $equipment,
            'checklist_items' => $finalChecklistItems,
            'inspection_type' => $inspectionType,
            'total_duration' => $totalDuration,
            'pmo_code' => 'PMO-' . $equipment['equipment_id'],
            'generated_date' => date('Y-m-d H:i:s'),
            'equipment_id' => $equipmentId,
            'inspection_type_id' => $inspectionTypeId
        ];
        
        return view('maintenance/printable_checklist', $data);
    }
}
