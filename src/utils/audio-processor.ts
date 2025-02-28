/**
 * Converts audio data to the correct format for Deepgram
 * @param audioBlob The audio blob to convert
 * @returns A Promise that resolves to the converted audio blob
 */
export async function convertAudioForDeepgram(audioBlob: Blob): Promise<Blob> {
    // This is a placeholder for more complex audio conversion
    // In a real application, you might need to convert between formats
    return audioBlob
  }
  
  /**
   * Calculates the audio level from an analyzer node
   * @param analyser The AnalyserNode to get data from
   * @returns A value between 0 and 1 representing the audio level
   */
  export function getAudioLevel(analyser: AnalyserNode): number {
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(dataArray)
  
    // Calculate average level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    return average / 128 // Normalize to 0-1
  }
  