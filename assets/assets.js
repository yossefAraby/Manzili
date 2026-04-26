import logo from "./logo.png"
import happy_store from "./happy_store.webp"
import upload_area from "./upload_area.svg"
import hero_model_img from "./hero_model_img.png"
import hero_product_img1 from "./hero_product_img1.png"
import hero_product_img2 from "./hero_product_img2.png"
import product_img1 from "./product_img1.png"
import product_img2 from "./product_img2.png"
import product_img3 from "./product_img3.png"
import product_img4 from "./product_img4.png"
import product_img5 from "./product_img5.png"
import product_img6 from "./product_img6.png"
import product_img7 from "./product_img7.png"
import product_img8 from "./product_img8.png"
import product_img9 from "./product_img9.png"
import product_img10 from "./product_img10.png"
import product_img11 from "./product_img11.png"
import product_img12 from "./product_img12.png"
import hand_made_logo from "./hand_made_logo.png"
import tasty_home_logo from "./tasty_home_logo.png"
import teeba_logo from "./teeba_logo.png"
import { PenToolIcon, CheckCircleIcon, HeartIcon } from "lucide-react";
import profile_pic1 from "./profile_pic1.jpg"
import profile_pic2 from "./profile_pic2.jpg"
import profile_pic3 from "./profile_pic3.jpg"

export const assets = {
    upload_area,
    hero_model_img, hero_product_img1, hero_product_img2, logo,
    product_img1, product_img2, product_img3, product_img4, product_img5, product_img6,
    product_img7, product_img8, product_img9, product_img10, product_img11, product_img12,
}

export const categories = [
  "Woodwork",
  "Jewelry",
  "Stationery",
  "Food & Snacks",
  "fragrances",
  "Textiles",
  "Porcelain"
];

export const dummyRatingsData = [
    { id: "rat_1", rating: 4.2, review: "I was a bit skeptical at first, but this product turned out to be even better than I imagined. The quality feels premium, it's easy to use, and it delivers exactly what was promised. I've already recommended it to friends and will definitely purchase again in the future.", user: { name: 'Kristin Watson', image: profile_pic1 }, productId: "prod_1", createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', updatedAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', product: { name: 'Wooden Key Holder', category:'Woodwork', id:'prod_1'} },
    { id: "rat_2", rating: 5.0, review: "This product is great. I love it!  You made it so simple. My new site is so much faster and easier to work with than my old site.", user: { name: 'Jenny Wilson', image: profile_pic2 }, productId: "prod_2", createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', updatedAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', product: { name: 'Beaded Bracelet', category:'Jewelry', id:'prod_2'} },
    { id: "rat_3", rating: 4.1, review: "This product is amazing. I love it!  You made it so simple. My new site is so much faster and easier to work with than my old site.", user: { name: 'Bessie Cooper', image: profile_pic3 }, productId: "prod_3", createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', updatedAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', product: { name: 'Simple Necklace', category:'Jewelry', id:'prod_3'} },
    { id: "rat_4", rating: 5.0, review: "This product is great. I love it!  You made it so simple. My new site is so much faster and easier to work with than my old site.", user: { name: 'Kristin Watson', image: profile_pic1 }, productId: "prod_4", createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', updatedAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', product: { name: 'Resin Ring', category:'Jewelry', id:'prod_4'} },
    { id: "rat_5", rating: 4.3, review: "Overall, I'm very happy with this purchase. It works as described and feels durable. The only reason I didn't give it five stars is because of a small issue (such as setup taking a bit longer than expected, or packaging being slightly damaged). Still, highly recommend it for anyone looking for a reliable option.", user: { name: 'Jenny Wilson', image: profile_pic2 }, productId: "prod_5", createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', updatedAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', product: { name: 'Handmade Notebook', category:'Stationery', id:'prod_5'} },
    { id: "rat_6", rating: 5.0, review: "This product is great. I love it!  You made it so simple. My new site is so much faster and easier to work with than my old site.", user: { name: 'Bessie Cooper', image: profile_pic3 }, productId: "prod_6", createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', updatedAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)', product: { name: 'Decorated Journal', category:'Stationery', id:'prod_6'} },
]

export const dummyStoreData = {
    id: "store_1",
    userId: "user_1",
    name: "Nour Handmade & Crafts",
    description: "Your destination for bespoke handcrafted jewelry, premium personalized stationery, and beautifully designed wooden home accessories.",
    username: "nourhandmade",
    address: "123 Artisan Street, Cairo, Egypt",
    status: "approved",
    isActive: true,
    logo: hand_made_logo,
    email: "nour@example.com",
    contact: "+20 1234567890",
    createdAt: "2025-09-04T09:04:16.189Z",
    updatedAt: "2025-09-04T09:04:44.273Z",
    user: {
        id: "user_31dOriXqC4TATvc0brIhlYbwwc5",
        name: "Nour Artisan",
        email: "nour.artisan@example.com",
        image: logo,
    }
}

