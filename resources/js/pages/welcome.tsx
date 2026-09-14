import { Head, router, usePage } from "@inertiajs/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowRight,
    PhilippinePeso,
    ScanQrCode,
    ShoppingCart,
    XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MenuItem = {
    id: number;
    name: string;
    description: string;
    price: number;
    emoji: string;
};
type CartItem = MenuItem & { quantity: number };
type Props = { user: { name: string; balance: number }; menuItems: MenuItem[] };
type ScanMode = "scanner" | "load" | "pay" | "cart" | null;
const money = (amount: number) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(amount);

export default function Welcome({ user, menuItems }: Props) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [modal, setModal] = useState<ScanMode>(null);
    const [amount, setAmount] = useState("");
    const [scanning, setScanning] = useState(false);
    const video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const { errors } = usePage().props as { errors: Record<string, string> };
    const total = useMemo(
        () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [cart],
    );
    const cartItemCount = useMemo(
        () => cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart],
    );
    const stopCamera = () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        setScanning(false);
    };
    const closeModal = () => {
        stopCamera();
        setModal(null);
    };
    useEffect(() => () => stopCamera(), []);

    const startCamera = async () => {
        if (
            !navigator.mediaDevices?.getUserMedia ||
            !("BarcodeDetector" in window)
        )
            return;
        try {
            stream.current = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            if (video.current) {
                video.current.srcObject = stream.current;
                await video.current.play();
            }
            setScanning(true);
            const Detector = (
                window as Window & {
                    BarcodeDetector: new (options: { formats: string[] }) => {
                        detect: (
                            source: HTMLVideoElement,
                        ) => Promise<{ rawValue: string }[]>;
                    };
                }
            ).BarcodeDetector;
            const detector = new Detector({ formats: ["qr_code"] });
            const detect = async () => {
                if (!stream.current || !video.current) return;
                const value = (
                    await detector.detect(video.current)
                )[0]?.rawValue?.toUpperCase();
                if (value?.includes("LOAD")) {
                    stopCamera();
                    setModal("load");
                    return;
                }
                if (value?.includes("PAY")) {
                    stopCamera();
                    setModal("pay");
                    return;
                }
                requestAnimationFrame(detect);
            };
            requestAnimationFrame(detect);
        } catch {
            setScanning(false);
        }
    };
    const add = (item: MenuItem) =>
        setCart((current) => {
            const found = current.find((entry) => entry.id === item.id);
            return found
                ? current.map((entry) =>
                      entry.id === item.id
                          ? { ...entry, quantity: entry.quantity + 1 }
                          : entry,
                  )
                : [...current, { ...item, quantity: 1 }];
        });
    const changeQuantity = (id: number, delta: number) =>
        setCart((current) =>
            current.flatMap((item) =>
                item.id === id
                    ? item.quantity + delta
                        ? [{ ...item, quantity: item.quantity + delta }]
                        : []
                    : [item],
            ),
        );
    const submitLoad = (event: FormEvent) => {
        event.preventDefault();
        router.post(
            "/wallet/load",
            { amount },
            {
                onSuccess: () => {
                    setAmount("");
                    closeModal();
                },
            },
        );
    };
    const pay = () =>
        router.post(
            "/orders",
            {
                items: cart.map((item) => ({
                    id: item.id,
                    quantity: item.quantity,
                })),
            },
            {
                onSuccess: () => {
                    setCart([]);
                    closeModal();
                },
            },
        );

    const [currentIndex, setCurrentIndex] = useState(0);
    const cards = [BalanceCard, WelcomeCard];

    function BalanceCard() {
        return (
            <div className="relative mb-6 rounded-md bg-stone-900 p-6 text-white shadow-xl">
                <p className="text-sm text-stone-300">Available balance</p>
                <p className="mt-1 text-4xl font-black">
                    {money(user.balance)}
                </p>
                <button
                    onClick={() => setModal("scanner")}
                    className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1 rounded-sm bg-white px-4 py-3 font-bold text-stone-900"
                >
                    <ScanQrCode size={18} /> Scan
                </button>
            </div>
        );
    }

    function WelcomeCard() {
        return (
            <div className="relative mb-7 rounded-md bg-orange-500 p-7 text-white">
                <p className="font-semibold opacity-85">
                    Hello, {user.name.split(" ")[0]}!
                </p>
                <h2 className="mt-1 text-3xl font-black">
                    What are you craving?
                </h2>
                <p className="mt-2 max-w-md text-orange-50">
                    Pick your favorites, then scan the Pay QR at the counter.
                </p>
            </div>
        );
    }

    const CardArrow = () => {
        return (
            <button
                onClick={() =>
                    setCurrentIndex((currentIndex + 1) % cards.length)
                }
                className={cn(
                    "absolute top-7 right-7 cursor-pointer rounded-full px-1 py-1",
                    currentIndex === 0
                        ? "bg-black text-white shadow-md shadow-stone-900"
                        : "bg-white text-orange-700 shadow-md shadow-orange-600",
                )}
            >
                <ArrowRight size={18} />
            </button>
        );
    };

    function CartComponent() {
        return (
            <div
                className={cn(
                    "rounded-md bg-white shadow-sm ring-1 ring-stone-100",
                    modal === "cart" ? "shadow-none ring-0" : "",
                )}
            >
                <p className="mb-1 text-sm font-bold text-orange-600">CART</p>
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black">Your order</h2>
                    <span className="rounded-md-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                        items
                    </span>
                </div>
                {cart.length === 0 ? (
                    <p className="py-9 text-center text-sm text-stone-400">
                        Your cart is waiting for something delicious.
                    </p>
                ) : (
                    <div className="mt-4 space-y-4">
                        {cart.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-3"
                            >
                                <span className="text-2xl">{item.emoji}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold">
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-stone-500">
                                        {money(item.price)}
                                    </p>
                                </div>
                                <div className="rounded-md-lg flex items-center gap-2 bg-stone-100 p-1">
                                    <button
                                        onClick={() =>
                                            changeQuantity(item.id, -1)
                                        }
                                        className="h-6 w-6 cursor-pointer font-bold"
                                    >
                                        −
                                    </button>
                                    <span className="w-3 text-center text-sm font-bold">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() =>
                                            changeQuantity(item.id, 1)
                                        }
                                        className="h-6 w-6 cursor-pointer font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="border-t border-stone-100 pt-4">
                            <div className="flex justify-between font-black">
                                <span>Total</span>
                                <span>{money(total)}</span>
                            </div>

                            <button
                                onClick={() => setModal("scanner")}
                                className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-md bg-stone-900 py-2 text-white"
                            >
                                <ScanQrCode size={18} />
                                <span className="font-bold">Pay</span>
                            </button>

                            {errors.cart && (
                                <p className="mt-2 text-sm text-red-600">
                                    {errors.cart}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <Head title="Campus Canteen" />
            <main className="min-h-screen bg-[#fffaf3] text-stone-900">
                <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
                    <div>
                        <h1 className="text-2xl font-black">Canteen</h1>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setModal("cart")}
                            className="relative flex cursor-pointer items-center gap-1 self-stretch rounded-sm bg-orange-400 px-4 py-2 text-sm font-bold text-white md:hidden"
                            aria-label={`Open cart, ${cartItemCount} items`}
                        >
                            <ShoppingCart size={18} />
                            Cart
                            {cartItemCount > 0 && (
                                <span className="absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-[#fffaf3] bg-stone-900 px-1 text-[11px] leading-none font-bold text-white shadow-sm">
                                    {cartItemCount > 99 ? "99+" : cartItemCount}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                <section className="mx-auto grid max-w-7xl gap-7 px-5 pb-10 sm:px-8 md:grid-cols-[1fr_250px] lg:grid-cols-[1fr_350px]">
                    <div>
                        <div className="md:hidden">
                            {cards.map((Card, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "relative",
                                        currentIndex === index ? "hidden" : "",
                                    )}
                                >
                                    <Card />
                                    <CardArrow />
                                </div>
                            ))}
                        </div>
                        <div className="hidden md:block">
                            <WelcomeCard />
                        </div>

                        <div className="mb-4">
                            <h2 className="text-2xl font-black">
                                Today’s menu
                            </h2>
                            <p className="text-sm text-stone-500">
                                Freshly prepared for you
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {menuItems.map((item) => (
                                <article
                                    key={item.id}
                                    className="rounded-md bg-white p-4 shadow-sm ring-1 ring-stone-100"
                                >
                                    <div className="rounded-md-2xl mb-4 flex h-32 items-center justify-center bg-orange-50 text-6xl">
                                        {item.emoji}
                                    </div>
                                    <h3 className="font-bold">{item.name}</h3>
                                    <p className="mt-1 min-h-10 text-sm text-stone-500">
                                        {item.description}
                                    </p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="font-black text-orange-600">
                                            {money(item.price)}
                                        </span>
                                        <button
                                            onClick={() => add(item)}
                                            className="cursor-pointer rounded-sm bg-orange-500 px-3 py-2 text-sm font-bold text-white"
                                        >
                                            Add +
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                    <aside className="hidden space-y-5 md:block lg:sticky lg:top-5 lg:h-fit">
                        <BalanceCard />
                        <div className="rounded-md bg-white p-5 shadow-sm ring-1 ring-stone-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-black">
                                    Your order
                                </h2>
                                <span className="rounded-md-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                                    {cart.reduce(
                                        (sum, item) => sum + item.quantity,
                                        0,
                                    )}{" "}
                                    items
                                </span>
                            </div>
                            {cart.length === 0 ? (
                                <p className="py-9 text-center text-sm text-stone-400">
                                    Your cart is waiting for something
                                    delicious.
                                </p>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    {cart.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3"
                                        >
                                            <span className="text-2xl">
                                                {item.emoji}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-stone-500">
                                                    {money(item.price)}
                                                </p>
                                            </div>
                                            <div className="rounded-md-lg flex items-center gap-2 bg-stone-100 p-1">
                                                <button
                                                    onClick={() =>
                                                        changeQuantity(
                                                            item.id,
                                                            -1,
                                                        )
                                                    }
                                                    className="h-6 w-6 cursor-pointer font-bold"
                                                >
                                                    −
                                                </button>
                                                <span className="w-3 text-center text-sm font-bold">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        changeQuantity(
                                                            item.id,
                                                            1,
                                                        )
                                                    }
                                                    className="h-6 w-6 cursor-pointer font-bold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="border-t border-stone-100 pt-4">
                                        <div className="flex justify-between font-black">
                                            <span>Total</span>
                                            <span>{money(total)}</span>
                                        </div>

                                        {errors.cart && (
                                            <p className="mt-2 text-sm text-red-600">
                                                {errors.cart}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </section>
            </main>
            {modal && (
                <div className="fixed inset-0 z-20 grid place-items-center bg-stone-950/45 p-4">
                    <div className="relative w-full max-w-md rounded-md bg-white p-6 shadow-2xl">
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-6 cursor-pointer p-1 text-xl text-stone-400"
                        >
                            <XIcon size={16} />
                        </button>
                        {modal === "scanner" && (
                            <>
                                <p className="text-sm font-bold text-orange-600">
                                    QR SCANNER
                                </p>
                                <h2 className="mt-1 text-2xl font-black">
                                    Scan a canteen code
                                </h2>
                                <p className="mt-2 text-sm text-stone-500">
                                    Use the Load QR to add balance or the Pay QR
                                    to review your order.
                                </p>
                                <video
                                    ref={video}
                                    className="rounded-md-2xl mt-5 aspect-square w-full bg-stone-100 object-cover"
                                    muted
                                    playsInline
                                />
                                {!scanning && (
                                    <button
                                        onClick={startCamera}
                                        className="rounded-md-xl mt-4 w-full bg-stone-900 py-3 font-bold text-white"
                                    >
                                        Start camera
                                    </button>
                                )}
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            stopCamera();
                                            setModal("load");
                                        }}
                                        className="rounded-md-xl bg-orange-100 py-3 text-sm font-bold text-orange-700"
                                    >
                                        Demo Load QR
                                    </button>
                                    <button
                                        onClick={() => {
                                            stopCamera();
                                            setModal("pay");
                                        }}
                                        className="rounded-md-xl bg-stone-100 py-3 text-sm font-bold"
                                    >
                                        Demo Pay QR
                                    </button>
                                </div>
                            </>
                        )}
                        {modal === "load" && (
                            <form onSubmit={submitLoad}>
                                <p className="text-sm font-bold text-orange-600">
                                    LOAD WALLET
                                </p>
                                <h2 className="mt-1 text-2xl font-black">
                                    Add funds
                                </h2>
                                <p className="mt-2 text-sm text-stone-500">
                                    Enter the amount you would like to load.
                                </p>
                                <input
                                    autoFocus
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={amount}
                                    onChange={(event) =>
                                        setAmount(event.target.value)
                                    }
                                    placeholder="₱ 0.00"
                                    className="rounded-md-xl mt-5 w-full border border-stone-200 p-4 text-xl font-bold"
                                />
                                {errors.amount && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {errors.amount}
                                    </p>
                                )}
                                <button className="rounded-md-xl mt-4 w-full bg-orange-500 py-3 font-bold text-white">
                                    Confirm load
                                </button>
                            </form>
                        )}
                        {modal === "pay" && (
                            <>
                                <p className="text-sm font-bold text-orange-600">
                                    PAY ORDER
                                </p>
                                <h2 className="mt-1 text-2xl font-black">
                                    Confirm your order
                                </h2>
                                {cart.length ? (
                                    <>
                                        <div className="my-5 space-y-3">
                                            {cart.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex justify-between text-sm"
                                                >
                                                    <span>
                                                        {item.quantity}×{" "}
                                                        {item.name}
                                                    </span>
                                                    <b>
                                                        {money(
                                                            item.price *
                                                                item.quantity,
                                                        )}
                                                    </b>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between border-t pt-4 text-lg font-black">
                                            <span>Total</span>
                                            <span>{money(total)}</span>
                                        </div>
                                        <p className="mt-3 text-sm text-stone-500">
                                            Balance after payment:{" "}
                                            {money(user.balance - total)}
                                        </p>
                                        <button
                                            disabled={total > user.balance}
                                            onClick={pay}
                                            className="rounded-md-xl mt-5 w-full bg-stone-900 py-3 font-bold text-white disabled:opacity-40"
                                        >
                                            Pay {money(total)}
                                        </button>
                                        {errors.cart && (
                                            <p className="mt-2 text-sm text-red-600">
                                                {errors.cart}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="py-8 text-center text-stone-500">
                                        Your cart is empty. Add food before
                                        scanning the Pay QR.
                                    </p>
                                )}
                            </>
                        )}
                        {modal === "cart" && <CartComponent />}
                    </div>
                </div>
            )}
        </>
    );
}
