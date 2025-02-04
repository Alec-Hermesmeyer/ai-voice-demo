import * as z from "zod"

export const phoneSystemSchema = z.object({
  companyInfo: z.object({
    name: z.string().min(2, "Company name must be at least 2 characters"),
    phoneNumber: z.string().min(10, "Please enter a valid phone number"),
    businessHours: z.object({
      opening: z.string().min(1, "Please select opening time"),
      closing: z.string().min(1, "Please select closing time"),
    }),
  }),
  voicePrompts: z.object({
    welcomeMessage: z.string().min(10, "Welcome message must be at least 10 characters"),
    afterHoursMessage: z.string().min(10, "After hours message must be at least 10 characters"),
    tourInformation: z.string().min(10, "Tour information must be at least 10 characters"),
  }),
  callRouting: z.object({
    bookingNumber: z.string().min(10, "Please enter a valid phone number"),
    emergencyContact: z.string().min(10, "Please enter a valid phone number"),
    voicemailGreeting: z.string().min(10, "Voicemail greeting must be at least 10 characters"),
  }),
  knowledgeBase: z.object({
    ragServiceUrl: z.string().url("Please enter a valid URL").optional(),
    companyInfo: z.string().min(10, "Company information must be at least 10 characters"),
  }),
})

export type PhoneSystemConfig = z.infer<typeof phoneSystemSchema>

export const defaultPhoneConfig: PhoneSystemConfig = {
  companyInfo: {
    name: "Dallas Boat Tours",
    phoneNumber: "",
    businessHours: {
      opening: "09:00",
      closing: "17:00",
    },
  },
  voicePrompts: {
    welcomeMessage:
      "Thank you for calling Dallas Boat Tours. Our AI assistant is here to help you with tour information and bookings.",
    afterHoursMessage:
      "We're currently closed. Our regular business hours are 9 AM to 5 PM Central Time. Please leave a message or call back during business hours.",
    tourInformation:
      "We offer scenic lake tours daily. Our most popular tour is the 2-hour sunset cruise on Lake Ray Hubbard.",
  },
  callRouting: {
    bookingNumber: "",
    emergencyContact: "",
    voicemailGreeting:
      "You've reached the voicemail for Dallas Boat Tours. Please leave your name, number, and a brief message, and we'll get back to you as soon as possible.",
  },
  knowledgeBase: {
    ragServiceUrl: "https://rag-livid.vercel.app",
    companyInfo:
      "Dallas Boat Tours offers scenic lake tours and private charters on Lake Ray Hubbard. We specialize in sunset cruises, private events, and corporate outings.",
  },
}

