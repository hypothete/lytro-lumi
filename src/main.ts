import * as THREE from "three/webgpu";
import { instancedArray, instanceIndex, texture, uniform, uv } from "three/tsl";
import "./style.css";
import { buildDots } from "./dots";

const { dots, flatDots } = buildDots();
const dotsArray = instancedArray(flatDots, "vec2");

const apertureSlider: HTMLInputElement | null =
  document.querySelector("#aperture");
const focusSlider: HTMLInputElement | null = document.querySelector("#focus");

const closeUp = false ? 0.1 : 1;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, closeUp, closeUp, 0, 1, -1);

const renderer = new THREE.WebGPURenderer({ antialias: false });
renderer.setSize(820, 820);
renderer.setClearColor(0x000000, 1);
renderer.setAnimationLoop(render);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(0.001, 0.001);
const material = new THREE.MeshBasicNodeMaterial({
  // color: 0x300000,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const textureLoader = new THREE.TextureLoader();
const imgTex = textureLoader.load("public/test.png");

const focusUniform = uniform(Number(focusSlider?.value || 1));

const texNode = texture(
  imgTex,
  dotsArray.element(instanceIndex).sub(uv().sub(0.5).div(1000).mul(focusUniform)),
);

material.colorNode = texNode;

const instances = new THREE.InstancedMesh(geometry, material, dots.length);

dots.forEach((dot, dotIndex) => {
  const posMatrix = new THREE.Matrix4();
  posMatrix.setPosition(new THREE.Vector3(dot.x, dot.y, 0));
  instances.setMatrixAt(dotIndex, posMatrix);
});

instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
instances.instanceMatrix.needsUpdate = true;
scene.add(instances);

apertureSlider?.addEventListener("input", () => {
  adjustApertures(0.01 * Number(apertureSlider.value));
});

focusSlider?.addEventListener("input", () => {
  focusUniform.value = Number(focusSlider?.value || 0);
  focusUniform.needsUpdate = true;
  renderer.render(scene, camera);
});

function render() {
  renderer.render(scene, camera);
}

function adjustApertures(size: number) {
  dots.forEach((dot, dotIndex) => {
    const dotMatrix = new THREE.Matrix4();
    dotMatrix.makeScale(size, size, size);
    dotMatrix.setPosition(new THREE.Vector3(dot.x, dot.y, 0));
    instances.setMatrixAt(dotIndex, dotMatrix);
  });
  instances.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
}
