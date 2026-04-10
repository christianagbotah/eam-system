<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\UserModel;

class Auth extends BaseController
{
    protected $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
        helper(['form', 'url']);
    }

    public function login()
    {
        if (session()->get('isLoggedIn')) {
            $role = session()->get('role');
            $dashboardRoute = match($role) {
                'admin' => '/admin/dashboard',
                'manager' => '/manager/dashboard',
                'supervisor' => '/supervisor/dashboard',
                'planner' => '/planner/dashboard',
                default => '/operator/dashboard'
            };
            return redirect()->to($dashboardRoute);
        }

        return view('auth/login');
    }

    public function attemptLogin()
    {
        $rules = [
            'email' => 'required|valid_email',
            'password' => 'required|min_length[6]'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('error', 'Please check your email and password.');
        }

        $email = $this->request->getPost('email');
        $password = $this->request->getPost('password');

        try {
            $user = $this->userModel
                ->select('users.*, roles.name as role_name')
                ->join('roles', 'roles.id = users.role_id', 'left')
                ->where('users.email', $email)
                ->first();

            if ($user && password_verify($password, $user['password'])) {
                if ($user['status'] !== 'active') {
                    return redirect()->back()->with('error', 'Your account is not active. Please contact administrator.');
                }

                $sessionData = [
                    'user_id' => $user['id'],
                    'email' => $user['email'],
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'role' => $user['role_name'] ?? 'operator',
                    'role_id' => $user['role_id'],
                    'isLoggedIn' => true
                ];

                session()->set($sessionData);
                
                // Update last login
                $this->userModel->update($user['id'], ['last_login' => date('Y-m-d H:i:s')]);

                $dashboardRoute = match($user['role_name'] ?? 'operator') {
                    'admin' => '/admin/dashboard',
                    'manager' => '/manager/dashboard',
                    'supervisor' => '/supervisor/dashboard',
                    'planner' => '/planner/dashboard',
                    default => '/operator/dashboard'
                };

                return redirect()->to($dashboardRoute)->with('success', 'Welcome back, ' . $user['first_name'] . '!');
            } else {
                return redirect()->back()->with('error', 'Invalid email or password.');
            }
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Database connection failed. Please ensure MySQL service is running.');
        }
    }

    public function logout()
    {
        session()->destroy();
        session()->setFlashdata('success', 'You have been logged out successfully.');
        return redirect()->to('/auth/login');
    }

    public function register()
    {
        if (session()->get('isLoggedIn')) {
            $role = session()->get('role');
            $dashboardRoute = match($role) {
                'admin' => '/admin/dashboard',
                'manager' => '/manager/dashboard',
                'supervisor' => '/supervisor/dashboard',
                'planner' => '/planner/dashboard',
                default => '/operator/dashboard'
            };
            return redirect()->to($dashboardRoute);
        }

        return view('auth/register');
    }

    public function attemptRegister()
    {
        $rules = [
            'first_name' => 'required|min_length[2]|max_length[50]',
            'last_name' => 'required|min_length[2]|max_length[50]',
            'email' => 'required|valid_email|is_unique[users.email]',
            'password' => 'required|min_length[8]',
            'confirm_password' => 'required|matches[password]',
            'role_id' => 'required|integer'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $userData = [
            'first_name' => $this->request->getPost('first_name'),
            'last_name' => $this->request->getPost('last_name'),
            'email' => $this->request->getPost('email'),
            'password' => password_hash($this->request->getPost('password'), PASSWORD_DEFAULT),
            'role_id' => $this->request->getPost('role_id'),
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s')
        ];

        if ($this->userModel->insert($userData)) {
            session()->setFlashdata('success', 'Registration successful! You can now login.');
            return redirect()->to('/auth/login');
        } else {
            session()->setFlashdata('error', 'Registration failed. Please try again.');
            return redirect()->back()->withInput();
        }
    }
}