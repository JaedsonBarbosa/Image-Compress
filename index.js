import imageCompression from "browser-image-compression";
import filesize from "filesize";
import JSZip from "jszip";

function jump(hash: string): void {
  location.replace("#" + hash);
}

class Image {
  originalFile: File;
  compressedFile: Blob;
  compressedData: string;
  currentCompressedQuality: number;

  public constructor(file: File) {
    this.originalFile = file;
    this.currentCompressedQuality = 1;
  }

  public get originalSize(): string {
    return filesize(this.originalFile.size);
  }

  public get newSize(): string {
    return filesize(this.compressedFile.size);
  }

  public async compress(
    quality: number,
    onProgress: (progress: number) => void
  ): Promise<void> {
    try {
      this.compressedFile = await imageCompression(this.originalFile, {
        initialQuality: quality,
        useWebWorker: true,
        maxIteration: 50,
        onProgress: onProgress,
      });
      this.compressedData = URL.createObjectURL(this.compressedFile)
      this.currentCompressedQuality = quality;
    } catch (error) {
      console.log(error);
    }
  }

  public createView(index: number, total: number): string {
    return `
        <div id="item-${index}" class="carousel-item">
            <h2 style="margin: 0;">Image ${
              index + 1
            } of ${total}<span> was compressed from ${this.originalSize} to ${
      this.newSize
    }</span></h2>
            <div style="position: relative;">
            <div style="width: 100%;max-height: 400px;overflow-y: auto;">
                <img style="width: 100%;vertical-align: middle;" src="${
                  this.compressedData
                }"/>
            </div>
            <a class="arrow-container arrow-container-prev" href="#item-${
              index == 0 ? total - 1 : index - 1
            }"><div class="arrow arrow-prev"></div></a>
            <a class="arrow-container arrow-container-next" href="#item-${
              index == total - 1 ? 0 : index + 1
            }"><div class="arrow arrow-next"></div></a>
            </div>
        </div>
        `;
  }
}

const currentImages: Image[] = [];

document.addEventListener("DOMContentLoaded", function (event) {
  const images = document.getElementById("images") as HTMLInputElement;
  images.onchange = (event) => addImages(event);

  const level = document.getElementById("level") as HTMLSelectElement;
  level.onchange = (event) => compressionLevelChanged(event);

  const save = document.getElementById("save") as HTMLButtonElement;
  save.onclick = (event) => saveResults(event);

  const compress = document.getElementById("compress") as HTMLButtonElement;
  compress.onclick = (event) => compressImages(event);
});

function updateState(doingAnything: boolean) {
  const imagesInput = document.getElementById("images") as HTMLInputElement;
  const levelInput = document.getElementById("level") as HTMLSelectElement;
  const saveButton = document.getElementById("save") as HTMLButtonElement;
  imagesInput.disabled =
    levelInput.disabled =
    saveButton.disabled =
      doingAnything;
}

function updateViewSaving(saving: boolean): HTMLProgressElement {
  updateState(saving);
  const savingProgress = document.getElementById(
    "savingProgress"
  ) as HTMLProgressElement;
  savingProgress.style.display = saving ? "block" : "none";
  return savingProgress;
}

function updateViewCompressing(compressing: boolean): HTMLProgressElement {
  updateState(compressing);
  const compressingProgress = document.getElementById(
    "compressingProgress"
  ) as HTMLProgressElement;
  compressingProgress.style.display = compressing ? "block" : "none";
  if (!compressing) {
    const afterCompressionStyle = document.getElementById(
      "afterCompression"
    ) as HTMLDivElement;
    afterCompressionStyle.style.display = "block";
    const compress = document.getElementById("compress") as HTMLButtonElement;
    compress.style.display = "none";
  }
  return compressingProgress;
}

async function addImages(event: Event) {
  if (!event) return;
  const files = Array.from((event.target as any).files as FileList);
  const images = (
    currentImages.length > 0
      ? files.filter(
          (v) => !currentImages.some((k) => k.originalFile.name == v.name)
        )
      : files
  ).map((v) => new Image(v));
  if (images.length == 0) {
    alert(
      "Simultaneous compression of images with the same name is not possible."
    );
    return;
  }
  currentImages.push(...images);
  showCompressButtonAndHideResults();
}

function compressionLevelChanged(event: Event) {
  if (!event) return;
  const compressionLevel = getDesiredQuality();
  if (isCompressionAvailable(compressionLevel))
    showCompressButtonAndHideResults();
}

function getDesiredQuality(): number {
  const level = document.getElementById("level") as HTMLSelectElement;
  return parseInt(level.value) / 100;
}

function isCompressionAvailable(quality: number): boolean {
  return currentImages.some((v) => v.currentCompressedQuality != quality);
}

function showCompressButtonAndHideResults() {
  const compress = document.getElementById("compress") as HTMLButtonElement;
  compress.style.display = "block";
  const afterCompressionStyle = document.getElementById(
    "afterCompression"
  ) as HTMLDivElement;
  afterCompressionStyle.style.display = "none";
}

async function compressImages(event: Event) {
  if (!event) return;
  const quality = getDesiredQuality();
  const images = currentImages.filter(
    (v) => v.currentCompressedQuality != quality
  );
  if (images.length == 0) {
    updateViewCompressing(false);
    return;
  }
  const compressingProgress = updateViewCompressing(true);
  const imagesLength = images.length;
  const progressStep = 100 / imagesLength;
  for (let i = 0; i < imagesLength; i++) {
    await images[i].compress(
      quality,
      (v) => (compressingProgress.value = v / imagesLength + i * progressStep)
    );
  }
  const resultView = currentImages
    .map((v, i) => v.createView(i, currentImages.length))
    .join("");
  document.getElementById("results-carousel").innerHTML = resultView;
  updateViewCompressing(false);
  jump("item-0");
  compressingProgress.value = 0;
}

async function saveResults(event: Event) {
  if (!event) return;
  if (currentImages.length == 0) {
    alert("Nothing to save: You haven't compressed any image yet.");
    return;
  }
  const savingProgress = updateViewSaving(true);
  const zip = new JSZip();
  currentImages.forEach((v) => zip.file(v.originalFile.name, v.compressedFile));
  const zipped = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 1 },
    },
    (v) => (savingProgress.value = v.percent)
  );
  //FileSaver.saveAs(zipped, "compressed images.zip");
  updateViewSaving(false);
  savingProgress.value = 0;
}
