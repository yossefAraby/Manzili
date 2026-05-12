import { createSlice } from '@reduxjs/toolkit';

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: [],
    },
    reducers: {
        setAddressList: (state, action) => {
            state.list = Array.isArray(action.payload) ? action.payload : [];
        },
        addAddress: (state, action) => {
            state.list.push(action.payload);
        },
    },
});

export const { addAddress, setAddressList } = addressSlice.actions;
export default addressSlice.reducer;
