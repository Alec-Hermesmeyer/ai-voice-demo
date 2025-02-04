import { createClient } from "@supabase/supabase-js"
import type { PhoneSystemSettings } from "./types"

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL")
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function savePhoneSystemSettings(settings: PhoneSystemSettings) {
  try {
    // First, check if any settings exist
    const { data: existingSettings } = await supabase.from("phone_system_settings").select("id").single()

    const { data, error } = await supabase
      .from("phone_system_settings")
      .upsert({
        // If we have existing settings, include the id
        ...(existingSettings?.id ? { id: existingSettings.id } : {}),
        company_info: settings.company_info,
        voice_prompts: settings.voice_prompts,
        call_routing: settings.call_routing,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error("Save error:", error)
    throw error
  }
}

export async function getPhoneSystemSettings() {
  try {
    const { data, error } = await supabase.from("phone_system_settings").select("*").single()

    // If no settings exist yet, return null without throwing an error
    if (error && error.code === "PGRST116") {
      return null
    }

    if (error) {
      console.error("Database error:", error)
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error("Fetch error:", error)
    throw error
  }
}

