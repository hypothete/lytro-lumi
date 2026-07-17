import * as THREE from "three/webgpu";
import {
  distance,
  float,
  instancedArray,
  instanceIndex,
  pass,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
} from "three/tsl";
import { fixWebmDuration } from "@fix-webm-duration/fix";
import "./style.css";
import "./range.css";
import { buildDots } from "./dots";
import { overlapPass } from "./overlapPass";
import { getGalleryDOM } from "./gallery";

const threeDiv: HTMLDivElement | null = document.body.querySelector("#three");
const zoominCheckbox: HTMLInputElement | null =
  document.querySelector("#zoomin");
const apertureSlider: HTMLInputElement | null =
  document.querySelector("#aperture");
const focusSlider: HTMLInputElement | null = document.querySelector("#focus");
const focusPlus: HTMLButtonElement | null = document.querySelector("#focus-plus");
const focusMinus: HTMLButtonElement | null = document.querySelector("#focus-minus");
const aperturePlus: HTMLButtonElement | null = document.querySelector("#aperture-plus");
const apertureMinus: HTMLButtonElement | null = document.querySelector("#aperture-minus");
const recordBtn: HTMLButtonElement | null = document.querySelector("#record");
const downloadLink: HTMLAnchorElement | null =
  document.querySelector("#download");
const galleryContainer: HTMLDivElement | null =
  document.body.querySelector("#gallery-container");
const galleryLabel: HTMLParagraphElement | null =
  document.body.querySelector("#gallery-label");

if (!threeDiv) {
  throw new Error("The DOM is broken");
}

// shared vars and utils

const PLANE_SIDE = 0.02;
const RENDER_SIZE = 3280 / 3;
const HALF_RENDER_SIZE = RENDER_SIZE / 2;
const VIDEO_LENGTH = Math.PI * 2 * 30 * 10;

const getZoomLevel = () => (zoominCheckbox?.checked ? 0.05 : 1);

const clearDownload = () => {
  if (!downloadLink) {
    return;
  }
  downloadLink.setAttribute("href", "");
  downloadLink.textContent = "";
};

// Renderer setup

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  0,
  getZoomLevel(),
  getZoomLevel(),
  0,
  1,
  -1,
);

let mouseClicked = false;

let recorder: MediaRecorder;
let recording = false;
let recordingAngle = 0;
let recordStart = 0;
let recordDuration = 0;

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(RENDER_SIZE, RENDER_SIZE);
renderer.setClearColor(0x000000, 1);
renderer.setAnimationLoop(render);
threeDiv.appendChild(renderer.domElement);
const captureStream = renderer.domElement.captureStream();

// Lumigraph geo and material

const geometry = new THREE.PlaneGeometry(PLANE_SIDE, PLANE_SIDE);
const rgbMaterial = new THREE.MeshBasicNodeMaterial({
  blending: THREE.AdditiveBlending, // stack RGB values where microlenses overlap
  // we will divide by the overlapPass to normalize these values later
  depthWrite: false,
});

const textureLoader = new THREE.TextureLoader();
const imgTex = textureLoader.load("./test.avif");
imgTex.colorSpace = THREE.SRGBColorSpace;

const focusUniform = uniform(Number(focusSlider?.value || 0));
const apertureUniform = uniform(Number(apertureSlider?.value || 1));
const offsetUniform = uniform(new THREE.Vector2(0));

const { dots, flatDots } = buildDots();
const dotsArray = instancedArray(flatDots, "vec2");

const texNode = texture(
  imgTex,
  dotsArray
    .element(instanceIndex)
    .add(offsetUniform.div(1000))
    .sub(vec2(0.5).sub(uv()).div(500).mul(focusUniform).mul(-1)),
);

rgbMaterial.colorNode = texNode.mul(
  smoothstep(
    float(100).sub(apertureUniform).div(200),
    float(100).sub(apertureUniform).div(200).add(0.05),
    float(0.5).sub(distance(vec2(0.5), uv())),
  ),
);

// gallery setup (needs texNode)

prepareGallery();

// Mesh setup

const instances = new THREE.InstancedMesh(geometry, rgbMaterial, dots.length);

