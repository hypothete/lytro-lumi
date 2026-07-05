import * as THREE from "three/webgpu";
import { distance, float, instancedArray, instanceIndex, step, texture, uniform, uv, vec2 } from "three/tsl";
import "./style.css";
import { buildDots } from "./dots";

const { dots, flatDots } = buildDots();
const dotsArray = instancedArray(flatDots, "vec2");

const zoominCheckbox: HTMLInputElement | null = document.querySelector("#zoomin");
const apertureSlider: HTMLInputElement | null = document.querySelector("#aperture");
const focusSlider: HTMLInputElement | null = document.querySelector("#focus");
const xOffsetSlider: HTMLInputElement | null = document.querySelector("#xoffset");
const yOffsetSlider: HTMLInputElement | null = document.querySelector("#yoffset");

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(0, 1, 1, 0, 1, -1);

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(820, 820);
renderer.setClearColor(0x000000, 1);
renderer.setAnimationLoop(render);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(0.01, 0.01);
const material = new THREE.MeshBasicNodeMaterial({
  // color: 0x300000,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const textureLoader = new THREE.TextureLoader();
const imgTex = textureLoader.load("public/test.png");

const focusUniform = uniform(Number(focusSlider?.value || 1));
const apertureUniform = uniform(Number(apertureSlider?.value || 1));
const offsetUniform = uniform(new THREE.Vector2(Number(xOffsetSlider?.value || 0), Number(yOffsetSlider?.value || 0)));

const texNode = texture(
  imgTex,
  dotsArray.element(instanceIndex).add(offsetUniform.div(1000)).sub(uv().sub(0.5).div(1000).mul(focusUniform)),
);

material.colorNode = texNode.mul(step(apertureUniform.div(200), float(0.5).sub(distance(vec2(0.5),uv()))));

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
  apertureUniform.value = Number(apertureSlider?.value || 0);
  apertureUniform.needsUpdate = true;
  renderer.render(scene, camera);
});

focusSlider?.addEventListener("input", () => {
  focusUniform.value = Number(focusSlider?.value || 0);
  focusUniform.needsUpdate = true;
  renderer.render(scene, camera);
});

xOffsetSlider?.addEventListener("input", () => {
  offsetUniform.value.x = Number(xOffsetSlider?.value || 0);
  focusUniform.needsUpdate = true;
  renderer.render(scene, camera);
});

yOffsetSlider?.addEventListener("input", () => {
  offsetUniform.value.y = Number(yOffsetSlider?.value || 0);
  focusUniform.needsUpdate = true;
  renderer.render(scene, camera);
});

zoominCheckbox?.addEventListener("input", () => {
  camera.right = zoominCheckbox.checked ? 0.1 : 1;
  camera.top = zoominCheckbox.checked ? 0.1 : 1;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
})

function render() {
  renderer.render(scene, camera);
}