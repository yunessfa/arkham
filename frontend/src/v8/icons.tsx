/** Line icons drawn for Arkham: 24px grid, 1.6 stroke, currentColor. */
const paths: Record<string, string> = {
  home: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z",
  shop: "M12 2.8 19.7 7.2v9.6L12 21.2l-7.7-4.4V7.2zM12 7.5l3.9 2.25v4.5L12 16.5l-3.9-2.25v-4.5z",
  story: "M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5zM12 6v13.5",
  bag: "M5 8h14l-1 12.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8zM8.5 8V6.5a3.5 3.5 0 0 1 7 0V8",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8",
  close: "M6 6l12 12M18 6 6 18",
  menu: "M4 7h16M4 12h16M10 17h10",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  heart: "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z",
  truck: "M3 6h11v10H3zM14 9.5h4l3 3.5v3h-7M7 19a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 7 19zM17.5 19a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z",
  shield: "M12 3 5 6v5.5c0 4.3 3 7.8 7 9.5 4-1.7 7-5.2 7-9.5V6zM9 12l2.2 2.2L15.5 10",
  leaf: "M5 19C5 10 10 5 20 4c-.5 10-5.5 15-14.5 15zM5 19l8-8",
  jar: "M8 3h8v3H8zM7 6h10l1 3v10.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5V9zM6 11h12",
  arrow: "M15 5l-7 7 7 7",
  back: "M9 5l7 7-7 7",
  filter: "M4 6h16M7 12h10M10 18h4",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z",
  phone: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
  check: "M5 12.5l4.5 4.5L19 7.5",
  drop: "M12 3c3.5 4.4 6 7.8 6 11a6 6 0 0 1-12 0c0-3.2 2.5-6.6 6-11z",
  gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.2C7 7 9.5 7 12 7zm0 0c1.5-3 5-3.5 5-1.2C17 7 14.5 7 12 7z",
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 22, className = "", filled = false }: { name: IconName; size?: number; className?: string; filled?: boolean }) {
  return (
    <svg className={"ui-icon " + className} width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
