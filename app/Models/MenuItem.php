<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    protected $fillable = ['name', 'description', 'price', 'emoji', 'is_available'];
    protected function casts(): array { return ['price' => 'decimal:2', 'is_available' => 'boolean']; }
}
