import * as THREE from 'three';
import { intensityToColor } from '../utils/color';

let gridVectors = [];
export function createGridVectors(chargeConfig, gridSize, divisions, scene, options) {
    for (const vector of gridVectors) {
        vector.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        scene.remove(vector);
    }
    gridVectors.length = 0;

    if (!options.shouldShowGridVectors) return;

    const maxIntensity = 1;
    const step = gridSize / divisions;
    const halfSize = gridSize / 2;
    const group = new THREE.Group();

    // --- First pass: gather field intensities and count valid arrows ---
    const fieldIntensities = [];
    let validArrowCount = 0;

    for (let i = 0; i <= divisions; i++) {
        const x = -halfSize + i * step;
        for (let j = 0; j <= divisions; j++) {
            const y = -halfSize + j * step;
            const E = chargeConfig.getElectricFieldAt(x, y);
            fieldIntensities.push(E);
            if (E.length() > 0) validArrowCount++;
        }
    }

    // --- Geometry and materials ---
    const coneGeom = new THREE.ConeGeometry(0.02, 0.05, 6);
    const cylinderGeom = new THREE.CylinderGeometry(0.005, 0.005, 1, 8);
    coneGeom.rotateX(Math.PI / 2);
    cylinderGeom.rotateX(Math.PI / 2);

    const arrowMaterial = new THREE.MeshBasicMaterial({ vertexColors: false, depthWrite: false });
    const tailMaterial = new THREE.MeshBasicMaterial({ vertexColors: false, depthWrite: false });
    const instancedArrows = new THREE.InstancedMesh(coneGeom, arrowMaterial, validArrowCount);
    const instancedTails = new THREE.InstancedMesh(cylinderGeom, tailMaterial, validArrowCount);
    const instanceColorBuffer = new THREE.InstancedBufferAttribute(new Float32Array(validArrowCount * 3), 3);
    
    instancedArrows.instanceColor = instanceColorBuffer;
    instancedTails.instanceColor = instanceColorBuffer;
    
    const dummy = new THREE.Object3D();
    const zAxis = new THREE.Vector3(0, 0, 1);

    // --- Second pass: place arrows ---
    let index = 0;
    for (let i = 0; i <= divisions; i++) {
        const x = -halfSize + i * step;
        for (let j = 0; j <= divisions; j++) {
            const y = -halfSize + j * step;
            const E = fieldIntensities[i * (divisions + 1) + j];
            const mag = E.length();
            if (mag === 0) continue;

            const unitVector = E.clone().normalize();
            const intensity = mag / 500e8;
            const colorArr = options.shouldShowHeatMap ? intensityToColor(intensity, maxIntensity) : [1, 1, 1,];
            const scale = THREE.MathUtils.clamp(mag / 1e9, 0, 1.2);
            const shaftLength = 0.3 * Math.max(THREE.MathUtils.clamp(mag / 800e8, 0.4, 1.2), 0.4);

            const arrowTipPos = new THREE.Vector3().copy(unitVector).multiplyScalar(shaftLength).add(new THREE.Vector3(x, y, 0));
            dummy.position.copy(arrowTipPos);
            dummy.scale.set(scale, scale, scale);
            dummy.quaternion.setFromUnitVectors(zAxis, unitVector);
            dummy.updateMatrix();
            instancedArrows.setMatrixAt(index, dummy.matrix);

            const tailOffset = unitVector.clone().multiplyScalar(shaftLength / 2);
            dummy.position.set(x + tailOffset.x, y + tailOffset.y, 0);
            dummy.scale.set(scale, scale, shaftLength);
            dummy.quaternion.setFromUnitVectors(zAxis, unitVector);
            dummy.updateMatrix();
            instancedTails.setMatrixAt(index, dummy.matrix);

            instanceColorBuffer.set(colorArr, index * 3);

            const perpVector = new THREE.Vector3(-unitVector.y, unitVector.x, 0).normalize();
            dummy.quaternion.setFromUnitVectors(zAxis, perpVector);

            const coneBaseOffset = unitVector.clone().multiplyScalar(-0.05 * scale);
            dummy.position.set(x + coneBaseOffset.x, y + coneBaseOffset.y, 0);
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();

            index++;
        }
    }

    instancedArrows.instanceMatrix.needsUpdate = true;
    instanceColorBuffer.needsUpdate = true;
    instancedArrows.renderOrder = 0;
    instancedTails.renderOrder = 0;


    group.add(instancedArrows);
    group.add(instancedTails);
    scene.add(group);
    gridVectors.push(group);
}
