# Dummy Data Replacement Plan

## Current State Analysis
- **Current assets.js**: Contains 12 product dummy data items with generic electronics/products
- **Current product images**: product_img1.png through product_img16.png (16 images)
- **Current categories**: 7 categories (Woodwork, Jewelry, Stationery, Food & Snacks, fragrances, Textiles, Porcelain)
- **Current stores**: 2 stores (GreatStack, Happy Shop)

## Dummydata Resources
- **Total products in dummydata**: 21 products listed
- **Products with images**: 16 products have corresponding PNG files
- **Missing images**: 5 products (Bianco late, Sronger with you, Madawy, Bed Sheets Sets, Blankets & Throws)
- **Stores in dummydata**: 3 stores (Nour Handmade & Crafts, Tasty Home, Teeba Home & Living)
- **Logos available**: hand made logo.png, tasty home logo.png, Teeba.png, wooden logo.png

## Product Selection (12 products to match current count)

| # | Product Name | Category | Store | Image File | Price (EGP) |
|---|--------------|----------|-------|------------|-------------|
| 1 | Wooden Key Holder | Woodwork | Nour Handmade & Crafts | Wooden Key Holder.png | 375 |
| 2 | Beaded Bracelet | Jewelry | Nour Handmade & Crafts | Beaded Bracelet.png | 150 |
| 3 | Simple Necklace | Jewelry | Nour Handmade & Crafts | Simple Necklace.png | 225 |
| 4 | Resin Ring | Jewelry | Nour Handmade & Crafts | Resin Ring.png | 175 |
| 5 | Handmade Notebook | Stationery | Nour Handmade & Crafts | Handmade Notebook.png | 200 |
| 6 | Decorated Journal | Stationery | Nour Handmade & Crafts | Decorated Journal.png | 250 |
| 7 | Homemade Cookies | Food & Snacks | Tasty Home | Homemade Cookies.png | 375 |
| 8 | Stuffed Pastries | Food & Snacks | Tasty Home | Stuffed Pastries.png | 325 |
| 9 | Scented Wood Tray | fragrances | Nour Handmade & Crafts | Wooden Serving Tray.png | 540 |
| 10 | Towels Sets | Textiles | Teeba Home & Living | Towels Sets.png | 500 |
| 11 | Ceramic Dinner Sets | Porcelain | Teeba Home & Living | Ceramic Dinner Sets.png | 1200 |
| 12 | Ceramic Vases & Decor | Porcelain | Teeba Home & Living | Ceramic Vases & Decor.png | 480 |

**Note**: Product #9 "Scented Wood Tray" is reassigned from Woodworking to fragrances category since no fragrance images exist.

## Store Data

### Stores to Create
1. **Nour Handmade & Crafts**
   - Logo: hand made logo.png
   - Description: Your destination for bespoke handcrafted jewelry, premium personalized stationery, and beautifully designed wooden home accessories.
   - Products: 1-6, 9

2. **Tasty Home**
   - Logo: tasty home logo.png
   - Description: Comforting, homemade food, baked goods, and sweet snacks made with love.
   - Products: 7-8

3. **Teeba Home & Living**
   - Logo: Teeba.png
   - Description: Everything you need to elevate your space, from high-quality textiles and elegant porcelain dinnerware to rich, inviting fragrances.
   - Products: 10-12

## Implementation Steps

### 1. Copy Image Files
Copy selected PNG files from `dummydata/` to `assets/` folder:
- Wooden Key Holder.png → product_img1.png (or keep original name)
- Beaded Bracelet.png → product_img2.png
- Simple Necklace.png → product_img3.png
- Resin Ring.png → product_img4.png
- Handmade Notebook.png → product_img5.png
- Decorated Journal.png → product_img6.png
- Homemade Cookies.png → product_img7.png
- Stuffed Pastries.png → product_img8.png
- Wooden Serving Tray.png → product_img9.png
- Towels Sets.png → product_img10.png
- Ceramic Dinner Sets.png → product_img11.png
- Ceramic Vases & Decor.png → product_img12.png

**Alternative**: Keep original filenames and update imports accordingly.

### 2. Update assets.js Imports
Update import statements for product images. Either:
- Option A: Rename files to match existing product_imgX.png pattern
- Option B: Update import statements to use new filenames

### 3. Update productDummyData Array
Replace all 12 product objects with new data matching the selected products.

### 4. Update storesDummyData Array
Replace with 3 new store objects from dummydata.

### 5. Update dummyStoreData Object
Update to use one of the new stores (e.g., Nour Handmade & Crafts).

### 6. Update Logo Imports
Add imports for new store logos: hand_made_logo, tasty_home_logo, teeba_logo.

### 7. Verify Categories
Ensure categories array remains unchanged (already has 7 categories).

## Technical Considerations
1. **Image Naming**: Current code uses product_img1 through product_img12. Simplest approach is to overwrite these files with new images.
2. **Store References**: productDummyData references dummyStoreData. Need to ensure store IDs match.
3. **Rating Data**: dummyRatingsData references product names/categories - update to match new products.
4. **Hero Images**: hero_product_img1.png and hero_product_img2.png can be kept or replaced with dummydata versions.

## Files to Modify
1. `assets/assets.js` - Main data file
2. `assets/` folder - Image files
3. Possibly update any hardcoded product references in components

## Success Criteria
- All 7 categories represented in productDummyData
- 12 products total (matching current count)
- All products have corresponding images
- Stores data updated to match dummydata
- Application runs without import errors