var zip = new JSZip()

/**
 * Generates a zip file.
 * @param {Compressor} images 
 * @returns the blob.
 */
function generateAsync(images) {
  return zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 1 },
    },
    (v) => console.log(v.percent)
  );
}