const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"


export interface Document {
  id: string
  content: string
  metadata?: Record<string, any>
  score?: number
}

export interface SearchResponse {
  results: Document[]
  total: number
}

const fetchWithCORS = async (url: string, options: RequestInit = {}) => {
  const defaultOptions: RequestInit = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...options,
  }

  try {
    const response = await fetch(url, defaultOptions)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Request failed with status ${response.status}: ${errorText}`)
    }

    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return await response.json()
    }

    return await response.text()
  } catch (error) {
    console.error(`[API Error] ${url}:`, error)
    throw error
  }
}

export async function searchDocuments(query: string, limit = 5): Promise<SearchResponse> {
  const url = `${API_URL}/search`
  console.log("[searchDocuments] Sending request to:", url)

  return fetchWithCORS(url, {
    method: "POST",
    body: JSON.stringify({ query, limit }),
  })
}

export async function getDocuments(): Promise<Document[]> {
  const url = `${API_URL}/documents`
  console.log("[getDocuments] Sending request to:", url)

  return fetchWithCORS(url)
}

export async function addDocument(content: string, metadata: Record<string, any> = {}): Promise<Document> {
  const url = `${API_URL}/documents`
  console.log("[addDocument] Sending request to:", url)

  return fetchWithCORS(url, {
    method: "POST",
    body: JSON.stringify({
      text: content,
      metadata,
    }),
  })
}

export async function deleteDocument(id: string): Promise<void> {
  const url = `${API_URL}/documents/${id}`
  console.log("[deleteDocument] Sending request to:", url)

  return fetchWithCORS(url, {
    method: "DELETE",
  })
}

export async function uploadFile(file: File): Promise<Document> {
  const url = `${API_URL}/upload`
  console.log("[uploadFile] Sending request to:", url)

  const formData = new FormData()
  formData.append("file", file)

  return fetchWithCORS(url, {
    method: "POST",
    headers: {}, // Let the browser set the correct Content-Type for FormData
    body: formData,
  })
}

