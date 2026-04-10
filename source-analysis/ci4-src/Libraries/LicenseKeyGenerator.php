<?php

namespace App\Libraries;

class LicenseKeyGenerator
{
    private string $encryptionKey;
    private string $cipher = 'AES-256-CBC';

    public function __construct()
    {
        $this->encryptionKey = getenv('LICENSE_ENCRYPTION_KEY') ?: 'iFactory-EAM-2025-SecureKey-32';
    }

    public function generate(string $moduleCode, array $params = []): string
    {
        $data = [
            'module' => $moduleCode,
            'company_id' => $params['company_id'] ?? null,
            'valid_until' => $params['valid_until'] ?? null,
            'timestamp' => time(),
            'random' => bin2hex(random_bytes(8)),
        ];

        $json = json_encode($data);
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length($this->cipher));
        $encrypted = openssl_encrypt($json, $this->cipher, $this->encryptionKey, 0, $iv);
        $hash = base64_encode($encrypted . '::' . base64_encode($iv));
        $checksum = substr(hash('sha256', $hash . $this->encryptionKey), 0, 8);

        return 'IFACTORY-' . strtoupper($moduleCode) . '-' . str_replace(['/', '+', '='], ['-', '_', ''], $hash) . '-' . $checksum;
    }

    public function validate(string $licenseKey): bool
    {
        try {
            $parts = explode('-', $licenseKey);
            if (count($parts) < 4 || $parts[0] !== 'IFACTORY') return false;

            $hash = str_replace(['-', '_'], ['/', '+'], $parts[2]);
            $checksum = $parts[3];
            $expectedChecksum = substr(hash('sha256', $hash . $this->encryptionKey), 0, 8);

            if ($checksum !== $expectedChecksum) return false;

            $data = $this->decrypt($licenseKey);
            if (!$data) return false;

            if (isset($data['valid_until']) && strtotime($data['valid_until']) < time()) {
                return false;
            }

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    public function decrypt(string $licenseKey): ?array
    {
        try {
            $parts = explode('-', $licenseKey);
            if (count($parts) < 4) return null;

            $hash = str_replace(['-', '_'], ['/', '+'], $parts[2]);
            $decoded = base64_decode($hash);
            list($encrypted, $iv) = explode('::', $decoded, 2);
            $iv = base64_decode($iv);

            $decrypted = openssl_decrypt($encrypted, $this->cipher, $this->encryptionKey, 0, $iv);
            return json_decode($decrypted, true);
        } catch (\Exception $e) {
            return null;
        }
    }
}
