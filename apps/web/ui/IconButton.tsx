import type * as React from 'react';

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const IconButton = ({
  children,
  className = '',
  ...props
}: IconButtonProps) => (
  <button
    className={`grid size-10 place-items-center rounded-md text-[#eaf0e9] transition hover:bg-[#30403a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83d2e5] disabled:cursor-not-allowed disabled:text-[#52635b] ${className}`}
    type="button"
    {...props}
  >
    {children}
  </button>
);
