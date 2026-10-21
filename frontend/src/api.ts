export const fa = (n: any) =>
  new Intl.NumberFormat("fa-IR").format(Number(n || 0));
export const money = (n: any) => fa(n) + " تومان";
export const date = (n: any) => new Date(n).toLocaleString("fa-IR");
export function csrf() {
  return (
    document.cookie
      .split("; ")
      .find((s) => s.startsWith("csrftoken="))
      ?.split("=")[1] || ""
  );
}
function errorText(e: any): string {
  if (typeof e === "string") return e;
  if (Array.isArray(e)) return e.map(errorText).join("؛ ");
  if (e && typeof e === "object")
    return Object.values(e).map(errorText).join("؛ ");
  return "خطا در انجام درخواست";
}
export async function api(
  path: string,
  method = "GET",
  data?: any,
): Promise<any> {
  const body =
    data instanceof FormData
      ? data
      : data === undefined
        ? undefined
        : JSON.stringify(data);
  const headers: any = { "X-CSRFToken": csrf() };
  if (!(data instanceof FormData)) headers["Content-Type"] = "application/json";
  const r = await fetch("/api/v1/" + path, {
    method,
    credentials: "same-origin",
    headers,
    body,
  });
  if (r.status === 204) return null;
  const json = await r
    .json()
    .catch(() => ({ error: "پاسخ سرور قابل خواندن نیست." }));
  if (!r.ok) throw new Error(errorText(json.error || json));
  return json;
}
export const rows = (v: any) => (Array.isArray(v) ? v : v?.results || []);
export const statuses: any = {
  pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
  review: "نیازمند بررسی مالی",
};
