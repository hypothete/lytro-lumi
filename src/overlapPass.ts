import { color, distance, float, step, uniform, uv, vec2 } from "three/tsl";
import * as THREE from "three/webgpu";

// Renders a separate pass of the scene with just (1.0,0.0,0.0) as the material color.
// used for returning the number of overlaps per scaled microlens, so we can normalize the RGB values

type OverlapPassOptions = {
  aperture: number;
};

export const overlapPass = (
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: OverlapPassOptions = { aperture: 1 },
) => new OverlapPassNode("color", scene, camera, options);

class OverlapPassNode extends THREE.PassNode {
  aperture: THREE.UniformNode<"float", number>;

  overlapMaterial = new THREE.MeshBasicNodeMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  constructor(
    scope: THREE.PassNodeScope,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: OverlapPassOptions,
  ) {
    super(scope, scene, camera);

    this.aperture = uniform(options.aperture);

    this.overlapMaterial.colorNode = color(1.0, 0.0, 0.0).mul(
      step(
        float(100).sub(this.aperture).div(200),
        float(0.5).sub(distance(vec2(0.5), uv())),
      ),
    );
  }

  updateAperture(value: number) {
    this.aperture.value = value;
    this.aperture.needsUpdate = true;
    this.overlapMaterial.needsUpdate = true;
  }

  updateBefore(frame: THREE.NodeFrame) {
    const renderer = frame.renderer;
    if (!renderer) {
      return false;
    }
    const currentRenderObjectFunction = renderer.getRenderObjectFunction();
    renderer.setRenderObjectFunction(
      (object, scene, camera, geometry, _, ...params) => {
        renderer.renderObject(
          object,
          scene,
          camera,
          geometry,
          this.overlapMaterial,
          ...params,
        );
      },
    );
    super.updateBefore(frame);
    renderer.setRenderObjectFunction(currentRenderObjectFunction);
  }
}
