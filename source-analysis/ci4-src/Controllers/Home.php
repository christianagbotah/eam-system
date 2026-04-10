<?php

namespace App\Controllers;

class Home extends BaseController
{
    public function index(): string
    {
        return view('backend/index');
    }

    public function all(): string
    {
        return view('backend/modules/index');
    }

    
}
