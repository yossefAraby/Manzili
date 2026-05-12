import { createSlice } from '@reduxjs/toolkit';
import { productDummyData } from '@/assets/assets';
import { readStorageItems, STORAGE_KEYS } from '@/lib/storage/localStorageEnvelope';
import { mergeProductCatalog } from '@/lib/products/mergeCatalog';
import { normalizeProductList } from '@/lib/products/normalizeProduct';

function buildList() {
    if (typeof window === 'undefined') {
        return normalizeProductList(productDummyData);
    }
    const stored = readStorageItems(STORAGE_KEYS.PRODUCTS);
    return normalizeProductList(mergeProductCatalog(productDummyData, stored));
}

const productSlice = createSlice({
    name: 'product',
    initialState: {
        list: buildList(),
    },
    reducers: {
        setProduct: (state, action) => {
            state.list = normalizeProductList(action.payload);
        },
        addProduct: (state, action) => {
            state.list = [...state.list, normalizeProduct(action.payload)];
        },
        updateProduct: (state, action) => {
            const patch = action.payload;
            if (!patch?.id) return;
            state.list = state.list.map((x) =>
                x.id === patch.id
                    ? normalizeProduct({
                          ...x,
                          ...patch,
                          updatedAt: new Date().toISOString(),
                      })
                    : x,
            );
        },
        clearProduct: (state) => {
            state.list = [];
        },
        rehydrateProductsFromStorage: (state) => {
            const stored = readStorageItems(STORAGE_KEYS.PRODUCTS);
            state.list = normalizeProductList(mergeProductCatalog(productDummyData, stored));
        },
    },
});

export const { setProduct, addProduct, updateProduct, clearProduct, rehydrateProductsFromStorage } =
    productSlice.actions;
export default productSlice.reducer;
