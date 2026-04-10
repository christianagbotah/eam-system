<?php

namespace App\DTOs;

use App\DTOs\Asset\MachineDto;
use App\DTOs\Asset\AssemblyDto;
use App\DTOs\Asset\PartDto;

class DtoMapper
{
    public static function mapMachine(array $data): MachineDto
    {
        return MachineDto::fromArray($data);
    }

    public static function mapMachines(array $machines): array
    {
        return array_map([self::class, 'mapMachine'], $machines);
    }

    public static function mapAssembly(array $data): AssemblyDto
    {
        return AssemblyDto::fromArray($data);
    }

    public static function mapAssemblies(array $assemblies): array
    {
        return array_map([self::class, 'mapAssembly'], $assemblies);
    }

    public static function mapPart(array $data): PartDto
    {
        return PartDto::fromArray($data);
    }

    public static function mapParts(array $parts): array
    {
        return array_map([self::class, 'mapPart'], $parts);
    }

    public static function toArrayCollection(array $dtos): array
    {
        return array_map(function($dto) {
            return $dto->toArray();
        }, $dtos);
    }
}