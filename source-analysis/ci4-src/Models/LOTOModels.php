<?php

namespace App\Models;

use CodeIgniter\Model;

class LOTOProcedureModel extends Model
{
    protected $table = 'loto_procedures';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'equipment_id', 'procedure_name', 'procedure_code', 'energy_sources',
        'isolation_steps', 'verification_steps', 'restoration_steps',
        'created_by', 'approved_by', 'approved_at', 'active'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'equipment_id' => 'required|integer',
        'procedure_name' => 'required|max_length[255]',
        'procedure_code' => 'required|max_length[50]|is_unique[loto_procedures.procedure_code,id,{id}]',
        'energy_sources' => 'required',
        'isolation_steps' => 'required',
        'verification_steps' => 'required',
        'restoration_steps' => 'required'
    ];
}

class LOTOApplicationModel extends Model
{
    protected $table = 'loto_applications';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'permit_id', 'work_order_id', 'equipment_id', 'procedure_id',
        'applied_by', 'applied_at', 'lock_numbers', 'tag_numbers',
        'verified_by', 'verified_at', 'zero_energy_confirmed', 'verification_notes',
        'removed_by', 'removed_at', 'equipment_tested', 'removal_notes', 'status'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'equipment_id' => 'required|integer',
        'procedure_id' => 'required|integer',
        'applied_by' => 'required|integer',
        'lock_numbers' => 'required',
        'tag_numbers' => 'required'
    ];
}

class LOTOLockModel extends Model
{
    protected $table = 'loto_locks';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'lock_number', 'lock_type', 'assigned_to', 'current_location',
        'status', 'last_inspection_date'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'lock_number' => 'required|max_length[50]|is_unique[loto_locks.lock_number,id,{id}]',
        'lock_type' => 'required|max_length[50]',
        'status' => 'required|in_list[available,in_use,damaged,lost]'
    ];
}
