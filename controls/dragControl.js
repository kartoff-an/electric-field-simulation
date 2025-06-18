import * as THREE from 'three';

let camera, renderer;
let draggableMeshes = [];
let charges = [];
let isDragging = false;
let draggableMesh = null;
const dragOffset = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function setMouseCoords(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateChargePosition(charge, plane) {
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, point);
    charge.position = point;
    console.log(point);
}

function onMouseDown(event) {
    setMouseCoords(event);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(draggableMeshes);

    if (intersects.length > 0) {
        let picked = intersects[0].object;
        while (picked.parent && !draggableMeshes.includes(picked)) {
            picked = picked.parent;
        }
        if (draggableMeshes.includes(picked)) {
            draggableMesh = picked;
            isDragging = true;
            dragOffset.copy(intersects[0].point).sub(draggableMesh.position);
        }
    }
}

function onMouseMove(event) {
    if (!isDragging || !draggableMesh) return;

    setMouseCoords(event);
    raycaster.setFromCamera(mouse, camera);

    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -draggableMesh.position.z);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, intersection);

    if (intersection) {
        draggableMesh.position.copy(intersection.sub(dragOffset));
        updateChargePosition(charges[draggableMesh.userData.index], dragPlane);
    }
}

function onMouseUp() {
    isDragging = false;
    draggableMesh = null;
}

export function initDrag(graphics, chargeList) {
    renderer = graphics.renderer;
    camera = graphics.camera;
    charges = chargeList;

    renderer.domElement.addEventListener('mousedown', onMouseDown, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('mouseup', onMouseUp, false);
}

export function setDraggableMeshes(meshes) {
    draggableMeshes = meshes;
}
