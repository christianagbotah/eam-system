<?php

namespace App\Services;

use App\Repositories\ShiftRepository;

class ShiftService
{
    protected $repository;

    public function __construct()
    {
        $this->repository = new ShiftRepository();
    }

    public function assignUserToShift($userId, $shiftId, $departmentId, $startDate, $endDate = null, $currentUser = null)
    {
        if (!$this->repository->userExists($userId)) {
            return ['status' => 'error', 'message' => 'User not found'];
        }

        if (!$this->repository->shiftExists($shiftId)) {
            return ['status' => 'error', 'message' => 'Shift not found'];
        }
        
        if (!$this->repository->departmentExists($departmentId)) {
            return ['status' => 'error', 'message' => 'Department not found'];
        }

        if ($endDate && $endDate < $startDate) {
            return ['status' => 'error', 'message' => 'End date must be after start date'];
        }
        
        // Authorization: only admin or department supervisor
        if ($currentUser && !$this->canAssignInDepartment($currentUser, $departmentId)) {
            return ['status' => 'error', 'message' => 'Unauthorized: Only admin or department supervisor can assign shifts'];
        }

        $overlap = $this->repository->hasOverlappingAssignment($userId, $startDate, $endDate);
        if ($overlap) {
            return ['status' => 'error', 'message' => 'User already has shift assignment in this period'];
        }

        $assignmentId = $this->repository->createAssignment([
            'user_id' => $userId,
            'shift_id' => $shiftId,
            'department_id' => $departmentId,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);

        return [
            'status' => 'success',
            'data' => ['assignment_id' => $assignmentId],
            'message' => 'User assigned to shift successfully'
        ];
    }

    public function getDepartmentRoster($departmentId, $date)
    {
        if (!$this->repository->departmentExists($departmentId)) {
            return ['status' => 'error', 'message' => 'Department not found'];
        }
        
        $roster = $this->repository->getDepartmentRosterAtDate($departmentId, $date);
        
        return [
            'status' => 'success',
            'data' => [
                'department_id' => $departmentId,
                'date' => $date,
                'roster' => $roster
            ],
            'message' => 'Department roster retrieved successfully'
        ];
    }
    
    public function bulkAssignUsers($assignments, $currentUser)
    {
        $imported = 0;
        $errors = [];
        
        foreach ($assignments as $index => $assignment) {
            $result = $this->assignUserToShift(
                $assignment['user_id'],
                $assignment['shift_id'],
                $assignment['department_id'],
                $assignment['start_date'],
                $assignment['end_date'] ?? null,
                $currentUser
            );
            
            if ($result['status'] === 'error') {
                $errors[] = "Assignment " . ($index + 1) . ": {$result['message']}";
            } else {
                $imported++;
            }
        }
        
        return [
            'status' => 'success',
            'data' => [
                'imported' => $imported,
                'errors' => $errors
            ],
            'message' => "Assigned {$imported} users" . (count($errors) > 0 ? " with " . count($errors) . " errors" : "")
        ];
    }
    
    public function bulkImportRoster($file, $currentUser)
    {
        $handle = fopen($file->getTempName(), 'r');
        $header = fgetcsv($handle);
        
        // Validate header
        $expectedHeader = ['user_id', 'shift_id', 'department_id', 'start_date', 'end_date'];
        if ($header !== $expectedHeader) {
            fclose($handle);
            return ['status' => 'error', 'message' => 'Invalid CSV format. Expected columns: ' . implode(', ', $expectedHeader)];
        }
        
        $imported = 0;
        $errors = [];
        $row = 1;
        
        while (($data = fgetcsv($handle)) !== false) {
            $row++;
            
            if (count($data) !== 5) {
                $errors[] = "Row {$row}: Invalid column count";
                continue;
            }
            
            [$userId, $shiftId, $departmentId, $startDate, $endDate] = $data;
            $endDate = empty($endDate) ? null : $endDate;
            
            $result = $this->assignUserToShift(
                (int)$userId,
                (int)$shiftId,
                (int)$departmentId,
                $startDate,
                $endDate,
                $currentUser
            );
            
            if ($result['status'] === 'error') {
                $errors[] = "Row {$row}: {$result['message']}";
            } else {
                $imported++;
            }
        }
        
        fclose($handle);
        
        return [
            'status' => 'success',
            'data' => [
                'imported' => $imported,
                'errors' => $errors
            ],
            'message' => "Imported {$imported} shift assignments" . (count($errors) > 0 ? " with " . count($errors) . " errors" : "")
        ];
    }
    
    private function canAssignInDepartment($currentUser, $departmentId)
    {
        if ($currentUser['role'] === 'admin') {
            return true;
        }
        
        if ($currentUser['role'] === 'supervisor') {
            $department = $this->repository->findDepartment($departmentId);
            return $department && $department['supervisor_id'] == $currentUser['id'];
        }
        
        return false;
    }
}
