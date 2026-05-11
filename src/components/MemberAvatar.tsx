import { useState } from 'react';
import { User } from 'lucide-react';

export type MemberAvatarProps = {
  /** Non-empty when image is decorative (name visible nearby). */
  url: string | null | undefined;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'partner' | 'accent';
  className?: string;
};

const sizeClass: Record<NonNullable<MemberAvatarProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconClass: Record<NonNullable<MemberAvatarProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const variantRing: Record<NonNullable<MemberAvatarProps['variant']>, string> = {
  default: 'bg-[#30353c] text-[#dee3eb] ring-white/10',
  partner: 'bg-[#30353c] text-partner ring-white/10',
  accent: 'bg-accent/10 text-accent ring-accent/20',
};

export default function MemberAvatar({
  url,
  label,
  size = 'md',
  variant = 'default',
  className = '',
}: MemberAvatarProps): JSX.Element {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(url && !broken);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ${sizeClass[size]} ${variantRing[variant]} ${className}`}
    >
      {showImg ? (
        <img
          src={url!}
          alt=""
          title={label}
          width={96}
          height={96}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      ) : (
        <User className={iconClass[size]} aria-hidden />
      )}
    </div>
  );
}
