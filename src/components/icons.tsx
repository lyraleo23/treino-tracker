import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const DumbbellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
  </Icon>
)

export const HistoryIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Icon>
)

export const ListIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </Icon>
)

export const SettingsIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
  </Icon>
)

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m14.5 5-7 7 7 7" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon strokeWidth="2.4" {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
)

export const PlusIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 7h16M10 7V5h4v2M6 7l1 12h10l1-12M10 11v5M14 11v5" />
  </Icon>
)

export const ArrowUpIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 19V6M6 12l6-6 6 6" />
  </Icon>
)

export const ArrowDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 5v13M6 12l6 6 6-6" />
  </Icon>
)

export const PlayIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M8 5.5v13l11-6.5z" />
  </Icon>
)

export const PauseIcon = (props: IconProps) => (
  <Icon fill="currentColor" stroke="none" {...props}>
    <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
  </Icon>
)

export const ResetIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 12a7.5 7.5 0 1 0 2.6-5.7" />
    <path d="M4 4v4h4" />
  </Icon>
)

export const ChartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 19V5M4 19h16" />
    <path d="m7.5 15 3.5-4 3 2.5 4.5-6" />
  </Icon>
)
