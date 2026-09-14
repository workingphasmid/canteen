import { Head, router, usePage } from "@inertiajs/react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type MenuItem = {
    id: number;
    name: string;
    description: string;
    price: number;
    emoji: string;
};
type CartItem = MenuItem & { quantity: number };
type Props = { user: { name: string; balance: number }; menuItems: MenuItem[] };
type ScanMode = "scanner" | "load" | "pay" | null;
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

    return (
        <>
            <Head title="Campus Canteen" />
            <main className="min-h-screen bg-[#fffaf3] text-stone-900">
                <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
                    <div>
                        <h1 className="text-2xl font-black">Canteen</h1>
                    </div>
                    <button
                        onClick={() => setModal("scanner")}
                        className="rounded-md-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-stone-300"
                    >
                        ⌘ Scan QR
                    </button>
                </header>
                <section className="mx-auto grid max-w-7xl gap-7 px-5 pb-10 sm:px-8 lg:grid-cols-[1fr_350px]">
                    <div>
                        <div className="mb-7 rounded-md bg-orange-500 p-7 text-white">
                            <p className="font-semibold opacity-85">
                                Hello, {user.name.split(" ")[0]}!
                            </p>
                            <h2 className="mt-1 text-3xl font-black">
                                What are you craving?
                            </h2>
                            <p className="mt-2 max-w-md text-orange-50">
                                Pick your favorites, then scan the Pay QR at the
                                counter.
                            </p>
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
                    <aside className="space-y-5 lg:sticky lg:top-5 lg:h-fit">
                        <div className="rounded-md bg-stone-900 p-6 text-white shadow-xl">
                            <p className="text-sm text-stone-300">
                                Available balance
                            </p>
                            <p className="mt-1 text-4xl font-black">
                                {money(user.balance)}
                            </p>
                            <button
                                onClick={() => setModal("scanner")}
                                className="rounded-md-xl mt-5 w-full bg-white px-4 py-3 font-bold text-stone-900"
                            >
                                Scan QR to load or pay
                            </button>
                        </div>
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
                                                    className="h-6 w-6 font-bold"
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
                                                    className="h-6 w-6 font-bold"
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
                                            onClick={() => setModal("pay")}
                                            className="rounded-md-xl mt-4 w-full bg-orange-500 px-4 py-3 font-bold text-white"
                                        >
                                            Review & pay
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
                    </aside>
                </section>
            </main>
            {modal && (
                <div className="fixed inset-0 z-20 grid place-items-center bg-stone-950/45 p-4">
                    <div className="w-full max-w-md rounded-md bg-white p-6 shadow-2xl">
                        <button
                            onClick={closeModal}
                            className="float-right text-xl text-stone-400"
                        >
                            ×
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
                    </div>
                </div>
            )}
        </>
    );
}
