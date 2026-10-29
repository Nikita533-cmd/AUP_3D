import {
    computeBoundsTree,
    disposeBoundsTree
} from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

document.getElementById("Check_3D").onclick = () => checkAllPipelines(); // новая проверка коллизии
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

function findSceneCollisions(
    scene,
    {
        // По умолчанию проверяем трубы.
        filter = object => object instanceof Edge_new,

        // По умолчанию не скрываем пересечения смежных труб.
        skipPair = () => false
    } = {}
) {
    // Обновляем сцену, её родителей и всех потомков.
    // Предполагается стандартное автоматическое обновление матриц.
    scene.updateWorldMatrix(true, true);

    const objects = [];

    // traverse проходит по всей иерархии, включая вложенные объекты.
    scene.traverse(object => {
        if (
            object.isMesh &&
            object.geometry?.getAttribute('position') &&
            filter(object)
        ) {
            objects.push(object);
        }
    });

    // Подготавливаем геометрии и мировые AABB.
    const entries = objects.map(object => {
        const geometry = object.geometry;

        if (!geometry.boundsTree) {
            geometry.computeBoundsTree();
        }

        if (!geometry.boundingBox) {
            geometry.computeBoundingBox();
        }

        // Важно: берём только геометрию самого меша,
        // а не его дочерние объекты.
        const worldBox = geometry.boundingBox
            .clone()
            .applyMatrix4(object.matrixWorld);

        const inverseWorld = object.matrixWorld
            .clone()
            .invert();

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

            if (skipPair(a.object, b.object)) {
                continue;
            }

            // Быстрый фильтр перед проверкой треугольников.
            if (!a.worldBox.intersectsBox(b.worldBox)) {
                continue;
            }

            relativeMatrix.multiplyMatrices(
                a.inverseWorld,
                b.object.matrixWorld
            );

            const intersects =
                a.object.geometry.boundsTree.intersectsGeometry(
                    b.object.geometry,
                    relativeMatrix
                );

            if (intersects) {
                collisions.push({
                    objectA: a.object,
                    objectB: b.object,
                    sharedNode: pipesHaveSharedNode(
                        a.object,
                        b.object
                    )
                });
            }
        }
    }

    return collisions;
}


function checkAllPipelines() {
    const collisions = findSceneCollisions(Engine.scene);

    if (collisions.length === 0) {
        console.info('Пересечения поверхностей труб не найдены');
        return collisions;
    }

    console.warn(
        `Найдено пересекающихся пар: ${collisions.length}`
    );

    console.table(
        collisions.map(({ objectA, objectB, sharedNode }, index) => ({
            number: index + 1,
            pipeA: objectA.uuid,
            pipeB: objectB.uuid,
            sharedNode
        }))
    );

    return collisions;
}