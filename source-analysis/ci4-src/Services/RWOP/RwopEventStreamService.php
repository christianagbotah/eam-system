<?php
namespace App\Services\RWOP;

class RwopEventStreamService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function publishEvent(string $eventType, string $entityType, int $entityId, array $payload, int $userId): int
    {
        return $this->db->table('rwop_domain_events')->insert([
            'event_type' => $eventType,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'payload' => json_encode($payload),
            'triggered_by' => $userId,
            'occurred_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    public function getUnprocessedEvents(int $limit = 100): array
    {
        return $this->db->table('rwop_domain_events')
            ->where('processed', 0)
            ->orderBy('occurred_at', 'ASC')
            ->limit($limit)
            ->get()->getResultArray();
    }
    
    public function markEventProcessed(int $eventId): bool
    {
        return $this->db->table('rwop_domain_events')->update($eventId, [
            'processed' => 1,
            'processed_at' => date('Y-m-d H:i:s')
        ]);
    }
}
