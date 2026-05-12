import { bostaFetch } from '@/lib/bosta/client';

export async function createDelivery(payload) {
    return bostaFetch('/deliveries', {
        method: 'POST',
        query: { apiVersion: 1 },
        body: payload,
    });
}

export async function viewDeliveryByTrackingNumber(trackingNumber) {
    return bostaFetch(`/deliveries/business/${encodeURIComponent(trackingNumber)}`, {
        method: 'GET',
    });
}

export async function terminateDelivery(trackingNumber) {
    return bostaFetch(`/deliveries/business/${encodeURIComponent(trackingNumber)}/terminate`, {
        method: 'DELETE',
    });
}