dots.forEach((dot, dotIndex) => {
  const posMatrix = new THREE.Matrix4();
  posMatrix.setPosition(new THREE.Vector3(dot.x, dot.y, 0));
  instances.setMatrixAt(dotIndex, posMatrix);
});

instances.instanceMatrix.needsUpdate = true;
scene.add(instances);

// Render pipeline

const renderPipeline = new THREE.RenderPipeline(renderer);
const scenePass = pass(scene, camera);
const countPass = overlapPass(scene, camera, {
  aperture: Number(apertureSlider?.value || 0),
});

renderPipeline.outputNode = scenePass.div(countPass.r);

function render(timestamp: number) {
  if (recording) {
    if (recordStart === 0) {
      recordStart = timestamp;
      recorder.start();
    }
    recordDuration = timestamp - recordStart;
    recordingAngle = Math.PI * 2 - recordDuration / (30 * 10);
    offsetUniform.value.set(
      Math.cos(recordingAngle) / 2,
      Math.sin(recordingAngle) / 2,
    );
    if (recordDuration >= VIDEO_LENGTH) {
      recording = false;
      recorder.stop();
      console.log("stopping");
      return;
    }
  }
  renderPipeline.render();
}

// Recorder

function record() {
  if (!recordBtn || !downloadLink) {
    throw new Error("Missing DOM for recording");
  }

  if (recording) {
    return false;
  }

  recording = true;
  recordStart = 0;
  recordingAngle = 0;
  clearDownload();
  recordBtn.setAttribute("disabled", "true");
  recordBtn.textContent = "Generating WebM video...";

  const chunks: Blob[] = [];
  recorder = new MediaRecorder(captureStream, {
    mimeType: 'video/webm; codecs="vp8"',
    bitsPerSecond: 1600 * 1024 * 1024,
  });

  recorder.onstop = () => {
    const buggyBlob = new Blob(chunks, { type: 'video/webm; codecs="vp8"' });
    fixWebmDuration(buggyBlob, recordDuration).then((finalBlob) => {
      downloadLink.setAttribute("href", URL.createObjectURL(finalBlob));
      downloadLink.textContent = "DOWNLOAD";
      recordBtn.removeAttribute("disabled");
      recordBtn.textContent = "Record video";
    });
  };

  recorder.ondataavailable = (e) => {
    chunks.push(e.data);
  };
}

// Event listeners

apertureSlider?.addEventListener("input", () => {
  apertureUniform.value = Number(apertureSlider?.value || 0);
  countPass.updateAperture(Number(apertureSlider?.value || 0));
});

aperturePlus?.addEventListener('click', evt => {
  evt.preventDefault();
  if (!apertureSlider) {
    return false;
  }
  apertureSlider.value = Math.min(
    Number(apertureSlider.value) + Number(apertureSlider.step) * 5,
    Number(apertureSlider.max)
  ).toString();
  apertureUniform.value = Number(apertureSlider.value || 0);
  countPass.updateAperture(Number(apertureSlider?.value || 0));
});

apertureMinus?.addEventListener('click', evt => {
  evt.preventDefault();
  if (!apertureSlider) {
    return false;
  }
  apertureSlider.value = Math.max(
    Number(apertureSlider.value) - Number(apertureSlider.step) * 5,
    Number(apertureSlider.min)
  ).toString();
  apertureUniform.value = Number(apertureSlider.value || 0);
  countPass.updateAperture(Number(apertureSlider?.value || 0));
});


focusSlider?.addEventListener("input", () => {
  focusUniform.value = Number(focusSlider?.value || 0);
});

focusPlus?.addEventListener('click', evt => {
  evt.preventDefault();
  if (!focusSlider) {
    return false;
  }
  focusSlider.value = Math.min(
    Number(focusSlider.value) + Number(focusSlider.step) * 10,
    Number(focusSlider.max)
  ).toString();
  focusUniform.value = Number(focusSlider.value || 0);
});

focusMinus?.addEventListener('click', evt => {
  evt.preventDefault();
  if (!focusSlider) {
    return false;
  }
  focusSlider.value = Math.max(
    Number(focusSlider.value) - Number(focusSlider.step) * 10,
    Number(focusSlider.min)
  ).toString();
  focusUniform.value = Number(focusSlider.value || 0);
});

