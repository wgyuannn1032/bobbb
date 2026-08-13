import { ReactNode } from 'react'
import { IconArrowLeft, IconMenu2 } from '@tabler/icons-react'

interface Props {
  onOpenSidebar?: () => void
  onBack?: () => void
  backLabel?: string
  title?: string
  titleIcon?: ReactNode
  children?: ReactNode
}

export default function AppNav({
  onOpenSidebar,
  onBack,
  backLabel = '返回首頁',
  title,
  titleIcon,
  children,
}: Props) {
  return (
    <header className="app-nav sticky top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center border-b px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="app-text-muted app-hover rounded-lg p-2 transition lg:hidden"
            aria-label="開啟選單"
          >
            <IconMenu2 size={22} aria-hidden="true" />
          </button>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="app-text-secondary app-hover flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition"
          >
            <IconArrowLeft size={17} aria-hidden="true" />
            {backLabel}
          </button>
        )}
      </div>

      {title ? (
        <span className="app-text flex items-center gap-1.5 font-semibold">
          {titleIcon}
          {title}
        </span>
      ) : <span />}

      <div className="relative flex items-center justify-self-end">{children}</div>
    </header>
  )
}
