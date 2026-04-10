<?php

namespace App\Repositories;

class MeterRepository
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function findMeter($meterId)
    {
        // SELECT * FROM meters WHERE id = ?
        return $this->db->table('meters')->where('id', $meterId)->get()->getRowArray();
    }

    public function findMeterByEquipment($equipmentId)
    {
        // SELECT * FROM meters WHERE asset_id = ? LIMIT 1
        return $this->db->table('meters')->where('asset_id', $equipmentId)->get()->getRowArray();
    }

    public function getLastReading($meterId)
    {
        // SELECT * FROM meter_readings WHERE meter_id = ? ORDER BY reading_date DESC LIMIT 1
        return $this->db->table('meter_readings')
            ->where('meter_id', $meterId)
            ->orderBy('reading_date', 'DESC')
            ->limit(1)
            ->get()->getRowArray();
    }

    public function getReadingAtDate($meterId, $date)
    {
        // SELECT * FROM meter_readings WHERE meter_id = ? AND reading_date >= ? ORDER BY reading_date ASC LIMIT 1
        return $this->db->table('meter_readings')
            ->where('meter_id', $meterId)
            ->where('reading_date >=', $date)
            ->orderBy('reading_date', 'ASC')
            ->limit(1)
            ->get()->getRowArray();
    }

    public function findReading($readingId)
    {
        // SELECT * FROM meter_readings WHERE id = ?
        return $this->db->table('meter_readings')->where('id', $readingId)->get()->getRowArray();
    }

    public function insertReading($data)
    {
        // INSERT INTO meter_readings (meter_id, reading_value, reading_date, recorded_by, created_at)
        $this->db->table('meter_readings')->insert($data);
        return $this->db->insertID();
    }

    public function updateMeterReading($meterId, $reading)
    {
        // UPDATE meters SET current_reading = ?, last_reading_date = ? WHERE id = ?
        $this->db->table('meters')->where('id', $meterId)->update([
            'current_reading' => $reading,
            'last_reading_date' => date('Y-m-d H:i:s')
        ]);
    }
}
