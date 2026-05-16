import { createSlice } from '@reduxjs/toolkit'

const notificationSlice = createSlice({
    name: 'notification',
    initialState: {
        list: [],
    },
    reducers: {
        setNotifications: (state, action) => {
            state.list = Array.isArray(action.payload) ? action.payload : []
        },
        addNotification: (state, action) => {
            state.list.unshift(action.payload)
        },
        markNotificationRead: (state, action) => {
            const id = action.payload
            const item = state.list.find((n) => n.id === id)
            if (item) item.read = true
        },
        markAllNotificationsRead: (state) => {
            state.list.forEach((n) => {
                n.read = true
            })
        },
        removeNotification: (state, action) => {
            state.list = state.list.filter((n) => n.id !== action.payload)
        },
        clearNotifications: (state) => {
            state.list = []
        },
    },
})

export const {
    setNotifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearNotifications,
} = notificationSlice.actions

export default notificationSlice.reducer
