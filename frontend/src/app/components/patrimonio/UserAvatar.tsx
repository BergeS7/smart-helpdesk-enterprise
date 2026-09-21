/**
 * Responsabilidade: Avatar do usuário responsável por um ativo (foto ou iniciais).
 */
const sizes = { sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-14 w-14 text-base" } as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function UserAvatar({ name, photoUrl, size = "md" }: { name: string; photoUrl?: string | null; size?: keyof typeof sizes }) {
  return (
    <span title={name} className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-blue-500 to-sky-400 font-black text-white shadow-sm ${sizes[size]}`}>
      {photoUrl ? <img src={photoUrl} alt={name} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}
