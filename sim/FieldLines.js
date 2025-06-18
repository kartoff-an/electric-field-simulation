import * as THREE from 'three';
import { intensityToColor, getColorMapping } from '../utils/color.js';

function RK4(x0, y0, h, chargeConfig) {
    const f = (x, y, out) => {
        const E = chargeConfig.getElectricFieldAt(x, y);
        const len = Math.sqrt(E.x * E.x + E.y * E.y);
        if (len === 0) {
        out[0] = 0;
        out[1] = 0;
        } else {
        out[0] = E.x / len;
        out[1] = E.y / len;
        }
    };

    const E = chargeConfig.getElectricFieldAt(x0, y0);
    const fieldStrength = Math.sqrt(E.x * E.x + E.y * E.y);
    const adaptiveH = Math.min(h * (1 + 0.1 / (fieldStrength + 0.01)), 0.05);

    const k1 = [0, 0], k2 = [0, 0], k3 = [0, 0], k4 = [0, 0];
    f(x0, y0, k1);
    k1[0] *= adaptiveH; k1[1] *= adaptiveH;
    f(x0 + k1[0] / 2, y0 + k1[1] / 2, k2);
    k2[0] *= adaptiveH; k2[1] *= adaptiveH;
    f(x0 + k2[0] / 2, y0 + k2[1] / 2, k3);
    k3[0] *= adaptiveH; k3[1] *= adaptiveH;
    f(x0 + k3[0], y0 + k3[1], k4);
    k4[0] *= adaptiveH; k4[1] *= adaptiveH;

    const dx = (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6;
    const dy = (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6;

    return { x: x0 + dx, y: y0 + dy };
}

function generateFieldLineTrace(chargeConfig, x0, y0, N, direction = 1) {
    const trace = [];

    let x = x0;
    let y = y0;
    const h = 0.01 * direction;

    for (let i = 0; i < N; i++) {
        const next = RK4(x, y, h, chargeConfig);

        if (!isFinite(next.x) || !isFinite(next.y)) break;

        const point = {x: next.x, y: next.y, z: 0};
        trace.push(point);

        x = next.x;
        y = next.y;

    }

    return trace;
}

function generateAllFieldLineTraces(chargeConfig) {
    const trace = [];
    const buffer = [];
    const numPoints = 1500;
    for (const charge of chargeConfig.charges) {
        if (charge.charge == 0) continue;

        const numLinesPerCharge  = 8; //Math.round(4 + 0.8 * Math.abs(charge.charge));
        for (let i = 0; i < numLinesPerCharge; i++) {
            const vectors = [];
            const radius = 0.1;
            const { x, y } = charge.position;
            const angle = (i / numLinesPerCharge) * 2 * Math.PI;
            const x0 = x + radius * Math.cos(angle);
            const y0 = y + radius * Math.sin(angle);

            let forward = generateFieldLineTrace(chargeConfig, x0, y0, numPoints, 1);
            let backward = generateFieldLineTrace(chargeConfig, x0, y0, numPoints, -1);

            const line =  [...backward.reverse(), x0, y0, 0, ...forward];
            vectors.push(...line);

            if (vectors.length < 2) continue;
            
            for (const p of vectors) {
                buffer.push(p.x, p.y, 0);
            }
            buffer.push(NaN, NaN, NaN);
            trace.push(vectors);
        }
    }
    return {trace: trace, buff: buffer};
}


function addLineToGroup(buffer, chargeConfig, group, options) {
    const positionAttr = new Float32Array(buffer);
    const geometry = new THREE.BufferGeometry();
    const colors = options.shouldShowHeatMap ? getColorMapping(positionAttr, chargeConfig) : new Array(positionAttr.length).fill(1);

    geometry.setAttribute('position', new THREE.BufferAttribute(positionAttr, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
    const line = new THREE.Line(geometry, lineMaterial);
    group.add(line);
}

function createLineArrows(trace, chargeConfig, options) {
    const arrowCount = Math.min(6, Math.floor(trace.length / 500));
    const maxIntensity = 1;

    const coneGeom = new THREE.ConeGeometry(0.04, 0.08, 6);
    const arrowMaterial = new THREE.MeshBasicMaterial({vertexColors: false, depthWrite: true });
    const instancedArrows = new THREE.InstancedMesh(coneGeom, arrowMaterial, arrowCount);
    const dummy = new THREE.Object3D();
    const colorsArray = new Float32Array(arrowCount * 3);
    const axis = new THREE.Vector3(0, 1, 0);

    for (let k = 1; k <= arrowCount; k++) {
        const index = Math.floor((k * trace.length) / (arrowCount + 1));

        if (index >= trace.length - 1) continue;

        const p1 = trace[index];
        const p2 = trace[index + 1];
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
        const E = chargeConfig.getElectricFieldAt(mid.x, mid.y);
        const mag = E.length();
        const colorArr = options.shouldShowHeatMap ? intensityToColor((mag / 500e8).toFixed(2), maxIntensity) : [1, 1, 1];
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);

        dummy.position.copy(mid);
        dummy.renderOrder = 0;
        dummy.scale.set(0.8, 0.8, 0);
        dummy.quaternion.copy(quaternion);
        dummy.updateMatrix();

        colorsArray.set(colorArr, (k - 1) * 3);
        instancedArrows.setMatrixAt(k - 1, dummy.matrix);
    }

    instancedArrows.instanceColor = new THREE.InstancedBufferAttribute(colorsArray, 3);
    instancedArrows.instanceMatrix.needsUpdate = true;
    return instancedArrows;
}


let fieldLines = [];
export function drawFields (scene, chargeConfig, options) {
    for (const line of fieldLines) {
        line.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        scene.remove(line);
    }
    fieldLines.length = 0;

    if (!options.shouldShowFieldLines) return;

    const fieldGroup = new THREE.Group();
    const positions = generateAllFieldLineTraces(chargeConfig);

    if (positions.trace) {
        for (let i = 0; i < positions.trace.length; i++) {
            const traceVector = positions.trace[i]; // this is an array of {x, y, z} points
            const arrows = createLineArrows(traceVector, chargeConfig, options);
            fieldGroup.add(arrows);
        }
    }

    const buff = positions.buff;
    let currentLine = [];

    for (let i = 0; i < buff.length; i += 3) {
        const x = buff[i], y = buff[i + 1], z = buff[i + 2];

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            if (currentLine.length >= 6) {
                addLineToGroup(currentLine, chargeConfig, fieldGroup, options);
            }
            currentLine = [];
        } else {
            currentLine.push(x, y, z);
        }
    }
    if (currentLine.length >= 6) {
        addLineToGroup(currentLine, chargeConfig, fieldGroup);
    }

    fieldGroup.renderOrder = 0;
    scene.add(fieldGroup);
    fieldLines.push(fieldGroup);

    console.log(options.shouldShowFieldLines)
}