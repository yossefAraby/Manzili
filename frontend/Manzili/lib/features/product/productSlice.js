import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { normalizeProduct, normalizeProductList } from '@/lib/products/normalizeProduct';
import { fetchProducts as apiFetchProducts } from '@/lib/api/products';

/**
 * The catalog is sourced exclusively from the .NET API now — no dummy data,
 * no localStorage merge. `fetchProducts` is the single source of truth.
 */
export const fetchProducts = createAsyncThunk(
    'product/fetchProducts',
    async (args = {}) => {
        const { items } = await apiFetchProducts({
            page: args.page ?? 1,
            limit: args.limit ?? 100,
            category: args.category,
            sortBy: args.sortBy,
            sortDir: args.sortDir,
        });
        return items;
    },
);

const productSlice = createSlice({
    name: 'product',
    initialState: {
        list: [],
        status: 'idle', // idle | loading | succeeded | failed
        error: null,
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
                    ? normalizeProduct({ ...x, ...patch, updatedAt: new Date().toISOString() })
                    : x,
            );
        },
        removeProduct: (state, action) => {
            const id = action.payload;
            state.list = state.list.filter((x) => x.id !== id);
        },
        clearProduct: (state) => {
            state.list = [];
        },
        // Retained as a no-op for legacy callers; the API is the source now.
        rehydrateProductsFromStorage: () => {},
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.list = normalizeProductList(action.payload || []);
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error?.message || 'Failed to load products';
                state.list = [];
            });
    },
});

export const { setProduct, addProduct, updateProduct, removeProduct, clearProduct, rehydrateProductsFromStorage } =
    productSlice.actions;
export default productSlice.reducer;
