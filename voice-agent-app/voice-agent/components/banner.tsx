"use client"

import { useState } from "react"
import { XIcon, LucideIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

interface BannerProps {
  title: string
  description: string
  buttonText: string
  buttonHref: string
  icon?: LucideIcon
  dismissible?: boolean
  className?: string
}

export default function Banner({
  title,
  description,
  buttonText,
  buttonHref,
  icon: Icon,
  dismissible = true,
  className,
}: BannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className={`bg-muted px-4 py-3 text-foreground ${className || ""}`}>
      <div className="flex gap-2 md:items-center">
        <div className="flex grow gap-3 md:items-center">
          {Icon && (
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 max-md:mt-0.5"
              aria-hidden="true"
            >
              <Icon className="opacity-80" size={16} />
            </div>
          )}
          <div className="flex grow flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex gap-2 max-md:flex-wrap">
              <Button size="sm" className="text-sm" asChild>
                <Link href={buttonHref}>{buttonText}</Link>
              </Button>
            </div>
          </div>
        </div>
        {dismissible && (
          <Button
            variant="ghost"
            className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent"
            onClick={() => setIsVisible(false)}
            aria-label="Close banner"
          >
            <XIcon
              size={16}
              className="opacity-60 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </Button>
        )}
      </div>
    </div>
  )
}
