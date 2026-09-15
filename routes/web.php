<?php

use App\Http\Controllers\CanteenController;
use Illuminate\Support\Facades\Route;

Route::get('/', [CanteenController::class, 'index'])->name('home');
Route::post('/wallet/load', [CanteenController::class, 'load'])->name('wallet.load');
Route::post('/orders', [CanteenController::class, 'storeOrder'])->name('orders.store');
Route::post('/switch', [CanteenController::class, 'switchAccount'])->name("account.switch");
