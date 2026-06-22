"use client";

import { useTranslate } from '@/lib/i18n/LocaleContext'
import { assets } from "@/assets/assets";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import { useSelector } from "react-redux";
import { selectAuthBootstrapped } from "@/lib/features/auth/authSlice";
import { useRouter } from "next/navigation";
import { CameraIcon } from "lucide-react";
import { applyForStore, fetchMyApplication } from "@/lib/api/store";
import { uploadImage } from "@/lib/api/seller";
import StoreAddressFields, {
  EMPTY_STORE_ADDRESS,
  formatStoreAddress,
} from "@/components/store/StoreAddressFields";

function sanitizeUsername(raw) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return (s || "shop").slice(0, 40);
}

export default function CreateStore() {
  const router = useRouter();
  const t = useTranslate();
  const session = useSelector((s) => s.auth.session);
  const bootstrapped = useSelector(selectAuthBootstrapped);

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [storeInfo, setStoreInfo] = useState({
    name: "",
    username: "",
    description: "",
    email: "",
    contact: "",
    image: null,
    nationalIdImage: null,
  });
  const [address, setAddress] = useState(EMPTY_STORE_ADDRESS);

  const onChangeHandler = (e) => {
    setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value });
  };

  // Verification status comes from the backend (not just session.storeId): a seller
  // only gets dashboard access once an admin approves, so a pending/rejected applicant
  // sees their status here instead of re-submitting the form.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Wait for the cookie session probe before deciding the user is logged out.
      if (!bootstrapped) return;
      if (!session?.userId) {
        setLoading(false);
        return;
      }
      const app = await fetchMyApplication();
      if (cancelled) return;
      if (app.hasApplication) {
        setAlreadySubmitted(true);
        setStatus(app.status || "pending");
        if (app.status === "approved") {
          setMessage(
            "Your store is verified and active. Open your seller dashboard anytime.",
          );
        } else if (app.status === "rejected") {
          setMessage(
            "Your store application wasn't approved. Email manziliproject@gmail.com if you'd like to know why or to re-apply.",
          );
        } else if (app.status === "deleted") {
          setMessage(
            "This store has been removed. Contact manziliproject@gmail.com if you think this is a mistake.",
          );
        } else {
          setMessage(
            "Your application is under review. We'll notify you as soon as an admin verifies your store — usually within a day or two.",
          );
        }
      }
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [bootstrapped, session?.userId]);

  const hasAutofilled = useRef(false);
  useEffect(() => {
    if (hasAutofilled.current) return;
    if (!session?.email && !session?.name) return;
    hasAutofilled.current = true;
    setStoreInfo((prev) => ({
      ...prev,
      ...(session.email && !prev.email ? { email: session.email } : {}),
      ...(session.name && !prev.name ? { name: session.name } : {}),
    }));
  }, [session?.email, session?.name]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!session?.userId) {
      toast.error("Please log in to register a store");
      router.push("/login");
      throw new Error("Not logged in");
    }

    const name = storeInfo.name.trim();
    const usernameRaw = sanitizeUsername(storeInfo.username);
    const email = storeInfo.email.trim();
    const contact = storeInfo.contact.trim();

    if (!name || !usernameRaw || !email || !contact) {
      toast.error("Fill in store name, username, email, and contact");
      throw new Error("Incomplete form");
    }

    if (
      !address.bostaCityId ||
      !address.bostaZoneId ||
      !address.bostaDistrictId ||
      !address.street.trim()
    ) {
      toast.error(
        "Pick a city, zone, district and enter a street for the store address",
      );
      throw new Error("Incomplete address");
    }

    if (!(storeInfo.nationalIdImage instanceof File)) {
      toast.error("Please upload your National ID card photo for verification");
      throw new Error("National ID required");
    }

    // Upload the logo (optional) and the national ID (required) and send their
    // hosted URLs with the application.
    let logoUrl = "";
    if (storeInfo.image instanceof File) {
      logoUrl = (await uploadImage(storeInfo.image)) || "";
    }
    const nationalIdUrl = (await uploadImage(storeInfo.nationalIdImage)) || "";
    if (!nationalIdUrl) {
      toast.error("Could not upload the National ID image — please try again");
      throw new Error("National ID upload failed");
    }

    // Submit the application to the .NET backend. The store is created pending
    // admin review — the session storeId is set later, on approval.
    // Compose the warehouse street line from the structured address fields.
    const pickupFirstLine = [
      address.street,
      address.building && `Bldg ${address.building}`,
      address.floor && `Fl ${address.floor}`,
      address.apartment && `Apt ${address.apartment}`,
    ]
      .filter(Boolean)
      .join(", ");

    const msg = await applyForStore({
      name,
      description: storeInfo.description.trim(),
      email,
      contact,
      logo: logoUrl,
      address: formatStoreAddress(address),
      nationalIdImage: nationalIdUrl,
      username: `${usernameRaw}`,
      // Becomes the seller's first (default) warehouse so Bosta can collect from day one.
      pickup: {
        firstLine: pickupFirstLine,
        city: address.bostaCityName,
        bostaCityId: address.bostaCityId,
        bostaZoneId: address.bostaZoneId,
        bostaDistrictId: address.bostaDistrictId,
        contactName: name,
        phone: contact,
      },
    });

    setAlreadySubmitted(true);
    setStatus("pending");
    setMessage(
      msg ||
        "Your store profile was submitted. An admin will review it shortly.",
    );
    toast.success("Store application submitted");
  };

  if (!loading && !session?.userId) {
    return (
      <div className="mx-6 min-h-[70vh] my-16 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-slate-600 max-w-md">
          Log in or create an account before registering as a seller.
        </p>
        <Link
          href="/login"
          className="text-[#2582eb] font-medium hover:underline"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return !loading ? (
    <>
      {!alreadySubmitted ? (
        <div className="mx-6 min-h-[70vh] my-16">
          <form
            onSubmit={(e) =>
              toast.promise(onSubmitHandler(e), {
                loading: t('common.loading'),
                success: "Done",
                error: (err) => err?.message || t('common.error'),
              })
            }
            className="max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500"
          >
            <div>
              <h1 className="text-3xl ">
                {t('createStore.title')}
              </h1>
              <p className="max-w-lg">
                {t('createStore.subtitle')}
              </p>
            </div>

            <label className="mt-10 cursor-pointer">
              {t('createStore.logo')}
              <Image
                src={
                  storeInfo.image instanceof File
                    ? URL.createObjectURL(storeInfo.image)
                    : assets.upload_area
                }
                className="rounded-lg mt-2 h-16 w-auto object-contain max-w-[200px]"
                alt=""
                width={150}
                height={100}
                unoptimized={storeInfo.image instanceof File}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setStoreInfo({
                    ...storeInfo,
                    image: e.target.files?.[0] || null,
                  })
                }
                hidden
              />
            </label>

            <label className="mt-6 cursor-pointer block w-full max-w-lg">
              National ID Card Photo (Required for Verification)
              <div className="border border-dashed border-slate-300 rounded-lg p-4 mt-2 hover:border-slate-400 transition flex items-center justify-center bg-slate-50 min-h-[120px] max-w-lg">
                {storeInfo.nationalIdImage ? (
                  <div className="relative w-full h-24 flex items-center justify-center">
                    <Image
                      src={
                        storeInfo.nationalIdImage instanceof File
                          ? URL.createObjectURL(storeInfo.nationalIdImage)
                          : storeInfo.nationalIdImage
                      }
                      className="rounded-lg object-contain max-h-24"
                      alt=""
                      width={150}
                      height={100}
                      unoptimized={storeInfo.nationalIdImage instanceof File}
                    />
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center gap-1.5">
                    <CameraIcon size={24} className="text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">
                      Upload ID Card Photo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG
                    </span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setStoreInfo({
                    ...storeInfo,
                    nationalIdImage: e.target.files?.[0] || null,
                  })
                }
                hidden
                required
              />
            </label>

            <p>{t('createStore.storeName')}</p>
            <input
              name="username"
              onChange={onChangeHandler}
              value={storeInfo.username}
              type="text"
              placeholder="your_store_name"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
              required
            />

            <p>Owner / Contact Person Name</p>
            <input
              name="name"
              onChange={onChangeHandler}
              value={storeInfo.name}
              type="text"
              placeholder="Enter contact person name"
              className={`border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded ${session?.name ? 'bg-slate-100 cursor-not-allowed' : ''}`}
              autoComplete="off"
              required
              readOnly={Boolean(session?.name)}
              title={session?.name ? 'Locked — uses your account name' : ''}
            />

            <p>{t('createStore.description')}</p>
            <textarea
              name="description"
              onChange={onChangeHandler}
              value={storeInfo.description}
              rows={5}
              placeholder="Enter your store description"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none"
            />

            <p>{t('createStore.email')}</p>
            <input
              name="email"
              onChange={onChangeHandler}
              value={storeInfo.email}
              type="email"
              placeholder="Enter your store email"
              className={`border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded ${session?.email ? 'bg-slate-100 cursor-not-allowed' : ''}`}
              autoComplete="off"
              required
              readOnly={Boolean(session?.email)}
              title={session?.email ? 'Locked — uses your account email' : ''}
            />

            <p>{t('createStore.contact')}</p>
            <input
              name="contact"
              onChange={onChangeHandler}
              value={storeInfo.contact}
              type="text"
              placeholder="Enter your store contact number"
              className="border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded"
              required
            />

            <p className="mt-2">{t('createStore.address')}</p>
            <p className="text-xs text-slate-400 -mt-2 max-w-lg">
              Pick governorate, zone and district from Bosta so shipments
              validate — same flow as the checkout address.
            </p>
            <StoreAddressFields value={address} onChange={setAddress} />

            <button
              type="submit"
              className="bg-slate-800 text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-slate-900 transition "
            >
              {t('common.submit')}
            </button>
          </form>
        </div>
      ) : (
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-5 px-6 text-center">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              status === "approved"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : status === "rejected" || status === "deleted"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {status === "approved"
              ? "Verified"
              : status === "rejected"
                ? "Not approved"
                : status === "deleted"
                  ? "Removed"
                  : "Under review"}
          </span>
          <p className="sm:text-2xl lg:text-3xl font-semibold text-slate-600 max-w-2xl">
            {message}
          </p>
          {status === "approved" ? (
            <Link
              href="/store"
              className="bg-slate-800 text-white px-6 py-2.5 rounded-full hover:bg-slate-900 transition-colors"
            >
              Open seller dashboard
            </Link>
          ) : (
            <Link href="/" className="text-[#2582eb] font-medium hover:underline">
              Back to home
            </Link>
          )}
        </div>
      )}
    </>
  ) : (
    <Loading />
  );
}
