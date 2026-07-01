import * as THREE from 'three';
import './style.css';
import dots from './assets/dots.json';

const focusSlider: HTMLInputElement | null = document.querySelector("#focus");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 90, 1, 0.001, 10 );
camera.position.set(0.5, 0.5, 0.05);
camera.lookAt(new THREE.Vector3(0.5,0.5,0));

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize( 820, 820 );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.CircleGeometry( 0.001, 16 );
const material = new THREE.MeshBasicMaterial( { color: 0xff0000, side: THREE.DoubleSide } );
const instances = new THREE.InstancedMesh(geometry, material, dots.length);

dots.forEach((dot, dotIndex) => {
  const posMatrix = new THREE.Matrix4();
  posMatrix.setPosition(new THREE.Vector3(dot[0], dot[1], 0));
  instances.setMatrixAt(dotIndex, posMatrix);
});

instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
instances.instanceMatrix.needsUpdate = true;
scene.add(instances);

focusSlider?.addEventListener('input', () => {
  focusDots(0.01 * Number(focusSlider.value));
})

renderer.render(scene, camera);

function focusDots(size: number) {
  dots.forEach((dot, dotIndex) => {
    const dotMatrix = new THREE.Matrix4();
    dotMatrix.makeScale(size, size, size);
    dotMatrix.setPosition(new THREE.Vector3(dot[0], dot[1], 0));
    instances.setMatrixAt(dotIndex, dotMatrix);
  });
  instances.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
}