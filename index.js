'use strict'

class Compressor {
  /** @type {File} */
  originalFile
  /** @type {string} */
  fileUrl
  /** @type {File} */
  fileFile
  /** @type {JSZip} */
  zip
  currentQuality = 1
  compressionRatio = ''

  /**
   * @param {File} v
   */
  set file(v) {
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl)
    this.fileFile = v
    this.fileUrl = URL.createObjectURL(v)
  }

  /**
   * @param {File} originalFile
   * @param {JSZip} zip
   */
  constructor(originalFile, zip) {
    this.originalFile = originalFile
    this.file = originalFile
    this.zip = zip
  }

  /**
   * @param {File} originalFile
   * @param {JSZip} zip
   */
  static async create(originalFile, zip) {
    const item = new Compressor(originalFile, zip)
    await item.compress(50)
    return item
  }

  /**
   * @param {number} quality
   */
  async compress(quality) {
    quality /= 100
    this.compressionRatio = 'Compressing...'
    const compressed = await imageCompression(this.originalFile, {
      initialQuality: quality,
      useWebWorker: true,
      maxIteration: 50,
    })
    this.file = compressed
    this.currentQuality = quality
    this.compressionRatio = (
      this.originalFile.size / this.fileFile.size
    ).toFixed(2)
    zip.file(this.originalFile.name, compressed)
  }
}

var zip = new JSZip()

/**
 * Generates a zip file.
 * @param {Compressor} images
 * @returns the blob.
 */
function generateAsync(images) {
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  })
}

function getRows(a, n) {
  return a
    ?.map((v, i) => (i % n ? undefined : a.slice(i, i + n)))
    .filter((v) => v)
}

document.addEventListener('alpine:init', () => {
  Alpine.store('images', [])
})

let zipUrl = ''

function cleanOldZip() {
  if (!zipUrl) return
  URL.revokeObjectURL(zipUrl)
  Alpine.store('zip', '')
}

async function updateZip() {
  const zipBlob = await generateAsync()
  zipUrl = URL.createObjectURL(zipBlob)
  Alpine.store('zip', zipUrl)
}

async function compressImages(images, quality) {
  cleanOldZip()
  await Promise.all(images?.map((v) => v.compress(quality)))
  await updateZip()
}

async function addImages(images, event) {
  cleanOldZip()
  const files = event.target.files
  if (!files) return
  for (let i = 0; i < files.length; i++)
    images.push(await Compressor.create(files[i], zip))
  await updateZip()
}

function spaceSavings(images) {
  const original = images.reduce((p, c) => p + c.originalFile.size, 0)
  const compressed = images.reduce((p, c) => p + c.fileFile.size, 0)
  const result = (1 - compressed / original) * 100
  return result.toFixed(2)
}
