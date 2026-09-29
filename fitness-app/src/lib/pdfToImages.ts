/**
 * Rendu d'un PDF en une image JPEG par page, côté navigateur.
 *
 * Chargé à la demande (import dynamique) : pdfjs-dist ne doit pas alourdir
 * le bundle initial pour les gens qui n'importent jamais de PDF.
 */
export interface PdfPageImage {
  /** Ex. « feuille-2021.pdf — page 2 » : affiché dans la liste de fichiers. */
  label: string
  file: File
}

const MAX_PAGES = 60 // au-delà, une feuille scannée en PDF sent le fichier corrompu ou le classeur complet égaré ici.

export async function pdfToImages(file: File): Promise<PdfPageImage[]> {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: buffer })
  const doc = await loadingTask.promise

  const pageCount = Math.min(doc.numPages, MAX_PAGES)
  const images: PdfPageImage[] = []

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await doc.getPage(pageNum)
    // 2x : une feuille manuscrite photographiée puis scannée a besoin de
    // résolution pour que l'OCR distingue les chiffres des répétitions.
    const viewport = page.getViewport({ scale: 2 })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) continue

    const baseName = file.name.replace(/\.pdf$/i, '')
    images.push({
      label: doc.numPages > 1 ? `${baseName} — page ${pageNum}` : baseName,
      file: new File([blob], `${baseName}-p${pageNum}.jpg`, { type: 'image/jpeg' })
    })
  }

  await loadingTask.destroy()
  return images
}
