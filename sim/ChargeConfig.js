import * as THREE from 'three';

class ChargeConfig {
    constructor(charges = []) {
        this.charges = charges;
    }

    addCharge(charge ) {
        this.charges.push( charge );
        return charge;
    }

    removeCharge( index ) {
        this.charges.splice( index, 1 );
    }

    getElectricFieldAt( x, y ) {
        let totalField = new THREE.Vector3( 0, 0, 0 );
        for ( const charge of this.charges ) {
            const E = charge.electricFieldAt( x, y );
            totalField.add( E );
        }
        return totalField;
    }
}

export default ChargeConfig;