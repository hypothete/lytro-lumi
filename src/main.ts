import * as THREE from "three/webgpu";
import {
  distance,
  float,
  instancedArray,
  instanceIndex,
  pass,
  step,
  texture,
  uniform,
  uv,
  vec2,
} from "three/tsl";
import "./style.css";
import { buildDots } from "./dots";
import { overlapPass } from "./overlapPass";

const { dots, flatDots } = buildDots();
const dotsArray = instancedArray(flatDots, "vec2");

const zoominCheckbox: HTMLInputElement | null =
  document.querySelector("#zoomin");
const renderpassCheckbox: HTMLInputElement | null =
  document.querySelector("#renderpass");
const apertureSlider: HTMLInputElement | null =
  document.querySelector("#aperture");
const focusSlider: HTMLInputElement | null = document.querySelector("#focus");
const xOffsetSlider: HTMLInputElement | null =
  document.querySelector("#xoffset");
const yOffsetSlider: HTMLInputElement | null =
  document.querySelector("#yoffset");

// Renderer setup

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  0,
  zoominCheckbox?.checked ? 0.01 : 1,
  zoominCheckbox?.checked ? 0.01 : 1,
  0,
  1,
  -1,
);

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(820, 820);
renderer.setClearColor(0x000000, 1);
renderer.setAnimationLoop(render);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(0.01, 0.01);

// Lumigraph material

const rgbMaterial = new THREE.MeshBasicNodeMaterial({
  blending: THREE.AdditiveBlending, // stack RGB values where microlenses overlap
  // we will divide by the overlapPass to normalize these values later
  depthWrite: false
});

const textureLoader = new THREE.TextureLoader();
const imgTex = textureLoader.load("public/test.png");
imgTex.colorSpace = THREE.SRGBColorSpace;

const focusUniform = uniform(Number(focusSlider?.value || 1));
const apertureUniform = uniform(Number(apertureSlider?.value || 1));
const offsetUniform = uniform(
  new THREE.Vector2(
    Number(xOffsetSlider?.value || 0),
    Number(yOffsetSlider?.value || 0),
  ),
);

const texNode = texture(
  imgTex,
  dotsArray
    .element(instanceIndex)
    .add(offsetUniform.div(1000))
    .sub(uv().sub(0.5).div(1000).mul(focusUniform)),
);

rgbMaterial.colorNode = texNode.mul(
  step(apertureUniform.div(200), float(0.5).sub(distance(vec2(0.5), uv()))),
);

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
const countPass = overlapPass(scene, camera);
renderPipeline.outputNode = renderpassCheckbox?.checked ? countPass : scenePass.div(countPass.r);

// Event listeners

apertureSlider?.addEventListener("input", () => {
  apertureUniform.value = Number(apertureSlider?.value || 0);
  apertureUniform.needsUpdate = true;
  countPass.updateAperture(Number(apertureSlider?.value || 0));
  renderPipeline.render();
});

focusSlider?.addEventListener("input", () => {
  focusUniform.value = Number(focusSlider?.value || 0);
  focusUniform.needsUpdate = true;
  renderPipeline.render();
});

xOffsetSlider?.addEventListener("input", () => {
  offsetUniform.value.x = Number(xOffsetSlider?.value || 0);
  focusUniform.needsUpdate = true;
  renderPipeline.render();
});

yOffsetSlider?.addEventListener("input", () => {
  offsetUniform.value.y = Number(yOffsetSlider?.value || 0);
  focusUniform.needsUpdate = true;
  renderPipeline.render();
});

zoominCheckbox?.addEventListener("input", () => {
  camera.right = zoominCheckbox.checked ? 0.1 : 1;
  camera.top = zoominCheckbox.checked ? 0.1 : 1;
  camera.updateProjectionMatrix();
  renderPipeline.render();
});

renderpassCheckbox?.addEventListener("input", () => {
  if (renderpassCheckbox.checked) {
    renderPipeline.outputNode = countPass;
  } else {
    renderPipeline.outputNode = scenePass.div(countPass.r);
  }
  renderPipeline.needsUpdate = true;
  renderPipeline.render();
});

// Render loop

function render() {
  renderPipeline.render();
}

