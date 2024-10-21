export async function fetchPdfAsBlob(url: string): Promise<Blob> {
  try {
    console.log('Attempting to fetch PDF from URL:', url);
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    console.error("Error fetching PDF:", error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error("This might be a CORS issue. Check your server's CORS configuration.");
    }
    throw new Error(`Failed to fetch PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}
