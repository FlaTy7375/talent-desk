// Шрифт с кириллицей для PDF.
let cachedBase64 = null;

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function ensurePdfUnicodeFont(doc) {
  if (!cachedBase64) {
    const response = await fetch(
      "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf"
    );
    if (!response.ok) {
      throw new Error("Failed to load PDF font");
    }
    cachedBase64 = arrayBufferToBase64(await response.arrayBuffer());
  }
  doc.addFileToVFS("DejaVuSans.ttf", cachedBase64);
  doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
  doc.setFont("DejaVuSans", "normal");
}
