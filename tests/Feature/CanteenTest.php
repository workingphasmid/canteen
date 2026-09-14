<?php

namespace Tests\Feature;

use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CanteenTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_wallet_load_updates_the_seeded_users_balance(): void
    {
        $user = User::factory()->create(['wallet_balance' => 100]);

        $this->post(route('wallet.load'), ['amount' => 50])->assertRedirect();

        $this->assertDatabaseHas('wallet_transactions', ['user_id' => $user->id, 'type' => 'load', 'amount' => 50]);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'wallet_balance' => 150]);
    }

    public function test_payment_creates_a_paid_order_and_debits_wallet(): void
    {
        $user = User::factory()->create(['wallet_balance' => 100]);
        $item = MenuItem::create(['name' => 'Rice meal', 'description' => 'Lunch', 'price' => 75, 'emoji' => '🍛']);

        $this->post(route('orders.store'), ['items' => [['id' => $item->id, 'quantity' => 1]]])->assertRedirect();

        $this->assertDatabaseHas('orders', ['user_id' => $user->id, 'total' => 75, 'status' => 'paid']);
        $this->assertDatabaseHas('wallet_transactions', ['user_id' => $user->id, 'type' => 'payment', 'amount' => -75]);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'wallet_balance' => 25]);
    }

    public function test_payment_is_rejected_when_balance_is_insufficient(): void
    {
        User::factory()->create(['wallet_balance' => 20]);
        $item = MenuItem::create(['name' => 'Rice meal', 'description' => 'Lunch', 'price' => 75, 'emoji' => '🍛']);

        $this->post(route('orders.store'), ['items' => [['id' => $item->id, 'quantity' => 1]]])
            ->assertSessionHasErrors('cart');

        $this->assertDatabaseCount('orders', 0);
    }
}