export const productDummyData = [
    {
        id: "prod_1",
        name: "Wooden Key Holder",
        description: "Simple circular metal keychain with a polished finish and durable ring attachment. Lightweight and sturdy, suitable for everyday use or promotional purposes.",
        mrp: 375,
        price: 375,
        images: [product_img1],
        category: "Woodwork",
        storeId: "store_1",
        inStock: true,
        store: dummyStoreData,
        rating: dummyRatingsData,
        createdAt: 'Sat Jul 29 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 29 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_2",
        name: "Beaded Bracelet",
        description: "Polished round metal keychain with a smooth chrome finish. Lightweight, durable, and suitable for daily use or gifting.",
        mrp: 150,
        price: 150,
        images: [product_img2],
        storeId: "store_1",
        inStock: true,
        store: dummyStoreData,
        category: "Jewelry",
        rating: dummyRatingsData,
        createdAt: 'Sat Jul 28 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 28 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_3",
        name: "Simple Necklace",
        description: "Simple round metal keychain with glossy finish and strong ring attachment. Minimal design, ideal for accessories or promotional use.",
        mrp: 225,
        price: 225,
        images: [product_img3],
        storeId: "store_1",
        inStock: true,
        store: dummyStoreData,
        category: "Jewelry",
        rating: dummyRatingsData,
        createdAt: 'Sat Jul 27 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 27 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_4",
        name: "Resin Ring",
        description: "Handcrafted ring made from natural wood combined with black epoxy resin. Features a smooth polished finish and unique organic pattern, giving it a modern and elegant handmade look.",
        mrp: 175,
        price: 175,
        images: [product_img4],
        storeId: "store_1",
        inStock: true,
        store: dummyStoreData,
        category: "Jewelry",
        rating: dummyRatingsData,
        createdAt: 'Sat Jul 26 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 26 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_5",
        name: "Handmade Notebook",
        description: "A classic-style notebook with a durable natural leather cover and high-quality inner pages. Perfect for daily writing, note-taking, or sketching, and easy to carry for everyday use.",
        mrp: 200,
        price: 200,
        images: [product_img5],
        storeId: "store_1",
        inStock: true,
        store: dummyStoreData,
        category: "Stationery",
        rating: [...dummyRatingsData,...dummyRatingsData],
        createdAt: 'Sat Jul 25 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 25 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_6",
        name: "Decorated Journal",
        description: "A stylish lined journal page with decorative blue and green border design, clipped on a metal clipboard. Comes with markers, ideal for note-taking, journaling, or creative writing.",
        mrp: 250,
        price: 250,
        images: [product_img6],
        storeId: "store_1",
        inStock: true,
        store: dummyStoreData,
        category: "Stationery",
        rating: [...dummyRatingsData,...dummyRatingsData],
        createdAt: 'Sat Jul 25 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 25 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_7",
        name: "Homemade Cookies",
        description: "Golden brown homemade cookies just out of the oven with soft center and slightly crispy edges. Warm, fresh, and ideal as a dessert or snack.",
        mrp: 375,
        price: 375,
        images: [product_img7],
        storeId: "store_2",
        inStock: true,
        store: dummyStoreData,
        category: "Food & Snacks",
        rating: [...dummyRatingsData,...dummyRatingsData],
        createdAt: 'Sat Jul 24 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 24 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_8",
        name: "Stuffed Pastries",
        description: "Homemade pastries with different fillings, freshly baked with love and care. Perfect for breakfast or as a sweet treat.",
        mrp: 325,
        price: 325,
        images: [product_img8],
        storeId: "store_2",
        inStock: true,
        store: dummyStoreData,
        category: "Food & Snacks",
        rating: [...dummyRatingsData,...dummyRatingsData],
        createdAt: 'Sat Jul 23 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 23 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_9",
        name: "Scented Wood Tray",
        description: "Elegant wooden serving tray with a subtle natural fragrance, crafted from high-quality wood. Perfect for serving drinks or adding a natural touch to your home decor while providing a pleasant aroma.",
        mrp: 540,
        price: 540,
        images: [product_img9],
        storeId: "store_1",
        inStock: true,
        store: dummyStoreData,
        category: "fragrances",
        rating: [...dummyRatingsData,...dummyRatingsData],
        createdAt: 'Sat Jul 22 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 22 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_10",
        name: "Towels Sets",
        description: "Highly absorbent and ultra-soft towel sets, perfect for everyday use and a luxurious feel after every shower.",
        mrp: 500,
        price: 500,
        images: [product_img10],
        storeId: "store_3",
        inStock: true,
        store: dummyStoreData,
        category: "Textiles",
        rating: [...dummyRatingsData,...dummyRatingsData],
        createdAt: 'Sat Jul 21 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 21 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_11",
        name: "Ceramic Dinner Sets",
        description: "Elegant and durable ceramic dinner sets, perfect for everyday dining and special occasions, combining style with long-lasting quality.",
        mrp: 1200,
        price: 1200,
        images: [product_img11],
        storeId: "store_3",
        inStock: true,
        store: dummyStoreData,
        category: "Porcelain",
        rating: [...dummyRatingsData,...dummyRatingsData],
        createdAt: 'Sat Jul 20 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 20 2025 14:51:25 GMT+0530 (India Standard Time)',
    },
    {
        id: "prod_12",
        name: "Ceramic Vases & Decor",
        description: "Beautiful ceramic vases and decor pieces designed to enhance any space with a touch of artistic elegance and modern charm.",
        mrp: 480,
        price: 480,
        images: [product_img12],
        storeId: "store_3",
        inStock: true,
        store: dummyStoreData,
        category: "Porcelain",
        rating: [...dummyRatingsData,...dummyRatingsData],
        createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)',
        updatedAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)',
    }
];

