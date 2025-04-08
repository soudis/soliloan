"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAppStore, type ColorScheme } from "@/store"
import { useEffect } from "react"

const themes: { value: ColorScheme; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "ocean", label: "Ocean" },
  { value: "forest", label: "Forest" },
  { value: "sunset", label: "Sunset" },
  { value: "lavender", label: "Lavender" },
]

export function ThemeSelector() {
  const { colorScheme, setColorScheme } = useAppStore()

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorScheme)
  }, [colorScheme])

  return (
    <Select value={colorScheme} onValueChange={(value) => setColorScheme(value as ColorScheme)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select theme" />
      </SelectTrigger>
      <SelectContent>
        {themes.map((theme) => (
          <SelectItem key={theme.value} value={theme.value}>
            {theme.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 