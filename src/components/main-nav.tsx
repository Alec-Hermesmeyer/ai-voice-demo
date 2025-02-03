"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Mic, Settings } from "lucide-react"

const routes = [
  {
    href: "/",
    label: "Voice Chat",
    icon: Mic,
  },
  {
    href: "/demos",
    label: "Voice Demos",
    icon: Settings,
  },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-2">
      {routes.map((route) => {
        const Icon = route.icon
        return (
          <Button
            key={route.href}
            variant={pathname === route.href ? "default" : "ghost"}
            className={cn("w-full justify-start", pathname === route.href && "bg-primary text-primary-foreground")}
            asChild
          >
            <Link href={route.href}>
              <Icon className="mr-2 h-4 w-4" />
              {route.label}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}

