import * as THREE from 'three';


export let gridSize = 0;

const Draw = {
    grid: (camera, distance) => {
        const fov = THREE.MathUtils.degToRad(camera.fov);
        const heightAtDistance = 2 * Math.tan(fov / 2) * distance;
        const widthAtDistance = heightAtDistance * camera.aspect;

        gridSize = Math.max(widthAtDistance, heightAtDistance);

        const gridHelper = new THREE.GridHelper(1, 50, 0x222222, 0x222222);
        gridHelper.scale.set(gridSize, 1, gridSize);
        gridHelper.rotation.x = Math.PI / 2;
        gridHelper.position.z = 0;

        return gridHelper;
    }
};

export default Draw;