zoominCheckbox?.addEventListener("input", () => {
  camera.right = getZoomLevel();
  camera.top = getZoomLevel();
  camera.updateProjectionMatrix();
});

renderer.domElement.addEventListener("click", (evt) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouseX = evt.clientX - rect.left;
  const mouseY = evt.clientY - rect.top;
  offsetUniform.value.set(
    (mouseX - HALF_RENDER_SIZE) / RENDER_SIZE,
    (HALF_RENDER_SIZE - mouseY) / RENDER_SIZE,
  );
});

renderer.domElement.addEventListener("mousemove", (evt) => {
  if (!mouseClicked) {
    return;
  }
  const rect = renderer.domElement.getBoundingClientRect();
  const mouseX = evt.clientX - rect.left;
  const mouseY = evt.clientY - rect.top;
  offsetUniform.value.set(
    (mouseX - HALF_RENDER_SIZE) / RENDER_SIZE,
    (HALF_RENDER_SIZE - mouseY) / RENDER_SIZE,
  );
});

renderer.domElement.addEventListener("mousedown", () => {
  mouseClicked = true;
});

window.addEventListener("mouseup", () => {
  mouseClicked = false;
});

renderer.domElement.addEventListener("touchmove", (evt) => {
  evt.preventDefault();
  const rect = renderer.domElement.getBoundingClientRect();
  const mouseX = evt.changedTouches[0].clientX - rect.left;
  const mouseY = evt.changedTouches[0].clientY - rect.top;
  offsetUniform.value.set(
    (mouseX - HALF_RENDER_SIZE) / RENDER_SIZE,
    (HALF_RENDER_SIZE - mouseY) / RENDER_SIZE,
  );
});

recordBtn?.addEventListener("click", record);

function prepareGallery() {
  if (!galleryContainer || !galleryLabel) {
    console.error("Gallery is missing!");
    return;
  }

  const selectGalleryItem = (url: string) => {
    const fileTex = textureLoader.load(url, () => {
      texNode.value = fileTex;
      texNode.needsUpdate = true;
      offsetUniform.value.set(0,0);
    });
    fileTex.colorSpace = THREE.SRGBColorSpace;
  };

  getGalleryDOM(galleryContainer, galleryLabel, selectGalleryItem);
}

// drag and drop handling for images

renderer.domElement.addEventListener("dragover", (evt) => {
  if (evt.dataTransfer === null) {
    return false;
  }
  const imgFiles = [...evt.dataTransfer.items].filter((file) =>
    file.type.startsWith("image/"),
  );
  if (imgFiles.length > 0) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
  } else {
    evt.dataTransfer.dropEffect = "none";
  }
});

renderer.domElement.addEventListener("drop", (evt) => {
  if (evt.dataTransfer === null) {
    return false;
  }
  const imgFiles = [...evt.dataTransfer.items].filter((file) =>
    file.type.startsWith("image/"),
  );
  if (imgFiles.length > 0) {
    evt.preventDefault();
    clearDownload();
    evt.dataTransfer.dropEffect = "copy";
    const imgToRead = (imgFiles.pop() as DataTransferItem).getAsFile();
    if (imgToRead === null) {
      return false;
    }
    const fileUrl = URL.createObjectURL(imgToRead);
    const fileTex = textureLoader.load(fileUrl, () => {
      texNode.value = fileTex;
      texNode.needsUpdate = true;
    });
    fileTex.colorSpace = THREE.SRGBColorSpace;
  } else {
    evt.dataTransfer.dropEffect = "none";
  }
});

window.addEventListener("dragover", (evt) => {
  if (evt.dataTransfer === null) {
    return false;
  }
  const imgFiles = [...evt.dataTransfer.items].filter((file) =>
    file.type.startsWith("image/"),
  );
  if (imgFiles.length > 0) {
    evt.preventDefault();
  }
});

window.addEventListener("drop", (evt) => {
  if (evt.dataTransfer === null) {
    return false;
  }
  const imgFiles = [...evt.dataTransfer.items].filter((file) =>
    file.type.startsWith("image/"),
  );
  if (imgFiles.length > 0) {
    evt.preventDefault();
  }
});
