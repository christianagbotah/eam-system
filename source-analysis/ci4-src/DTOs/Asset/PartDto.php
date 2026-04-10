<?php

namespace App\DTOs\Asset;

class PartDto
{
    private int $id;
    private int $component_id;
    private ?int $parent_part_id;
    private string $part_number;
    private ?string $part_code;
    private string $part_name;
    private ?string $part_category;
    private ?string $description;
    private ?string $manufacturer;
    private ?string $material;
    private ?string $dimensions;
    private ?string $expected_lifespan;
    private string $spare_availability;
    private int $current_stock_qty;
    private ?string $safety_notes;
    private ?string $failure_modes;
    private ?float $unit_cost;
    private string $status;
    private ?string $part_image;
    private string $created_at;
    private string $updated_at;

    public function __construct(array $data)
    {
        $this->id = $data['id'];
        $this->component_id = $data['component_id'];
        $this->parent_part_id = $data['parent_part_id'] ?? null;
        $this->part_number = $data['part_number'];
        $this->part_code = $data['part_code'] ?? null;
        $this->part_name = $data['part_name'];
        $this->part_category = $data['part_category'] ?? null;
        $this->description = $data['description'] ?? null;
        $this->manufacturer = $data['manufacturer'] ?? null;
        $this->material = $data['material'] ?? null;
        $this->dimensions = $data['dimensions'] ?? null;
        $this->expected_lifespan = $data['expected_lifespan'] ?? null;
        $this->spare_availability = $data['spare_availability'] ?? 'no';
        $this->current_stock_qty = $data['current_stock_qty'] ?? 0;
        $this->safety_notes = $data['safety_notes'] ?? null;
        $this->failure_modes = $data['failure_modes'] ?? null;
        $this->unit_cost = $data['unit_cost'] ?? null;
        $this->status = $data['status'] ?? 'active';
        $this->part_image = $data['part_image'] ?? null;
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
            'component_id' => $this->component_id,
            'assembly_id' => $this->component_id,
            'parent_part_id' => $this->parent_part_id,
            'part_number' => $this->part_number,
            'part_code' => $this->part_code,
            'part_name' => $this->part_name,
            'part_category' => $this->part_category,
            'description' => $this->description,
            'manufacturer' => $this->manufacturer,
            'material' => $this->material,
            'dimensions' => $this->dimensions,
            'expected_lifespan' => $this->expected_lifespan,
            'spare_availability' => $this->spare_availability,
            'current_stock_qty' => $this->current_stock_qty,
            'safety_notes' => $this->safety_notes,
            'failure_modes' => $this->failure_modes,
            'unit_cost' => $this->unit_cost,
            'status' => $this->status,
            'part_image' => $this->part_image,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    public function getId(): int { return $this->id; }
    public function getComponentId(): int { return $this->component_id; }
    public function getPartNumber(): string { return $this->part_number; }
    public function getPartName(): string { return $this->part_name; }
    public function getStatus(): string { return $this->status; }
}