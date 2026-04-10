<?php
namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class PasswordResetController extends ResourceController
{
    protected $format = 'json';

    public function requestReset()
    {
        $email = $this->request->getJSON()->email ?? '';
        
        if (empty($email)) {
            return $this->fail('Email is required', 400);
        }

        $db = \Config\Database::connect();
        
        // Check if user exists
        $user = $db->table('users')->where('email', $email)->get()->getRow();
        
        if (!$user) {
            return $this->respond(['status' => 'success', 'message' => 'If email exists, reset link sent']);
        }

        // Generate token
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

        // Delete old tokens
        $db->table('password_resets')->where('email', $email)->delete();

        // Insert new token
        $db->table('password_resets')->insert([
            'email' => $email,
            'token' => $token,
            'expires_at' => $expiresAt
        ]);

        // Send email
        $emailService = new \App\Libraries\EmailService();
        $emailSent = $emailService->sendPasswordReset($email, $token);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Password reset link sent to your email'
        ]);
    }

    public function resetPassword()
    {
        $token = $this->request->getJSON()->token ?? '';
        $password = $this->request->getJSON()->password ?? '';

        if (empty($token) || empty($password)) {
            return $this->fail('Token and password are required', 400);
        }

        $db = \Config\Database::connect();

        // Verify token
        $reset = $db->table('password_resets')
            ->where('token', $token)
            ->where('expires_at >', date('Y-m-d H:i:s'))
            ->get()->getRow();

        if (!$reset) {
            return $this->fail('Invalid or expired token', 400);
        }

        // Update password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $db->table('users')
            ->where('email', $reset->email)
            ->update(['password' => $hashedPassword]);

        // Delete used token
        $db->table('password_resets')->where('token', $token)->delete();

        return $this->respond([
            'status' => 'success',
            'message' => 'Password reset successfully'
        ]);
    }
}
