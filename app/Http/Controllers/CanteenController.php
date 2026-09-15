<?php

namespace App\Http\Controllers;

use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Log;

class CanteenController extends Controller
{
    public function index(): Response
    {
        $user_id = session('current_user_id', 1);
        $user = User::findOrFail($user_id);


        return Inertia::render('welcome', [
            'user' => ['id' => $user->id, 'name' => $user->name, 'balance' => (float) $user->wallet_balance],
            'menuItems' => MenuItem::query()->where('is_available', true)->orderBy('id')->get()
                ->map(fn(MenuItem $item) => ['id' => $item->id, 'name' => $item->name, 'description' => $item->description, 'price' => (float) $item->price, 'emoji' => $item->emoji]),
        ]);
    }

    public function switchAccount(Request $request): RedirectResponse
    {
        $data = $request->validate(['id' => ['numeric']]);

        $user = User::whereNot('id', $data['id'])->first();

        session(['current_user_id' => $user->id]);

        return redirect()->back()->with('success', 'Switched to ' . $user->name);
    }

    public function load(Request $request): RedirectResponse
    {
        $data = $request->validate(['amount' => ['required', 'numeric', 'min:1', 'max:10000']]);
        $user_id = session('current_user_id', 1);
        $user = User::findOrFail($user_id);

        DB::transaction(function () use ($user, $data): void {
            $user->increment('wallet_balance', $data['amount']);
            WalletTransaction::create(['user_id' => $user->id, 'type' => 'load', 'amount' => $data['amount'], 'description' => 'Wallet load via QR']);
        });

        return back()->with('success', 'Your balance has been loaded.');
    }

    public function storeOrder(Request $request): RedirectResponse
    {
        $data = $request->validate(['items' => ['required', 'array', 'min:1'], 'items.*.id' => ['required', 'integer', 'exists:menu_items,id'], 'items.*.quantity' => ['required', 'integer', 'min:1', 'max:20']]);
        $user_id = session('current_user_id', 1);
        $user = User::findOrFail($user_id);

        DB::transaction(function () use ($user, $data): void {
            $menu = MenuItem::query()->whereIn('id', collect($data['items'])->pluck('id'))->where('is_available', true)->lockForUpdate()->get()->keyBy('id');
            $items = collect($data['items'])->map(function (array $cartItem) use ($menu): array {
                $item = $menu->get($cartItem['id']);
                if (! $item) {
                    throw ValidationException::withMessages(['cart' => 'One or more menu items are unavailable.']);
                }
                return ['menu_item_id' => $item->id, 'name' => $item->name, 'quantity' => $cartItem['quantity'], 'unit_price' => $item->price, 'subtotal' => $item->price * $cartItem['quantity']];
            });
            $total = $items->sum('subtotal');
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            if ($user->wallet_balance < $total) {
                throw ValidationException::withMessages(['cart' => 'Your wallet balance is not enough for this order.']);
            }

            $order = Order::create(['user_id' => $user->id, 'total' => $total, 'status' => 'paid']);
            $order->items()->createMany($items->all());
            $user->decrement('wallet_balance', $total);
            WalletTransaction::create(['user_id' => $user->id, 'order_id' => $order->id, 'type' => 'payment', 'amount' => -$total, 'description' => 'Canteen order #' . $order->id]);
        });

        return back()->with('success', 'Payment complete. Your order has been placed.');
    }
}
