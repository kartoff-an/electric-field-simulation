import * as THREE from 'three'

class SliderController {
    constructor(slider, charges, graphics) {
        this.slider = slider;
        this.graphics = graphics;
        this.charges = charges;
        this.isVisible = false;
        this.activeMesh = null;
        this.activeMeshIndex = -1;
    }

    toggleSlider(mesh = null, index = -1) {
        if (this.isVisible || this.activeMesh == mesh) {
            this.slider.style.display = 'none';
            this.activeMesh = null;
            this.activeMeshIndex = -1;
            this.isVisible = false;
        } else {
            this.activeMesh = mesh;
            this.activeMeshIndex = index;
            this.#updateSliderPosition();
            this.slider.value = this.activeMesh.userData.charge;
            this.updateThumbColor();
            this.slider.style.display = 'block';
            this.isVisible = true;
        }
    }

    #updateSliderPosition() {
        const vector = new THREE.Vector3(this.activeMesh.userData.position.x, this.activeMesh.userData.position.y, 0);
        vector.project(this.graphics.camera);

        const rect = this.graphics.renderer.domElement.getBoundingClientRect();
        const x = (vector.x * 0.5 + 0.5) * rect.width - 72;
        const y = (-vector.y * 0.5 + 0.5) * rect.height - 50;

        this.slider.style.left = `${x - this.slider.offsetWidth * 0.5}px`;
        this.slider.style.top = `${y - this.slider.offsetHeight * 0.5}px`;
        this.slider.value = this.activeMesh.userData.charge;
    }

    updateThumbColor() {
        const val = parseFloat(this.slider.value);
        let color = val > 0 ? '#ff3366' : (val < 0 ? '#3366ff' : '#888');
        this.slider.style.setProperty('--thumb-color', color);
    }
    
    updateCharge(value) {
        if (this.activeMeshIndex < 0) return;
        const newCharge = parseFloat(value);
        this.charges.list[this.activeMeshIndex].charge = newCharge;
        const updatedMesh = this.charges.list[this.activeMeshIndex].generateMesh();
        updatedMesh.userData.index = this.activeMeshIndex;
        
        this.activeMesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        this.graphics.scene.remove(this.activeMesh);

        this.charges.meshes[this.activeMeshIndex] = updatedMesh;
        this.activeMesh = updatedMesh;
        this.graphics.scene.add(updatedMesh);
        this.updateThumbColor();
    }
}

export default SliderController;