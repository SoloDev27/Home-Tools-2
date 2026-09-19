export const DEMO_BACKEND_API = import.meta.env.MODE === 'development' ? '' : window.location.origin;

export async function checkAndReturnRes(res) {
    const data = await res.json();
    return { ok: res.ok, data };
}