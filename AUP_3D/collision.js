import * as THREE from 'three';

// const box = new THREE.Box3();

import {computeBoundsTree, disposeBoundsTree} from 'three-mesh-bvh';
import { Engine } from './engine.js';
// import { Engine } from './engine.js';



// Привязываем методы к прототипу
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

// document.getElementById("Check_3D").onclick = () => checkAllPipelines(); // новая проверка коллизии
// document
//     .getElementById('checkCollisionsButton')
//     .addEventListener('click', checkAllPipelines);
function pipesHaveSharedNode(a, b) {
    const nodesA = [a.start_node, a.end_node];
    const nodesB = [b.start_node, b.end_node];
    return nodesA.some(
        node => node != null && nodesB.includes(node)
    );
}

function findSceneCollisions(scene) {
    // Обновляем сцену, её родителей и всех потомков.
    // Предполагается стандартное автоматическое обновление матриц.    
    scene.updateWorldMatrix(true, true);
    const objects = [];
    let new_edge_Material_2 = new THREE.MeshBasicMaterial({ color: '#0F1379' });
    // traverse проходит по всей иерархии, включая вложенные объекты.
    scene.traverse(object => {
        if (object.type == "Edge") {
            objects.push(object);
            object.material=new_edge_Material_2;
        }
    });    
    // console.log("objects",objects);

    // Подготавливаем геометрии и мировые AABB.
    const entries = objects.map(object => {
        const geometry = object.geometry;
        console.log("geometry",geometry);
        // Стандартыне методы из библиотеки для создания ограничивающих объемов и габларитов элемента
        if (!geometry.boundsTree) {geometry.computeBoundsTree();}
        if (!geometry.boundingBox) {geometry.computeBoundingBox();}

        // Важно: берём только геометрию самого меша,
        // а не его дочерние объекты.
        const worldBox = geometry.boundingBox.clone().applyMatrix4(object.matrixWorld);
        const inverseWorld = object.matrixWorld.clone().invert();

        return {
            object,
            worldBox,
            inverseWorld
        };
    });

    const collisions = [];
    const relativeMatrix = new THREE.Matrix4();
    for (let i = 0; i < entries.length; i++) {
        const a = entries[i];
        for (let j = i + 1; j < entries.length; j++) {
            const b = entries[j];
             // Сначала выявляем соосное наложение.
            const hasSharedNode = pipesHaveSharedNode(a.object, b.object);
            if (hasSharedNode) {
                const axisOverlap = checkPipeAxisOverlap(a.object, b.object);
                if (axisOverlap) {
                    collisions.push({objectA: a.object,objectB: b.object,sharedNode: true, type: "superimposition"});
                    // Пара уже признана конфликтной. Пропускаем BVH-проверку.
                    continue;
                }
            }            
            // Быстрый фильтр перед проверкой треугольников.
            if (!a.worldBox.intersectsBox(b.worldBox)) {
                continue;
            }
            relativeMatrix.multiplyMatrices(
                a.inverseWorld,
                b.object.matrixWorld
            );
            const intersects = a.object.geometry.boundsTree.intersectsGeometry(b.object.geometry,relativeMatrix);

            if (intersects) {
                collisions.push({objectA: a.object,objectB: b.object,sharedNode: pipesHaveSharedNode(a.object,b.object), type: "intersection" });
            }
        }
    }
    return collisions;
}

export function checkAllPipelines() {
    const collisions = findSceneCollisions(Engine.scene);
    console.log("collisions",collisions)
    if (collisions.length === 0) {
        console.info('Пересечения трубопроводов не найдены'); 
        
        return collisions;
    }
    collisions.forEach((collision, index) => {
        const pipeA = collision.objectA;
        const pipeB = collision.objectB;
        let new_edge_Material = new THREE.MeshBasicMaterial({ color: '#FF0000' });
        let new_edge_Material_1 = new THREE.MeshBasicMaterial({ color: '#FF0000' });
        
        console.log("collision.sharedNode",collision.sharedNode);
        // if (collision.sharedNode === false || collision.type != "superimposition") {
        //     pipeA.material=new_edge_Material_2;
        //     pipeB.material=new_edge_Material_2;
        // }
        if (collision.sharedNode === false) {
            alert("Выявлено пересечение геометрии трубопроводов! Проверьте корректность построения и устраните коллизию (подсвечены красным).")
            pipeA.material=new_edge_Material;
            pipeB.material=new_edge_Material;
        }
        else if (collision.type === "superimposition") {
            alert("Выявлено пересечение геометрии трубопроводов! Проверьте корректность построения и устраните коллизию (подсвечены красным).")
            pipeA.material=new_edge_Material;
            pipeB.material=new_edge_Material_1;
        }
        
    });   
    return collisions;
}


function checkPipeAxisOverlap(pipeA, pipeB, {angularTolerance = 1e-6} = {}) {
    // 1. Находим общий узел и другие концы труб.
    let sharedNode;
    let otherA;
    let otherB;

    // логика определения общего узла и узлов для выходящих векторов из него
    if (pipeA.start_node === pipeB.start_node || pipeA.start_node === pipeB.end_node) {
        sharedNode = pipeA.start_node;
        otherA = pipeA.end_node;
        otherB = pipeB.start_node === sharedNode ? pipeB.end_node: pipeB.start_node;

    } else if (pipeA.end_node === pipeB.start_node || pipeA.end_node === pipeB.end_node) {
        sharedNode = pipeA.end_node;
        otherA = pipeA.start_node;
        otherB = pipeB.start_node === sharedNode ? pipeB.end_node : pipeB.start_node;

    } else {
        return null;
    }
    // 2. Получаем мировые координаты.
    const origin = sharedNode.getWorldPosition(new THREE.Vector3());
    const directionA = otherA.getWorldPosition(new THREE.Vector3()).sub(origin);
    const directionB = otherB.getWorldPosition(new THREE.Vector3()).sub(origin);

    const lengthA = directionA.length();
    const lengthB = directionB.length();

    directionA.divideScalar(lengthA);
    directionB.divideScalar(lengthB);

    // 3. Векторы от общего узла должны смотреть в одну сторону.
    if (directionA.dot(directionB) <= 0) {
        return null;
    }

    // 4. Проверяем почти одинаковое направление.
    const crossLength = new THREE.Vector3().crossVectors(directionA, directionB).length();

    if (crossLength > angularTolerance) {
        return null;
    }

    // 5. У соосных отрезков с общим началом
    // общая часть равна более короткому отрезку.
    const overlapLength = Math.min(lengthA, lengthB);

    return {
        overlapLength,
        // Сохраняем прежний смысл:
        // противоположны ли направления start_node → end_node.
        oppositeDirections: (pipeA.start_node === sharedNode) !== (pipeB.start_node === sharedNode),
        start: origin,
        end: origin.clone().addScaledVector(directionA, overlapLength)
    };
}