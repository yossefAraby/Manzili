import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as notificationsApi from '@/lib/api/notifications'

// --- Async thunks (API-backed, fail safe) ---------------------------------
//
// The existing sync reducers are preserved (StoreProvider preloads via `setNotifications`,
// NotificationBell reads the list and uses `markNotificationRead`/`markAllNotificationsRead`/
// `removeNotification`). The thunks below hydrate from / mark read on the .NET API. They return
// empty/false for guests so the bell renders an empty "all caught up" state without crashing.

/** Load the server notifications and replace the local list. */
export const hydrateNotifications = createAsyncThunk('notification/hydrate', async () => {
    const list = await notificationsApi.fetchNotifications() // [] when logged out / on error
    return list
})

/** Mark one notification read server-side; the matching sync action handles local state. */
export const markNotificationReadRemote = createAsyncThunk(
    'notification/markReadRemote',
    async (id, { dispatch }) => {
        dispatch(markNotificationRead(id)) // optimistic
        await notificationsApi.markRead(id)
        return id
    }
)

/** Mark all unread notifications read server-side, one PATCH per item. */
export const markAllNotificationsReadRemote = createAsyncThunk(
    'notification/markAllReadRemote',
    async (_, { getState, dispatch }) => {
        const unread = getState().notification.list.filter((n) => !n.read).map((n) => n.id)
        dispatch(markAllNotificationsRead()) // optimistic
        await Promise.all(unread.map((id) => notificationsApi.markRead(id)))
        return unread
    }
)

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
    extraReducers: (builder) => {
        builder.addCase(hydrateNotifications.fulfilled, (state, action) => {
            if (Array.isArray(action.payload)) state.list = action.payload
        })
        // markRead* thunks rely on their optimistic sync actions for local state.
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
