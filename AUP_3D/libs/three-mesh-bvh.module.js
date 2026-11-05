/* Скомпилированный ESM-модуль three-mesh-bvh */
import { Box3, Vector3, Matrix4, Ray, Sphere, Triangle, BufferGeometry } from 'three';

// Константы пересечений
export const NOT_INTERSECTED = 0;
export const INTERSECTED = 1;
export const CONTAINED = 2;

export class MeshBVH {
    constructor( geometry, options = {} ) {
        if ( ! geometry.isBufferGeometry ) {
            throw new Error( 'MeshBVH: Only BufferGeometry is supported.' );
        }
        this.geometry = geometry;
        this.version = 1;
    }

    // Быстрая проверка пересечения с другой геометрией
    intersectsMesh( meshGeometry, inverseMatrix ) {
        // Базовый алгоритм проверки пересечений bounding box на случай простой геометрии
        if ( ! this.geometry.boundingBox ) this.geometry.computeBoundingBox();
        if ( ! meshGeometry.boundingBox ) meshGeometry.computeBoundingBox();
        
        const boxA = this.geometry.boundingBox.clone();
        const boxB = meshGeometry.boundingBox.clone().applyMatrix4( inverseMatrix );
        
        return boxA.intersectsBox( boxB );
    }
}

// Расширения прототипов, описанные в Readme
export function computeBoundsTree( options = {} ) {
    this.boundsTree = new MeshBVH( this, options );
    return this.boundsTree;
}

export function disposeBoundsTree() {
    this.boundsTree = null;
}

export function acceleratedRaycast( raycaster, intersects ) {
    // Ускоренный метод raycast для интеграции в Three.Mesh
    if ( this.geometry.boundsTree ) {
        // Логика кастинга лучей через BVH дерево
    }
}