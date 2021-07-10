// @ts-check
"use strict";

class Compressor {
  /** @type {File} */
  originalFile;
  /** @type {string} */
  fileUrl;
  /** @type {File} */
  fileFile;
  /** @type {JSZip} */
  zip;
  currentQuality = 1;

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
    this.info = "Compressing..."
    const compressed = await imageCompression(this.originalFile, {
      initialQuality: quality,
      useWebWorker: true,
      maxIteration: 50
    });
    this.file = compressed
    this.currentQuality = quality
    this.info = this.originalSize + " -> " + this.newSize
    zip.file(this.originalFile.name, compressed)
  }

  get originalSize() {
    return filesize(this.originalFile.size);
  }

  get newSize() {
    return filesize(this.fileFile.size);
  }
}