<?php

namespace App\DTOs\Asset;

class MachineDto
{
    private int $id;
    private string $asset_tag;
    private string $name;
    private ?string $model;
    private ?string $manufacturer;
    private ?string $serial_number;
    private ?string $category;
    private ?int $location_id;
    private ?int $department_id;
    private ?string $install_date;
    private ?string $purchase_date;
    private ?string $warranty_expiry;
    private string $criticality;
    private string $status;
    private ?array $oem_docs;
    private ?string $machine_photo;
    private ?string $location;
    private int $attachments_count;
    private ?int $created_by;
    private ?int $updated_by;
    private string $created_at;
    private string $updated_at;

    public function __construct(array $data)
    {
        $this->id = $data['id'];
        $this->asset_tag = $data['asset_tag'];
        $this->name = $data['name'];
        $this->model = $data['model'] ?? null;
        $this->manufacturer = $data['manufacturer'] ?? null;
        $this->serial_number = $data['serial_number'] ?? null;
        $this->category = $data['category'] ?? null;
        $this->location_id = $data['location_id'] ?? null;
        $this->department_id = $data['department_id'] ?? null;
        $this->install_date = $data['install_date'] ?? null;
        $this->purchase_date = $data['purchase_date'] ?? null;
        $this->warranty_expiry = $data['warranty_expiry'] ?? null;
        $this->criticality = $data['criticality'] ?? 'medium';
        $this->status = $data['status'] ?? 'active';
        $this->oem_docs = $data['oem_docs'] ?? null;
        $this->machine_photo = $data['machine_photo'] ?? null;
        $this->location = $data['location'] ?? null;
        $this->attachments_count = $data['attachments_count'] ?? 0;
        $this->created_by = $data['created_by'] ?? null;
        $this->updated_by = $data['updated_by'] ?? null;
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
            'asset_tag' => $this->asset_tag,
            'name' => $this->name,
            'machine_name' => $this->name,
            'asset_code' => $this->asset_tag,
            'model' => $this->model,
            'manufacturer' => $this->manufacturer,
            'serial_number' => $this->serial_number,
            'category' => $this->category,
            'location_id' => $this->location_id,
            'department_id' => $this->department_id,
            'install_date' => $this->install_date,
            'purchase_date' => $this->purchase_date,
            'warranty_expiry' => $this->warranty_expiry,
            'criticality' => $this->criticality,
            'status' => $this->status,
            'oem_docs' => $this->oem_docs,
            'machine_photo' => $this->machine_photo,
            'location' => $this->location,
            'attachments_count' => $this->attachments_count,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    public function getId(): int { return $this->id; }
    public function getAssetTag(): string { return $this->asset_tag; }
    public function getName(): string { return $this->name; }
    public function getModel(): ?string { return $this->model; }
    public function getStatus(): string { return $this->status; }
    public function getCriticality(): string { return $this->criticality; }
}