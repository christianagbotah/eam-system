<?php

namespace App\DTOs\Asset;

class AssemblyDto
{
    private int $id;
    private int $equipment_id;
    private string $assembly_code;
    private string $assembly_name;
    private ?string $assembly_category;
    private ?string $description;
    private string $criticality;
    private string $status;
    private ?string $assembly_image;
    private string $created_at;
    private string $updated_at;

    public function __construct(array $data)
    {
        $this->id = $data['id'];
        $this->equipment_id = $data['equipment_id'];
        $this->assembly_code = $data['assembly_code'];
        $this->assembly_name = $data['assembly_name'];
        $this->assembly_category = $data['assembly_category'] ?? null;
        $this->description = $data['description'] ?? null;
        $this->criticality = $data['criticality'] ?? 'medium';
        $this->status = $data['status'] ?? 'active';
        $this->assembly_image = $data['assembly_image'] ?? null;
        $this->created_at = $data['created_at'];
        $this->updated_at = $data['updated_at'];
    }

    public static function fromArray(array $data): self
    {
        return new self($data);
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'equipment_id' => $this->equipment_id,
            'machine_id' => $this->equipment_id,
            'assembly_code' => $this->assembly_code,
            'assembly_name' => $this->assembly_name,
            'assembly_category' => $this->assembly_category,
            'description' => $this->description,
            'criticality' => $this->criticality,
            'status' => $this->status,
            'assembly_image' => $this->assembly_image,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    public function getId(): int { return $this->id; }
    public function getEquipmentId(): int { return $this->equipment_id; }
    public function getAssemblyCode(): string { return $this->assembly_code; }
    public function getAssemblyName(): string { return $this->assembly_name; }
    public function getStatus(): string { return $this->status; }
    public function getCriticality(): string { return $this->criticality; }
}