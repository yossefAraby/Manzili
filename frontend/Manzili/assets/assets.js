import logo from "./logo.png";
import upload_area from "./upload_area.svg";
import hero_model_img from "./hero_model_img.png";
import hero_product_img1 from "./hero_product_img1.png";
import hero_product_img2 from "./hero_product_img2.png";
import product_img1 from "./product_img1.png";
import product_img2 from "./product_img2.png";
import product_img3 from "./product_img3.png";
import product_img4 from "./product_img4.png";
import product_img5 from "./product_img5.png";
import product_img6 from "./product_img6.png";
import product_img7 from "./product_img7.png";
import product_img8 from "./product_img8.png";
import product_img9 from "./product_img9.png";
import product_img10 from "./product_img10.png";
import product_img11 from "./product_img11.png";
import product_img12 from "./product_img12.png";
import { PenToolIcon, CheckCircleIcon, HeartIcon } from "lucide-react";

// Real, kept assets (brand images + UI placeholders).
export const assets = {
  upload_area,
  hero_model_img,
  hero_product_img1,
  hero_product_img2,
  logo,
  product_img1,
  product_img2,
  product_img3,
  product_img4,
  product_img5,
  product_img6,
  product_img7,
  product_img8,
  product_img9,
  product_img10,
  product_img11,
  product_img12,
};

export const categories = [
  "Jewelry",
  "Home Décor",
  "Ceramics & Pottery",
  "Woodwork",
  "Textiles & Clothing",
  "Accessories",
  "Bags & Leather",
  "Candles & Soap",
  "Art & Paintings",
  "Stationery",
  "Food & Sweets",
  "Fragrances & Beauty",
  "Crochet & Knitting",
];

export const ourSpecsData = [
  {
    title: "Bespoke Creations",
    description:
      "Collaborate directly with makers to design custom, one-of-a-kind pieces tailored to your personal vision.",
    icon: PenToolIcon,
    accent: "#2582eb",
  },
  {
    title: "Verified Quality",
    description:
      "Shop a curated selection of verified handmade goods, free from mass-produced factory clutter.",
    icon: CheckCircleIcon,
    accent: "#FF8904",
  },
  {
    title: "Support Local Makers",
    description:
      "Empower independent Egyptian talent and own unique products that carry a real story and heritage.",
    icon: HeartIcon,
    accent: "#A684FF",
  },
];

// ---------------------------------------------------------------------------
// Dummy/mock data has been REMOVED — the app is sourced entirely from the API.
// These exports remain as empty stubs only to satisfy any lingering imports;
// they intentionally contain no fake products, stores, ratings, or coupons.
// ---------------------------------------------------------------------------
export const productDummyData = [];
export const dummyStoreData = null;
export const storesDummyData = [];
export const dummyRatingsData = [];
export const addressDummyData = null;
export const couponDummyData = [];
export const dummyUserData = null;
export const orderDummyData = [];
export const dummyAdminDashboardData = {};
export const dummyStoreDashboardData = {};
