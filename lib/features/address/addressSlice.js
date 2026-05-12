import { addressDummyData } from '@/assets/assets'
import { createSlice } from '@reduxjs/toolkit'
import { getInitialAddresses } from '@/lib/services/localStateBootstrap'

const addressSlice = createSlice({
    name: 'address',
    initialState: {
        list: getInitialAddresses() || [addressDummyData],
    },
    reducers: {
        addAddress: (state, action) => {
            state.list.push(action.payload)
        },
    }
})

export const { addAddress } = addressSlice.actions

export default addressSlice.reducer