import { createSlice } from '@reduxjs/toolkit'

const customRequestSlice = createSlice({
    name: 'customRequest',
    initialState: {
        list: [],
        loading: false,
        error: null,
    },
    reducers: {
        setCustomRequests: (state, action) => {
            state.list = action.payload
        },
        addCustomRequest: (state, action) => {
            state.list.unshift(action.payload)
        },
        updateCustomRequest: (state, action) => {
            const index = state.list.findIndex(r => r.id === action.payload.id)
            if (index !== -1) {
                state.list[index] = action.payload
            }
        },
        deleteCustomRequest: (state, action) => {
            state.list = state.list.filter(r => r.id !== action.payload)
        },
        clearCustomRequests: (state) => {
            state.list = []
        },
        setLoading: (state, action) => {
            state.loading = action.payload
        },
        setError: (state, action) => {
            state.error = action.payload
        }
    }
})

export const { 
    setCustomRequests, 
    addCustomRequest, 
    updateCustomRequest, 
    deleteCustomRequest, 
    clearCustomRequests,
    setLoading,
    setError
} = customRequestSlice.actions

export default customRequestSlice.reducer