export const ourSpecsData = [
    { title: "Bespoke Creations", description: "Collaborate directly with makers to design custom, one-of-a-kind pieces tailored to your personal vision.", icon: PenToolIcon, accent: '#2582eb' },
    { title: "Verified Quality", description: "Shop a curated selection of verified handmade goods, free from mass-produced factory clutter.", icon: CheckCircleIcon, accent: '#FF8904' },
    { title: "Support Local Makers", description: "Empower independent Egyptian talent and own unique products that carry a real story and heritage.", icon: HeartIcon, accent: '#A684FF' }
]

export const addressDummyData = {
    id: "addr_1",
    userId: "user_1",
    name: "John Doe",
    email: "johndoe@example.com",
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "USA",
    phone: "1234567890",
    createdAt: 'Sat Jul 19 2025 14:51:25 GMT+0530 (India Standard Time)',
}

export const couponDummyData = [
    { code: "NEW20", description: "20% Off for New Users", discount: 20, forNewUser: true, forMember: false, isPublic: false, expiresAt: "2026-12-31T00:00:00.000Z", createdAt: "2025-08-22T08:35:31.183Z" },
    { code: "NEW10", description: "10% Off for New Users", discount: 10, forNewUser: true, forMember: false, isPublic: false, expiresAt: "2026-12-31T00:00:00.000Z", createdAt: "2025-08-22T08:35:50.653Z" },
    { code: "OFF20", description: "20% Off for All Users", discount: 20, forNewUser: false, forMember: false, isPublic: false, expiresAt: "2026-12-31T00:00:00.000Z", createdAt: "2025-08-22T08:42:00.811Z" },
    { code: "OFF10", description: "10% Off for All Users", discount: 10, forNewUser: false, forMember: false, isPublic: false, expiresAt: "2026-12-31T00:00:00.000Z", createdAt: "2025-08-22T08:42:21.279Z" },
    { code: "PLUS10", description: "20% Off for Members", discount: 10, forNewUser: false, forMember: true, isPublic: false, expiresAt: "2027-03-06T00:00:00.000Z", createdAt: "2025-08-22T11:38:20.194Z" }
]

export const dummyUserData = {
    id: "user_31dQbH27HVtovbs13X2cmqefddM",
    name: "Nour Artisan",
    email: "nour.artisan@example.com",
    image: logo,
    cart: {}
}

