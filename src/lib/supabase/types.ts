export type PhoneSystemSettings = {
    id?: string
    created_at?: string
    company_info: {
      name: string
      phone_number: string
      business_hours: {
        opening: string
        closing: string
      }
    }
    voice_prompts: {
      welcome_message: string
      after_hours_message: string
      tour_information: string
    }
    call_routing: {
      booking_number: string
      emergency_contact: string
      voicemail_greeting: string
    }
    knowledge_base: {
      rag_service_url: string
      company_info: string
    }
  }
  
  