export const orderDummyData = [
    {
        id: "order_1",
        total: 525,
        status: "DELIVERED",
        userId: "user_31dQbH27HVtovbs13X2cmqefddM",
        storeId: "store_1",
        addressId: "addr_1",
        isPaid: false,
        paymentMethod: "COD",
        createdAt: "2025-08-22T09:15:03.929Z",
        updatedAt: "2025-08-22T09:15:50.723Z",
        isCouponUsed: true,
        coupon: dummyRatingsData[2],
        orderItems: [
            { orderId: "order_1", productId: "prod_1", quantity: 1, price: 375, product: productDummyData[0], },
            { orderId: "order_1", productId: "prod_2", quantity: 1, price: 150, product: productDummyData[1], }
        ],
        address: addressDummyData,
        user: dummyUserData
    },
    {
        id: "order_2",
        total: 700,
        status: "DELIVERED",
        userId: "user_31dQbH27HVtovbs13X2cmqefddM",
        storeId: "store_1",
        addressId: "addr_1",
        isPaid: false,
        paymentMethod: "COD",
        createdAt: "2025-08-22T09:14:35.923Z",
        updatedAt: "2025-08-22T09:15:52.535Z",
        isCouponUsed: true,
        coupon: couponDummyData[0],
        orderItems: [
            { orderId: "order_2", productId: "prod_3", quantity: 1, price: 225, product: productDummyData[2], },
            { orderId: "order_2", productId: "prod_4", quantity: 1, price: 175, product: productDummyData[3], },
            { orderId: "order_2", productId: "prod_5", quantity: 1, price: 200, product: productDummyData[4], }
        ],
        address: addressDummyData,
        user: dummyUserData
    }
]

export const storesDummyData = [
    {
        id: "store_1",
        userId: "user_31dOriXqC4TATvc0brIhlYbwwc5",
        name: "Nour Handmade & Crafts",
        description: "Your destination for bespoke handcrafted jewelry, premium personalized stationery, and beautifully designed wooden home accessories.",
        username: "nourhandmade",
        address: "123 Artisan Street, Cairo, Egypt",
        status: "approved",
        isActive: true,
        logo: hand_made_logo,
        email: "nour@example.com",
        contact: "+20 1234567890",
        createdAt: "2025-08-22T08:22:16.189Z",
        updatedAt: "2025-08-22T08:22:44.273Z",
        user: dummyUserData,
    },
    {
        id: "store_2",
        userId: "user_31dQbH27HVtovbs13X2cmqefddM",
        name: "Tasty Home",
        description: "Comforting, homemade food, baked goods, and sweet snacks made with love.",
        username: "tastyhome",
        address: "456 Bakery Lane, Alexandria, Egypt",
        status: "approved",
        isActive: true,
        logo: tasty_home_logo,
        email: "tastyhome@example.com",
        contact: "+20 9876543210",
        createdAt: "2025-08-22T08:34:15.155Z",
        updatedAt: "2025-08-22T08:34:47.162Z",
        user: dummyUserData,
    },
    {
        id: "store_3",
        userId: "user_31dQbH27HVtovbs13X2cmqefddM",
        name: "Teeba Home & Living",
        description: "Everything you need to elevate your space, from high-quality textiles and elegant porcelain dinnerware to rich, inviting fragrances.",
        username: "teebahome",
        address: "789 Design Avenue, Giza, Egypt",
        status: "approved",
        isActive: true,
        logo: teeba_logo,
        email: "teeba@example.com",
        contact: "+20 1122334455",
        createdAt: "2025-08-22T08:42:15.155Z",
        updatedAt: "2025-08-22T08:42:47.162Z",
        user: dummyUserData,
    }
]

export const dummyAdminDashboardData = {
    "orders": 6,
    "stores": 3,
    "products": 12,
    "revenue": "1225.00",
    "allOrders": [
        { "createdAt": "2025-08-20T08:46:58.239Z", "total": 145.6 },
        { "createdAt": "2025-08-22T08:46:21.818Z", "total": 97.2 },
        { "createdAt": "2025-08-22T08:45:59.587Z", "total": 54.4 },
        { "createdAt": "2025-08-23T09:15:03.929Z", "total": 214.2 },
        { "createdAt": "2025-08-23T09:14:35.923Z", "total": 421.6 },
        { "createdAt": "2025-08-23T11:44:29.713Z", "total": 26.1 },
        { "createdAt": "2025-08-24T09:15:03.929Z", "total": 214.2 },
        { "createdAt": "2025-08-24T09:14:35.923Z", "total": 421.6 },
        { "createdAt": "2025-08-24T11:44:29.713Z", "total": 26.1 },
        { "createdAt": "2025-08-24T11:56:29.713Z", "total": 36.1 },
        { "createdAt": "2025-08-25T11:44:29.713Z", "total": 26.1 },
        { "createdAt": "2025-08-25T09:15:03.929Z", "total": 214.2 },
        { "createdAt": "2025-08-25T09:14:35.923Z", "total": 421.6 },
        { "createdAt": "2025-08-25T11:44:29.713Z", "total": 26.1 },
        { "createdAt": "2025-08-25T11:56:29.713Z", "total": 36.1 },
        { "createdAt": "2025-08-25T11:30:29.713Z", "total": 110.1 }
    ]
}

export const dummyStoreDashboardData = {
    "ratings": dummyRatingsData,
    "totalOrders": 2,
    "totalEarnings": 1225,
    "totalProducts": 7
}