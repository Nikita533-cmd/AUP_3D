// // ============================================================
// // engine.js — инициализация 3D-сцены Three.js
// // Зависимости: THREE (глобальный), подключается ПОСЛЕ state.js
// // ============================================================
// // import * as THREE from 'three';
// import * as THREE from 'three';
// import { OrbitControls } from './orbit.js';
// import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

// export const Engine = {
//     scene: null,
//     camera: null,
//     renderer: null,
//     controls: null,
//     raycaster: null,
//     mouse: new THREE.Vector2(),
    

//     init() {
//         // console.log("точка в начале енджина");
//         // init() {
//         this.scene = new THREE.Scene();
//         this.scene.background = new THREE.Color(0xf5f6fa);

//         // 1. Базовый размер фрустума. 20000 гарантирует, что при панорамировании 
//         // (перетаскивании мышью) объекты не обрежутся по краям.
//         const f = 20000; 
//         const aspect = window.innerWidth / window.innerHeight;
        
//         this.camera = new THREE.OrthographicCamera(
//             -f * aspect / 2, f * aspect / 2,
//             f / 2, -f / 2,
//             0.1, 10000
//         );
        
//         // Стандартная изометрическая позиция
//         this.camera.position.set(30, 30, 30);
//         this.camera.lookAt(0, 0, 0);

//         // 2.Визуально приближаем камеру на старте
//         this.camera.zoom = 1000; // Объекты будут выглядеть в 4 раза крупнее (ближе)
//         this.camera.updateProjectionMatrix(); // ОБЯЗАТЕЛЬНО применяем изменения!

//         this.renderer = new THREE.WebGLRenderer({
//             canvas: document.getElementById('renderCanvas'),
//             antialias: true
//         });

//         // ✅ СОЗДАНИЕ CSS2DRenderer
//         this.labelRenderer = new CSS2DRenderer();
//         this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        
//         // ✅ КРИТИЧЕСКИ ВАЖНЫЕ СТИЛИ:
//         this.labelRenderer.domElement.style.position = 'absolute';
//         this.labelRenderer.domElement.style.top = '0px';
//         this.labelRenderer.domElement.style.left = '0px';
//         this.labelRenderer.domElement.style.pointerEvents = 'none';
//         this.labelRenderer.domElement.style.zIndex = '1000';
        
//         // ✅ ОБЯЗАТЕЛЬНО: добавляем в DOM
//         // Внутри Engine.init() найдите и поменяйте:
//         const canvas = document.getElementById('renderCanvas');
//         if (canvas && canvas.parentElement) {
//             // Вставляем слой интерфейса в тот же блок, где лежит сам холст, чтобы их координаты совпали на 100%
//             canvas.parentElement.appendChild(this.labelRenderer.domElement);
//         } else {
//             document.body.appendChild(this.labelRenderer.domElement);
//         }



//         this.renderer.setSize(window.innerWidth, window.innerHeight);
//         this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
//         // console.log("точка в середине енджина");
//         this.controls = new OrbitControls(
//             this.camera,
//             this.renderer.domElement
//         );
//         this.controls.enableDamping = true;
//         this.controls.dampingFactor = 0.05;
        
//         // 3. Ограничиваем зум, чтобы защитить от обрезания
//         this.controls.minZoom = 1;   // Запрещает отдалить камеру дальше, чем базовый f=500
//         this.controls.maxZoom = 10000;  // Позволяет приблизить еще сильнее, если нужно
//         this.controls.maxDistance = 5000;
//         this.controls.maxPolarAngle = Math.PI / 2.1;
//         this.controls.zoomSpeed = 2.0; // Делаем колесико мыши отзывчивым

//         this.raycaster = new THREE.Raycaster();

//         this.selectedObjects = [];
//         this.selectedObject = null;


//         // Освещение
//         this.scene.add(new THREE.HemisphereLight(0xffffff, 0x888899, 0.7));
//         const dl = new THREE.DirectionalLight(0xffffff, 0.6);
//         dl.position.set(20, 30, 20);
//         this.scene.add(dl);

//         window.addEventListener('resize', () => this.onResize());

//         this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
//         this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
//         console.log("точка в ините енджина");






//             // =========================================================================
//         // ВИДЖЕТ СИСТЕМЫ КООРДИНАТ В ПРАВОМ НИЖНЕМ УГЛУ
//         // =========================================================================
//         this.axesWidget = {
//             scene: null,
//             camera: null,
//             renderer: null,
//             axesGroup: null,
//             size: 120  // размер виджета в пикселях
//         };

//         const w = this.axesWidget;
//         w.scene = new THREE.Scene();

//         // Ортографическая камера для виджета
//         const aspect = 1;
//         const frustumSize = 3;
//         w.camera = new THREE.OrthographicCamera(
//             -frustumSize * aspect / 2, frustumSize * aspect / 2,
//             frustumSize / 2, -frustumSize / 2,
//             0.1, 100
//         );
//         w.camera.position.set(5, 5, 5);
//         w.camera.lookAt(0, 0, 0);

//         // Создаём контейнер для виджета
//         const widgetContainer = document.createElement('div');
//         widgetContainer.id = 'axesWidgetContainer';
//         widgetContainer.style.cssText = `
//             position: fixed;
//             bottom: 20px;
//             right: 20px;
//             width: ${w.size}px;
//             height: ${w.size}px;
//             z-index: 9999;
//             pointer-events: none;
//             background: rgba(255, 255, 255, 0.1);
//             border-radius: 8px;
//             border: 1px solid rgba(0, 0, 0, 0.2);
//         `;
//         document.body.appendChild(widgetContainer);

//         w.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//         w.renderer.setSize(w.size, w.size);
//         w.renderer.setPixelRatio(window.devicePixelRatio);
//         w.renderer.setClearColor(0x000000, 0);
//         widgetContainer.appendChild(w.renderer.domElement);

//         // Освещение для виджета
//         w.scene.add(new THREE.AmbientLight(0xffffff, 1));

//         // Создаём оси с подписями
//         w.axesGroup = new THREE.Group();
//         w.scene.add(w.axesGroup);

//         const axisLength = 1.5;
//         const coneLength = 0.4;
//         const coneRadius = 0.15;

//         // Ось X (красная)
//         const xArrow = new THREE.ArrowHelper(
//             new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0),
//             axisLength, 0xff0000, coneLength, coneRadius
//         );
//         w.axesGroup.add(xArrow);

//         // Ось Y (зелёная)
//         const yArrow = new THREE.ArrowHelper(
//             new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0),
//             axisLength, 0x00ff00, coneLength, coneRadius
//         );
//         w.axesGroup.add(yArrow);

//         // Ось Z (синяя)
//         const zArrow = new THREE.ArrowHelper(
//             new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0),
//             axisLength, 0x0000ff, coneLength, coneRadius
//         );
//         w.axesGroup.add(zArrow);

//         // Подписи X, Y, Z
//         function createAxisLabel(text, position, color) {
//             const canvas = document.createElement('canvas');
//             canvas.width = 64;
//             canvas.height = 64;
//             const ctx = canvas.getContext('2d');
//             ctx.font = 'Bold 48px Arial';
//             ctx.fillStyle = color;
//             ctx.textAlign = 'center';
//             ctx.textBaseline = 'middle';
//             ctx.fillText(text, 32, 32);

//             const texture = new THREE.CanvasTexture(canvas);
//             const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
//             const sprite = new THREE.Sprite(spriteMat);
//             sprite.position.copy(position);
//             sprite.scale.set(0.5, 0.5, 1);
//             return sprite;
//         }

//         w.axesGroup.add(createAxisLabel('X', new THREE.Vector3(2, 0, 0), '#ff0000'));
//         w.axesGroup.add(createAxisLabel('Y', new THREE.Vector3(0, 2, 0), '#00ff00'));
//         w.axesGroup.add(createAxisLabel('Z', new THREE.Vector3(0, 0, 2), '#0000ff'));








//     },

//     // Вспомогательный метод для перевода пикселей экрана в 3D-координаты [-1, 1]
//     updateMouseCoordinates(event) {
//         this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//         this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
//     },

//     // 1. НАВЕДЕНИЕ МЫШИ (только на конкретный Меш)
//     onPointerMove(event) {
//         this.updateMouseCoordinates(event);

//         this.raycaster.setFromCamera(this.mouse, this.camera);
//         const intersects = this.raycaster.intersectObjects(this.scene.children, true);

//         // Ищем самый первый попавшийся валидный Mesh (игнорируя свет и сетку)
//         const hitMesh = this.findValidMesh(intersects);

//         // Меняем курсор
//         if (hitMesh) {
//             this.renderer.domElement.style.cursor = 'pointer'; // Рука
//         } else {
//             this.renderer.domElement.style.cursor = 'default'; // Стрелка
//         }
//     },

//     // 2. КЛИК МЫШИ (выделение конкретного Меша)
//     // onPointerDown(event) {
//     //     this.updateMouseCoordinates(event);

//     //     this.raycaster.setFromCamera(this.mouse, this.camera);
//     //     const intersects = this.raycaster.intersectObjects(this.scene.children, true);

//     //     const hitMesh = this.findValidMesh(intersects);

//     //     if (hitMesh) {
//     //         // Если кликнули по новому объекту — сбрасываем старый
//     //         if (this.selectedObject && this.selectedObject !== hitMesh) {
//     //             this.deselectObject(this.selectedObject);
//     //         }

//     //         // Запоминаем и выделяем конкретный нажатый узел
//     //         this.selectedObject = hitMesh;
//     //         this.selectObject(hitMesh);
//     //     } else {
//     //         // Клик в пустоту — сброс
//     //         if (this.selectedObject) {
//     //             this.deselectObject(this.selectedObject);
//     //             this.selectedObject = null;
//     //         }
//     //     }
//     //     this.update_Pipe_tube_coordinate();
//     //     this.update_Pipe_tube();
//     //     this.info_selected_elevent();
//     //     this.update_Node_coordinate();
//     // },

//         onPointerDown(event) {
//         this.updateMouseCoordinates(event);
//         this.raycaster.setFromCamera(this.mouse, this.camera);
//         const intersects = this.raycaster.intersectObjects(this.scene.children, true);
//         const hitMesh = this.findValidMesh(intersects);

//         if (hitMesh) {
//             // Проверяем, зажат ли Ctrl (или Cmd на Mac)
//             if (event.ctrlKey || event.metaKey) {
//                 const index = this.selectedObjects.indexOf(hitMesh);
//                 if (index > -1) {
//                     // Если уже выделен - снимаем выделение
//                     this.selectedObjects.splice(index, 1);
//                     this.deselectObject(hitMesh);
//                 } else {
//                     // Если не выделен - добавляем в массив и выделяем
//                     this.selectedObjects.push(hitMesh);
//                     this.selectObject(hitMesh);
//                 }
//             } else {
//                 // Если Ctrl НЕ зажат - сбрасываем старое выделение и выделяем только новый объект
//                 this.selectedObjects.forEach(obj => this.deselectObject(obj));
//                 this.selectedObjects = [hitMesh];
//                 this.selectObject(hitMesh);
//             }
            
//             // Для обратной совместимости с остальным кодом
//             this.selectedObject = this.selectedObjects.length > 0 ? this.selectedObjects[this.selectedObjects.length - 1] : null;
//         } else {
//             // Клик в пустоту - сбрасываем всё
//             this.selectedObjects.forEach(obj => this.deselectObject(obj));
//             this.selectedObjects = [];
//             this.selectedObject = null;
//         }

//         this.update_Pipe_tube_coordinate();
//         this.update_Pipe_tube();
//         this.info_selected_elevent();
//         this.update_Node_coordinate();
//     },

//     // // 3. ФИЛЬТР: Находит первый THREE.Mesh в массиве пересечений
//     // findValidMesh(intersects) {
//     //     if (intersects.length === 0) return null;

//     //     for (let i = 0; i < intersects.length; i++) {
//     //         const obj = intersects[i].object;

//     //         // Игнорируем технические объекты и свет, ищем строго геометрию (Mesh)
//     //         if (!obj.isGridHelper && !obj.isLight && obj.isMesh) {
//     //             return obj; // Возвращаем конкретный узел/меш
//     //         }
//     //     }
//     //     return null;
//     // },

//     //  // 3. ФИЛЬТР: Находит наш кастомный объект (Node_new, Edge_new), а не просто внутреннюю геометрию
//     // findValidMesh(intersects) {
//     //     if (intersects.length === 0) return null;

//     //     for (let i = 0; i < intersects.length; i++) {
//     //         let obj = intersects[i].object;

//     //         // ✅ ПОДНИМАЕМСЯ по родительской цепочке, чтобы найти экземпляр нашего класса
//     //         while (obj.parent && obj.parent !== this.scene) {
//     //             if (obj.type === 'Node' || obj.type === 'Sprinkler' || obj.type === 'Source' || obj.type === 'Edge') {
//     //                 return obj; // Возвращаем именно Node_new или Edge_new
//     //             }
//     //             obj = obj.parent;
//     //         }
            
//     //         // Резервный вариант: если это просто меш
//     //         if (!obj.isGridHelper && !obj.isLight && obj.isMesh) {
//     //             return obj; 
//     //         }
//     //     }
//     //     return null;
//     // },

//         // 3. ФИЛЬТР: Находит наш кастомный объект, игнорируя UI
//     findValidMesh(intersects) {
//         if (intersects.length === 0) return null;

//         for (let i = 0; i < intersects.length; i++) {
//             let obj = intersects[i].object;

//             // 🛡️ ЖЕСТКАЯ ЗАЩИТА: Игнорируем элементы интерфейса при обходе
//             if (obj.name === 'EdgeUI' || (obj.parent && obj.parent.name === 'EdgeUI')) {
//                 continue;
//             }

//             // Поднимаемся по родительской цепочке
//             while (obj.parent && obj.parent !== this.scene) {
//                 if (obj.parent.name === 'EdgeUI') break; // Если наткнулись на UI - стоп
                
//                 if (obj.type === 'Node' || obj.type === 'Sprinkler' || obj.type === 'Source' || obj.type === 'Edge') {
//                     return obj; 
//                 }
//                 obj = obj.parent;
//             }
            
//             // Резервный вариант
//             if (!obj.isGridHelper && !obj.isLight && obj.isMesh && obj.name !== 'EdgeUI') {
//                 return obj; 
//             }
//         }
//         return null;
//     },

//     // 4. ВЫДЕЛЕНИЕ ОДНОГО МЕША
//     selectObject(mesh) {
//         // 🛡️ ЗАЩИТА: Не даем выделить или покрасить саму группу UI
//         if (!mesh || !mesh.material || mesh.name === 'EdgeUI') return;

//         if (!mesh.userData.originalColor) {
//             mesh.material = mesh.material.clone();
//             mesh.userData.originalColor = mesh.material.color.getHex();
//         }

//         mesh.material.color.setStyle('#FFFF00'); 
//     },

//     // // 4. ВЫДЕЛЕНИЕ ОДНОГО МЕША
//     // selectObject(mesh) {
//     //     if (!mesh || !mesh.material) return;

//     //     // Если цвет еще не сохраняли
//     //     if (!mesh.userData.originalColor) {
//     //         // Клонируем материал, чтобы изменение цвета не затронуло другие такие же меши на сцене
//     //         mesh.material = mesh.material.clone();
//     //         // Запоминаем родной цвет
//     //         mesh.userData.originalColor = mesh.material.color.getHex();
//     //     }

//     //     mesh.material.color.setStyle('#FFFF00'); // Красим строго этот меш в 
//     // },

//     // // 4. ВЫДЕЛЕНИЕ ОБЪЕКТА (делает его желтым)
//     // selectObject(mesh) {
//     //     if (!mesh || !mesh.material) return;

//     //     // Сохраняем исходный цвет, если еще не сохранен
//     //     if (mesh.userData.originalColor === undefined) {
//     //         mesh.userData.originalColor = mesh.material.color.getHex();
//     //     }
//     //     console.log("mesh196", mesh)
//     //     // Красим в желтый при выделении (для ЛЮБОГО объекта: узел, труба, ороситель)
//     //     mesh.material.color.setHex(0xFFFF00);
//     //     mesh.material.needsUpdate = true;

        
//     // },

//     // 5. СНЯТИЕ ВЫДЕЛЕНИЯ С ОДНОГО МЕША
//     deselectObject(mesh) {
//         if (!mesh || !mesh.material) return;

//         if (mesh.userData.originalColor !== undefined) {
//             mesh.material.color.setHex(mesh.userData.originalColor); // Возвращаем родной цвет
//         }
//     },

//     // // 5. СНЯТИЕ ВЫДЕЛЕНИЯ (возвращает исходный цвет)
//     // deselectObject(mesh) {
//     //     if (!mesh || !mesh.material) return;

//     //     // Возвращаем сохраненный исходный цвет
//     //     if (mesh.userData.originalColor !== undefined) {
//     //         mesh.material.color.setHex(mesh.userData.originalColor);
//     //         mesh.material.needsUpdate = true;
//     //     }
//     // },

//     update_Pipe_tube_coordinate() {
//         const selected = this.selectedObject;
//         const inputX = document.getElementById("pbCX");
//         const inputY = document.getElementById("pbCY");
//         const inputZ = document.getElementById("pbCZ");
//         const inputX_branch = document.getElementById("pbCX_branch");
//         const inputY_branch = document.getElementById("pbCY_branch");
//         const inputZ_branch = document.getElementById("pbCZ_branch");
//         if (selected && selected.type === 'Node'||selected && selected.type === 'Sprinkler'||selected && selected.type === 'Source') {
//             const worldPos = new THREE.Vector3();
//             selected.getWorldPosition(worldPos);
//             inputX.value = worldPos.x;
//             inputY.value = worldPos.y;
//             inputZ.value = worldPos.z;
//             inputX_branch.value = worldPos.x;
//             inputY_branch.value = worldPos.y;
//             inputZ_branch.value = worldPos.z;
//         }
//         // if (document.getElementById("createBranchModal").style.display === 'block') {
//         //     const worldPos = new THREE.Vector3();
//         //     selected.getWorldPosition(worldPos);
            
//         // }
//     },
//     update_Pipe_tube() {
//         const selected = this.selectedObject;
//         // const id_name_tube = document.getElementById("number_pipe_edit");
//         // const ghost_tube = document.getElementById("type_pipe_edit");
//         // const DN_tube = document.getElementById("DN_pipe_edit");
//         // const Length_tube = document.getElementById("Length_pipe_edit");
//         if (selected && selected.type === 'Edge') {
//             document.getElementById("number_pipe_edit").innerText = `${ selected.name} id: ${selected.id}`;
//             document.getElementById("type_pipe_edit").innerText = selected.ghost;
//             document.getElementById("DN_pipe_edit").innerText = selected.DN;
//             document.getElementById("Length_pipe_edit").innerText = selected.Length;
//             document.getElementById("pipe_edit").value = selected.Length;
//             // document.getElementById("get_tube_pipe_edit").value = selected.ghost;
//             // document.getElementById("pbDiameter_edit").value = selected.DN; 
//         }
//     },
//     info_selected_elevent() {
//         const selected = this.selectedObject;
//         if (selected && selected.type === 'Node'||selected && selected.type === 'Source'||selected && selected.type === 'Sprinkler') {
//             document.getElementById("info_selected_node").style.display = 'block';
//             document.getElementById("info_selected_edge").style.display = 'none';
//             document.getElementById("name_selected_node").innerText = `${ selected.name} id: ${selected.id}`;
//             document.getElementById("type_selected_node").innerText = selected.type;
//             document.getElementById("pbCX_selected_node").value = selected.X_gl;
//             document.getElementById("pbCY_selected_node").value = selected.Y_gl;
//             document.getElementById("pbCZ_selected_node").value = selected.Z_gl;
//         }
//         else if (selected && selected.type === 'Edge') {
//             document.getElementById("info_selected_edge").style.display = 'block';
//             document.getElementById("info_selected_node").style.display = 'none';
//             document.getElementById("name_selected_edge").innerText = `${ selected.name} id: ${selected.id}`;
//             document.getElementById("name_selected_edge_uuid").innerText = selected.uuid;
//             // document.getElementById("type_selected_node").innerText = selected.type;
//             document.getElementById("pbCX_selected_start_node").value = selected.start_node.X_gl;
//             document.getElementById("pbCY_selected_start_node").value = selected.start_node.Y_gl;
//             document.getElementById("pbCZ_selected_start_node").value = selected.start_node.Z_gl;
//             document.getElementById("pbCX_selected_end_node").value = selected.end_node.X_gl;
//             document.getElementById("pbCY_selected_end_node").value = selected.end_node.Y_gl;
//             document.getElementById("pbCZ_selected_end_node").value = selected.end_node.Z_gl;
//             document.getElementById("ghost_selected_edge").innerText = selected.ghost;
//             document.getElementById("DN_selected_edge").innerText = selected.DN;
//             document.getElementById("length_selected_edge").innerText = selected.Length;
//             document.getElementById("kt_selected_edge").innerText = selected.k_t;
//             document.getElementById("kvelocity_selected_edge").innerText = selected.kvelocity;
//         }
//         else {
//             document.getElementById("info_selected_node").style.display = 'none';
//             document.getElementById("info_selected_edge").style.display = 'none';
//         }
//     },
//     update_Node_coordinate() {
//         const selected = this.selectedObject;
//         const inputX = document.getElementById("pbCX_edit_node");
//         const inputY = document.getElementById("pbCY_edit_node");
//         const inputZ = document.getElementById("pbCZ_edit_node");
        
//         if (selected && selected.type === 'Node'||selected && selected.type === 'Sprinkler'||selected && selected.type === 'Source') {
//             const worldPos = new THREE.Vector3();
//             selected.getWorldPosition(worldPos);
//             inputX.value = worldPos.x;
//             inputY.value = worldPos.y;
//             inputZ.value = worldPos.z;
//             document.getElementById("type_node_edit").innerText = selected.type;
//             document.getElementById("number_node_edit").innerText = `${ selected.name} id: ${selected.id}`;
//         }
        
//     },


//     onResize() {
//         const a = window.innerWidth / window.innerHeight;
        
//         if (Engine.camera.type === 'PerspectiveCamera') {
//             Engine.camera.aspect = a;
//         } else {
            
//             const f = 20000; // 
            
//             Engine.camera.left = -f * a / 2;
//             Engine.camera.right = f * a / 2;
//             Engine.camera.top = f / 2;
//             Engine.camera.bottom = -f / 2;
//         }
        
//         Engine.camera.updateProjectionMatrix();
//         Engine.renderer.setSize(window.innerWidth, window.innerHeight);

//         if (this.labelRenderer) {
//             this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
//         }
//     },

//     animate() {
//         requestAnimationFrame(() => this.animate());
//         this.controls.update();
//         this.renderer.render(this.scene, this.camera);

//         if (this.labelRenderer) {
//             this.labelRenderer.render(this.scene, this.camera);
//         }
//     }
// };

// // В конце файла engine.js:
// window.Engine = Engine; 

// // ============================================================
// // engine.js — инициализация 3D-сцены Three.js
// // ============================================================
// import * as THREE from 'three';
// import { OrbitControls } from './orbit.js';
// import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

// export const Engine = {
//     scene: null,
//     camera: null,
//     renderer: null,
//     labelRenderer: null,
//     controls: null,
//     raycaster: null,
//     mouse: new THREE.Vector2(),
//     axesWidget: null,

//     selectedObjects: [],
//     selectedObject: null,

//     init() {
//         this.scene = new THREE.Scene();
//         this.scene.background = new THREE.Color(0xf5f6fa);

//         const f = 20000;
//         const aspect = window.innerWidth / window.innerHeight;

//         this.camera = new THREE.OrthographicCamera(
//             -f * aspect / 2, f * aspect / 2,
//             f / 2, -f / 2,
//             0.1, 10000
//         );

//         this.camera.position.set(30, 30, 30);
//         this.camera.lookAt(0, 0, 0);
//         this.camera.zoom = 1000;
//         this.camera.updateProjectionMatrix();

//         this.renderer = new THREE.WebGLRenderer({
//             canvas: document.getElementById('renderCanvas'),
//             antialias: true
//         });

//         this.renderer.setSize(window.innerWidth, window.innerHeight);
//         this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//         // CSS2DRenderer для меток
//         this.labelRenderer = new CSS2DRenderer();
//         this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
//         this.labelRenderer.domElement.style.position = 'absolute';
//         this.labelRenderer.domElement.style.top = '0px';
//         this.labelRenderer.domElement.style.left = '0px';
//         this.labelRenderer.domElement.style.pointerEvents = 'none';
//         this.labelRenderer.domElement.style.zIndex = '1000';

//         const canvas = document.getElementById('renderCanvas');
//         if (canvas && canvas.parentElement) {
//             canvas.parentElement.appendChild(this.labelRenderer.domElement);
//         } else {
//             document.body.appendChild(this.labelRenderer.domElement);
//         }

//         this.controls = new OrbitControls(this.camera, this.renderer.domElement);
//         this.controls.enableDamping = true;
//         this.controls.dampingFactor = 0.05;
//         this.controls.minZoom = 1;
//         this.controls.maxZoom = 10000;
//         this.controls.maxDistance = 5000;
//         this.controls.maxPolarAngle = Math.PI / 2.1;
//         this.controls.zoomSpeed = 2.0;

//         this.raycaster = new THREE.Raycaster();

//         // Освещение
//         this.scene.add(new THREE.HemisphereLight(0xffffff, 0x888899, 0.7));
//         const dl = new THREE.DirectionalLight(0xffffff, 0.6);
//         dl.position.set(20, 30, 20);
//         this.scene.add(dl);

//         window.addEventListener('resize', () => this.onResize());
//         this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
//         this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));

//         // =========================================================================
//         // ВИДЖЕТ СИСТЕМЫ КООРДИНАТ С ПОДПИСЯМИ X, Y, Z (ПРАВЫЙ НИЖНИЙ УГОЛ)
//         // =========================================================================
//         // this.axesWidget = {
//         //     scene: null,
//         //     camera: null,
//         //     renderer: null,
//         //     axesGroup: null,
//         //     size: 160 // ✅ УВЕЛИЧЕНО с 120 до 160, чтобы всё помещалось
//         // };

//         // const w = this.axesWidget;
//         // w.scene = new THREE.Scene();

//         // const wAspect = 1;
//         // const frustumSize = 4; // ✅ УВЕЛИЧЕНО с 3 до 4 для большего охвата
//         // w.camera = new THREE.OrthographicCamera(
//         //     -frustumSize * wAspect / 2, frustumSize * wAspect / 2,
//         //     frustumSize / 2, -frustumSize / 2,
//         //     0.1, 100
//         // );
//         // w.camera.position.set(6, 6, 6); // ✅ Камера отодвинута дальше (было 5,5,5)
//         // w.camera.lookAt(0, 0, 0);

//         // const widgetContainer = document.createElement('div');
//         // widgetContainer.id = 'axesWidgetContainer';
//         // widgetContainer.style.cssText = `
//         //     position: fixed;
//         //     bottom: 20px;
//         //     right: 20px;
//         //     width: ${w.size}px;
//         //     height: ${w.size}px;
//         //     z-index: 9999;
//         //     pointer-events: none;
//         //     background: rgba(255, 255, 255, 0.9); /* ✅ Более непрозрачный белый фон */
//         //     border-radius: 8px;
//         //     border: 1px solid rgba(0, 0, 0, 0.2);
//         //     box-shadow: 0 4px 12px rgba(0,0,0,0.15); /* ✅ Добавлена мягкая тень */
//         // `;
//         // document.body.appendChild(widgetContainer);

//         // w.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//         // w.renderer.setSize(w.size, w.size);
//         // w.renderer.setPixelRatio(window.devicePixelRatio);
//         // w.renderer.setClearColor(0x000000, 0);
//         // widgetContainer.appendChild(w.renderer.domElement);

//         // w.scene.add(new THREE.AmbientLight(0xffffff, 1));

//         // w.axesGroup = new THREE.Group();
//         // w.scene.add(w.axesGroup);

//         // // Линии-оси без стрелок (чуть короче)
//         // const axisLength = 1.5; // ✅ УМЕНЬШЕНО с 1.8
//         // w.axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), axisLength, 0xff0000, 0, 0));
//         // w.axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), axisLength, 0x00ff00, 0, 0));
//         // w.axesGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), axisLength, 0x0000ff, 0, 0));

//         // // Подписи X, Y, Z (ближе к центру и чуть меньше)
//         // function createAxisLabel(text, position, color) {
//         //     const cvs = document.createElement('canvas');
//         //     cvs.width = 64; cvs.height = 64;
//         //     const ctx = cvs.getContext('2d');
//         //     ctx.font = 'Bold 48px Arial';
//         //     ctx.fillStyle = color;
//         //     ctx.textAlign = 'center';
//         //     ctx.textBaseline = 'middle';
//         //     ctx.fillText(text, 32, 32);
//         //     const texture = new THREE.CanvasTexture(cvs);
//         //     const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
//         //     sprite.position.copy(position);
//         //     sprite.scale.set(0.4, 0.4, 1); // ✅ УМЕНЬШЕНО с 0.5
//         //     return sprite;
//         // }

//         // w.axesGroup.add(createAxisLabel('X', new THREE.Vector3(1.9, 0, 0), '#ff0000')); // ✅ Ближе к центру (было 2.2)
//         // w.axesGroup.add(createAxisLabel('Y', new THREE.Vector3(0, 1.9, 0), '#00ff00'));
//         // w.axesGroup.add(createAxisLabel('Z', new THREE.Vector3(0, 0, 1.9), '#0000ff'));

//         console.log("✅ Engine инициализирован");
//     },

//     updateMouseCoordinates(event) {
//         this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
//         this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
//     },

//     onPointerMove(event) {
//         this.updateMouseCoordinates(event);
//         this.raycaster.setFromCamera(this.mouse, this.camera);
//         const intersects = this.raycaster.intersectObjects(this.scene.children, true);
//         const hitMesh = this.findValidMesh(intersects);
//         this.renderer.domElement.style.cursor = hitMesh ? 'pointer' : 'default';
//     },

//     onPointerDown(event) {
//         this.updateMouseCoordinates(event);
//         this.raycaster.setFromCamera(this.mouse, this.camera);
//         const intersects = this.raycaster.intersectObjects(this.scene.children, true);
//         const hitMesh = this.findValidMesh(intersects);

//         if (hitMesh) {
//             if (event.ctrlKey || event.metaKey) {
//                 const index = this.selectedObjects.indexOf(hitMesh);
//                 if (index > -1) {
//                     this.selectedObjects.splice(index, 1);
//                     this.deselectObject(hitMesh);
//                 } else {
//                     this.selectedObjects.push(hitMesh);
//                     this.selectObject(hitMesh);
//                 }
//             } else {
//                 this.selectedObjects.forEach(obj => this.deselectObject(obj));
//                 this.selectedObjects = [hitMesh];
//                 this.selectObject(hitMesh);
//             }
//             this.selectedObject = this.selectedObjects.length > 0 ? this.selectedObjects[this.selectedObjects.length - 1] : null;
//         } else {
//             this.selectedObjects.forEach(obj => this.deselectObject(obj));
//             this.selectedObjects = [];
//             this.selectedObject = null;
//         }

//         this.update_Pipe_tube_coordinate();
//         this.update_Pipe_tube();
//         this.info_selected_elevent();
//         this.update_Node_coordinate();
//     },

//     findValidMesh(intersects) {
//         if (intersects.length === 0) return null;
//         for (let i = 0; i < intersects.length; i++) {
//             let obj = intersects[i].object;
//             if (obj.name === 'EdgeUI' || (obj.parent && obj.parent.name === 'EdgeUI')) continue;

//             while (obj.parent && obj.parent !== this.scene) {
//                 if (obj.parent.name === 'EdgeUI') break;
//                 if (obj.type === 'Node' || obj.type === 'Sprinkler' || obj.type === 'Source' || obj.type === 'Edge') {
//                     return obj;
//                 }
//                 obj = obj.parent;
//             }
//             if (!obj.isGridHelper && !obj.isLight && obj.isMesh && obj.name !== 'EdgeUI') {
//                 return obj;
//             }
//         }
//         return null;
//     },

//     selectObject(mesh) {
//         if (!mesh || !mesh.material || mesh.name === 'EdgeUI') return;
//         if (!mesh.userData.originalColor) {
//             mesh.material = mesh.material.clone();
//             mesh.userData.originalColor = mesh.material.color.getHex();
//         }
//         mesh.material.color.setStyle('#FFFF00');
//     },

//     deselectObject(mesh) {
//         if (!mesh || !mesh.material) return;
//         if (mesh.userData.originalColor !== undefined) {
//             mesh.material.color.setHex(mesh.userData.originalColor);
//         }
//     },

//     clearSelection() {
//         this.selectedObjects.forEach(obj => this.deselectObject(obj));
//         this.selectedObjects = [];
//         this.selectedObject = null;
//     },

//     update_Pipe_tube_coordinate() {
//         const selected = this.selectedObject;
//         if (selected && (selected.type === 'Node' || selected.type === 'Sprinkler' || selected.type === 'Source')) {
//             const worldPos = new THREE.Vector3();
//             selected.getWorldPosition(worldPos);
//             const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
//             setVal("pbCX", worldPos.x); setVal("pbCY", worldPos.y); setVal("pbCZ", worldPos.z);
//             setVal("pbCX_branch", worldPos.x); setVal("pbCY_branch", worldPos.y); setVal("pbCZ_branch", worldPos.z);
//         }
//     },

//     update_Pipe_tube() {
//         const selected = this.selectedObject;
//         if (selected && selected.type === 'Edge') {
//             const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
//             const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
//             setTxt("number_pipe_edit", `${selected.name} id: ${selected.id}`);
//             setTxt("type_pipe_edit", selected.ghost);
//             setTxt("DN_pipe_edit", selected.DN);
//             setTxt("Length_pipe_edit", selected.Length);
//             setVal("pipe_edit", selected.Length);
//         }
//     },

//     info_selected_elevent() {
//         const selected = this.selectedObject;
//         const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
//         const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
//         const show = (id, vis) => { const el = document.getElementById(id); if (el) el.style.display = vis ? 'block' : 'none'; };

//         if (selected && (selected.type === 'Node' || selected.type === 'Source' || selected.type === 'Sprinkler')) {
//             show("info_selected_node", true);
//             show("info_selected_edge", false);
//             setTxt("name_selected_node", `${selected.name} id: ${selected.id}`);
//             setTxt("type_selected_node", selected.type);
//             setVal("pbCX_selected_node", selected.X_gl);
//             setVal("pbCY_selected_node", selected.Y_gl);
//             setVal("pbCZ_selected_node", selected.Z_gl);
//         } else if (selected && selected.type === 'Edge') {
//             show("info_selected_edge", true);
//             show("info_selected_node", false);
//             setTxt("name_selected_edge", `${selected.name} id: ${selected.id}`);
//             setTxt("name_selected_edge_uuid", selected.uuid);
//             setVal("pbCX_selected_start_node", selected.start_node.X_gl);
//             setVal("pbCY_selected_start_node", selected.start_node.Y_gl);
//             setVal("pbCZ_selected_start_node", selected.start_node.Z_gl);
//             setVal("pbCX_selected_end_node", selected.end_node.X_gl);
//             setVal("pbCY_selected_end_node", selected.end_node.Y_gl);
//             setVal("pbCZ_selected_end_node", selected.end_node.Z_gl);
//             setTxt("ghost_selected_edge", selected.ghost);
//             setTxt("DN_selected_edge", selected.DN);
//             setTxt("length_selected_edge", selected.Length);
//             setTxt("kt_selected_edge", selected.k_t);
//             setTxt("kvelocity_selected_edge", selected.kvelocity);
//         } else {
//             show("info_selected_node", false);
//             show("info_selected_edge", false);
//         }
//     },

//     update_Node_coordinate() {
//         const selected = this.selectedObject;
//         if (selected && (selected.type === 'Node' || selected.type === 'Sprinkler' || selected.type === 'Source')) {
//             const worldPos = new THREE.Vector3();
//             selected.getWorldPosition(worldPos);
//             const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
//             const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
//             setVal("pbCX_edit_node", worldPos.x);
//             setVal("pbCY_edit_node", worldPos.y);
//             setVal("pbCZ_edit_node", worldPos.z);
//             setTxt("type_node_edit", selected.type);
//             setTxt("number_node_edit", `${selected.name} id: ${selected.id}`);
//         }
//     },

//     onResize() {
//         const a = window.innerWidth / window.innerHeight;
//         const f = 20000;

//         this.camera.left = -f * a / 2;
//         this.camera.right = f * a / 2;
//         this.camera.top = f / 2;
//         this.camera.bottom = -f / 2;

//         this.camera.updateProjectionMatrix();
//         this.renderer.setSize(window.innerWidth, window.innerHeight);

//         if (this.labelRenderer) {
//             this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
//         }
//     },

//     // =========================================================================
//     // ОБНОВЛЕНИЕ ВИДЖЕТА ОСЕЙ (синхронизация с камерой)
//     // =========================================================================
//     updateAxesWidget() {
//         const w = this.axesWidget;
//         if (!w || !w.renderer || !w.scene || !w.camera) return;

//         w.camera.position.copy(this.camera.position).normalize().multiplyScalar(6); // ✅ Синхронизировано с дистанцией 6
//         w.camera.lookAt(0, 0, 0);
//         w.camera.up.copy(this.camera.up);
//         w.camera.updateProjectionMatrix();

//         w.renderer.render(w.scene, w.camera);
//     },

//     // animate() {
//     //     requestAnimationFrame(() => this.animate());
//     //     this.controls.update();
//     //     this.renderer.render(this.scene, this.camera);

//     //     if (this.labelRenderer) {
//     //         this.labelRenderer.render(this.scene, this.camera);
//     //     }

//     //     // ✅ Обновляем виджет осей каждый кадр
//     //     this.updateAxesWidget();
//     // }


//     animate() {
//         requestAnimationFrame(() => this.animate());
//         this.controls.update();

//         // Получаем реальные размеры канваса с учетом DPI
//         const w = this.renderer.domElement.width / this.renderer.getPixelRatio();
//         const h = this.renderer.domElement.height / this.renderer.getPixelRatio();

//         // =========================================================================
//         // 1. РЕНДЕР ОСНОВНОЙ СЦЕНЫ (на весь экран)
//         // =========================================================================
//         this.renderer.setScissorTest(false);
//         this.renderer.setViewport(0, 0, w, h);
//         this.renderer.render(this.scene, this.camera);

//         if (this.labelRenderer) {
//             this.labelRenderer.render(this.scene, this.camera);
//         }

//         // =========================================================================
//         // 2. РЕНДЕР УГЛОВОГО ГИЗМО (прямо на том же холсте, без лишних окон)
//         // =========================================================================
//         if (typeof STATE !== 'undefined' && STATE.showAxesGizmo && STATE.gizmoScene && STATE.gizmoCamera) {
//             const GIZMO_SIZE = 140; // Размер квадрата гизмо
//             const PAD = 20;         // Отступ от краев

//             // Синхронизируем вращение гизмо с основной камерой (эффект View Cube)
//             STATE.gizmoCamera.quaternion.copy(this.camera.quaternion);
//             STATE.gizmoCamera.up.copy(this.camera.up);
            
//             // Фиксируем камеру гизмо на расстоянии, чтобы она всегда смотрела в центр (0,0,0)
//             const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion).normalize();
//             STATE.gizmoCamera.position.copy(dir.multiplyScalar(6));
//             STATE.gizmoCamera.lookAt(0, 0, 0);
//             STATE.gizmoCamera.updateMatrixWorld();

//             // Настраиваем область отсечения (правый нижний угол)
//             // В WebGL координаты начинаются с левого нижнего угла (0, 0)
//             this.renderer.setScissorTest(true);
//             this.renderer.setScissor(w - GIZMO_SIZE - PAD, PAD, GIZMO_SIZE, GIZMO_SIZE);
//             this.renderer.setViewport(w - GIZMO_SIZE - PAD, PAD, GIZMO_SIZE, GIZMO_SIZE);

//             // Рендерим только гизмо в эту маленькую область
//             this.renderer.render(STATE.gizmoScene, STATE.gizmoCamera);

//             // Сбрасываем отсечение, чтобы не сломать следующие кадры
//             this.renderer.setScissorTest(false);
//         }
//     }

// };

// window.Engine = Engine;

// ============================================================
// engine.js — инициализация 3D-сцены Three.js
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from './orbit.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { STATE } from "./state.js"; // ✅ Добавлено для надежной проверки

export const Engine = {
    scene: null,
    camera: null,
    renderer: null,
    labelRenderer: null,
    controls: null,
    raycaster: null,
    mouse: new THREE.Vector2(),

    selectedObjects: [],
    selectedObject: null,

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f6fa);

        const f = 20000;
        const aspect = window.innerWidth / window.innerHeight;

        this.camera = new THREE.OrthographicCamera(
            -f * aspect / 2, f * aspect / 2,
            f / 2, -f / 2,
            0.1, 10000
        );

        this.camera.position.set(30, 30, 30);
        this.camera.lookAt(0, 0, 0);
        this.camera.zoom = 1000;
        this.camera.updateProjectionMatrix();

        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('renderCanvas'),
            antialias: true
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // CSS2DRenderer для меток
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.left = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.labelRenderer.domElement.style.zIndex = '1000';

        const canvas = document.getElementById('renderCanvas');
        if (canvas && canvas.parentElement) {
            canvas.parentElement.appendChild(this.labelRenderer.domElement);
        } else {
            document.body.appendChild(this.labelRenderer.domElement);
        }

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minZoom = 1;
        this.controls.maxZoom = 10000;
        this.controls.maxDistance = 5000;
        this.controls.maxPolarAngle = Math.PI / 2.1;
        this.controls.zoomSpeed = 2.0;

        this.raycaster = new THREE.Raycaster();

        // Освещение
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x888899, 0.7));
        const dl = new THREE.DirectionalLight(0xffffff, 0.6);
        dl.position.set(20, 30, 20);
        this.scene.add(dl);

        window.addEventListener('resize', () => this.onResize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));

        console.log("✅ Engine инициализирован");
    },

    updateMouseCoordinates(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    },

    onPointerMove(event) {
        this.updateMouseCoordinates(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const hitMesh = this.findValidMesh(intersects);
        this.renderer.domElement.style.cursor = hitMesh ? 'pointer' : 'default';
    },

    onPointerDown(event) {
        this.updateMouseCoordinates(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const hitMesh = this.findValidMesh(intersects);

        if (hitMesh) {
            if (event.ctrlKey || event.metaKey) {
                const index = this.selectedObjects.indexOf(hitMesh);
                if (index > -1) {
                    this.selectedObjects.splice(index, 1);
                    this.deselectObject(hitMesh);
                } else {
                    this.selectedObjects.push(hitMesh);
                    this.selectObject(hitMesh);
                }
            } else {
                this.selectedObjects.forEach(obj => this.deselectObject(obj));
                this.selectedObjects = [hitMesh];
                this.selectObject(hitMesh);
            }
            this.selectedObject = this.selectedObjects.length > 0 ? this.selectedObjects[this.selectedObjects.length - 1] : null;
        } else {
            this.selectedObjects.forEach(obj => this.deselectObject(obj));
            this.selectedObjects = [];
            this.selectedObject = null;
            this.hideInfoPanels();
        }

        this.update_Pipe_tube_coordinate();
        this.update_Pipe_tube();
        // this.info_selected_elevent();
        this.update_Node_coordinate();
    },

    hideInfoPanels() {
        const setDisplay = (id, display) => {
            const el = document.getElementById(id);
            if (el) el.style.display = display;
        };
        setDisplay("info_selected_node", "none");
        setDisplay("info_selected_edge", "none");
    },

        findValidMesh(intersects) {
        if (intersects.length === 0) return null;

        // 🛡️ Список имён/типов, которые НЕ должны считаться кликом по объекту
        const ignoredNames = new Set([
            'PressureLabel', 'FlowLabel', 'VelocityLabel',
            'FlowArrow', 'EdgeUI', 'SprinklerArrow'
        ]);

        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;

            // 1. Пропускаем сам объект, если он метка/стрелка/UI
            if (ignoredNames.has(obj.name)) continue;
            if (obj.isSprite) continue;                          // все спрайты-метки
            if (obj.userData && obj.userData.isPipeLabel) continue; // плоскости меток труб

            // 2. Поднимаемся по родительской цепочке
            while (obj.parent && obj.parent !== this.scene) {
                // Если наткнулись на метку/стрелку — СТОП, не поднимаемся выше
                if (ignoredNames.has(obj.parent.name)) break;
                if (obj.parent.isSprite) break;
                if (obj.parent.userData && obj.parent.userData.isPipeLabel) break;

                if (obj.type === 'Node' || obj.type === 'Sprinkler' || obj.type === 'Source' || obj.type === 'Edge') {
                    return obj;
                }
                obj = obj.parent;
            }

            // 3. Резервный вариант: обычный меш (не сетка, не свет, не метка)
            if (!obj.isGridHelper && !obj.isLight && obj.isMesh 
                && !ignoredNames.has(obj.name) && !obj.isSprite) {
                return obj;
            }
        }
        return null;
    },
    
    selectObject(mesh) {
        if (!mesh || !mesh.material || mesh.name === 'EdgeUI') return;
        if (!mesh.userData.originalColor) {
            mesh.material = mesh.material.clone();
            mesh.userData.originalColor = mesh.material.color.getHex();
        }
        mesh.material.color.setStyle('#FFFF00');
    },

    deselectObject(mesh) {
        if (!mesh || !mesh.material) return;
        if (mesh.userData.originalColor !== undefined) {
            mesh.material.color.setHex(mesh.userData.originalColor);
        }
    },

    clearSelection() {
        this.selectedObjects.forEach(obj => this.deselectObject(obj));
        this.selectedObjects = [];
        this.selectedObject = null;
    },

    update_Pipe_tube_coordinate() {
        const selected = this.selectedObject;
        if (selected && (selected.type === 'Node' || selected.type === 'Sprinkler' || selected.type === 'Source')) {
            const worldPos = new THREE.Vector3();
            selected.getWorldPosition(worldPos);
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            setVal("pbCX", worldPos.x); setVal("pbCY", worldPos.y); setVal("pbCZ", worldPos.z);
            setVal("pbCX_branch", worldPos.x); setVal("pbCY_branch", worldPos.y); setVal("pbCZ_branch", worldPos.z);
        }
    },

    update_Pipe_tube() {
        const selected = this.selectedObject;
        if (selected && selected.type === 'Edge') {
            const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            setTxt("number_pipe_edit", `${selected.name} id: ${selected.id}`);
            setTxt("type_pipe_edit", selected.ghost);
            setTxt("DN_pipe_edit", selected.DN);
            setTxt("Length_pipe_edit", selected.Length);
            setVal("pipe_edit", selected.Length);
        }
    },

    info_selected_elevent() {
        const selected = this.selectedObject;
        const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        const show = (id, vis) => { const el = document.getElementById(id); if (el) el.style.display = vis ? 'block' : 'none'; };

        if (selected && (selected.type === 'Node' || selected.type === 'Source' || selected.type === 'Sprinkler')) {
            show("info_selected_node", true);
            show("info_selected_edge", false);
            setTxt("name_selected_node", `${selected.name} id: ${selected.id}`);
            setTxt("type_selected_node", selected.type);
            setVal("pbCX_selected_node", selected.X_gl);
            setVal("pbCY_selected_node", selected.Y_gl);
            setVal("pbCZ_selected_node", selected.Z_gl);
        } else if (selected && selected.type === 'Edge') {
            show("info_selected_edge", true);
            show("info_selected_node", false);
            setTxt("name_selected_edge", `${selected.name} id: ${selected.id}`);
            setTxt("name_selected_edge_uuid", selected.uuid);
            setVal("pbCX_selected_start_node", selected.start_node.X_gl);
            setVal("pbCY_selected_start_node", selected.start_node.Y_gl);
            setVal("pbCZ_selected_start_node", selected.start_node.Z_gl);
            setVal("pbCX_selected_end_node", selected.end_node.X_gl);
            setVal("pbCY_selected_end_node", selected.end_node.Y_gl);
            setVal("pbCZ_selected_end_node", selected.end_node.Z_gl);
            setTxt("ghost_selected_edge", selected.ghost);
            setTxt("DN_selected_edge", selected.DN);
            setTxt("length_selected_edge", selected.Length);
            setTxt("kt_selected_edge", selected.k_t);
            setTxt("kvelocity_selected_edge", selected.kvelocity);
        } else {
            show("info_selected_node", false);
            show("info_selected_edge", false);
        }
    },

    update_Node_coordinate() {
        const selected = this.selectedObject;
        if (selected && (selected.type === 'Node' || selected.type === 'Sprinkler' || selected.type === 'Source')) {
            const worldPos = new THREE.Vector3();
            selected.getWorldPosition(worldPos);
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
            const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            setVal("pbCX_edit_node", worldPos.x);
            setVal("pbCY_edit_node", worldPos.y);
            setVal("pbCZ_edit_node", worldPos.z);
            setTxt("type_node_edit", selected.type);
            setTxt("number_node_edit", `${selected.name} id: ${selected.id}`);
        }
    },

    onResize() {
        const a = window.innerWidth / window.innerHeight;
        const f = 20000;

        this.camera.left = -f * a / 2;
        this.camera.right = f * a / 2;
        this.camera.top = f / 2;
        this.camera.bottom = -f / 2;

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        if (this.labelRenderer) {
            this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        }
    },

    // =========================================================================
    // ✅ ГЛАВНЫЙ ЦИКЛ РЕНДЕРА С ПОДДЕРЖКОЙ SCISSOR-ГИЗМО
    // =========================================================================
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();

        // Получаем логические размеры канваса (в CSS-пикселях)
        const w = this.renderer.domElement.width / this.renderer.getPixelRatio();
        const h = this.renderer.domElement.height / this.renderer.getPixelRatio();

        // =========================================================================
        // 1. РЕНДЕР ОСНОВНОЙ СЦЕНЫ (на весь экран)
        // =========================================================================
        this.renderer.setScissorTest(false);
        this.renderer.setViewport(0, 0, w, h);
        this.renderer.render(this.scene, this.camera);

        if (this.labelRenderer) {
            this.labelRenderer.render(this.scene, this.camera);
        }

        // 2. Рендер углового гизмо поверх холста (без чёрного квадрата)
        if (STATE.showAxesGizmo && STATE.gizmoScene && STATE.gizmoCamera) {
            const GIZMO_SIZE = 140;
            const PAD = 20;

            STATE.gizmoCamera.quaternion.copy(this.camera.quaternion);
            STATE.gizmoCamera.up.copy(this.camera.up);
            const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion).normalize();
            STATE.gizmoCamera.position.copy(dir.multiplyScalar(6));
            STATE.gizmoCamera.lookAt(0, 0, 0);
            STATE.gizmoCamera.updateMatrixWorld();

            this.renderer.setScissorTest(true);
            this.renderer.setScissor(w - GIZMO_SIZE - PAD, PAD, GIZMO_SIZE, GIZMO_SIZE);
            this.renderer.setViewport(w - GIZMO_SIZE - PAD, PAD, GIZMO_SIZE, GIZMO_SIZE);

            // ✅ КЛЮЧЕВОЕ: не трогать цвет пикселей, только сбросить глубину
            this.renderer.autoClear = false;
            this.renderer.clearDepth();
            this.renderer.render(STATE.gizmoScene, STATE.gizmoCamera);
            this.renderer.autoClear = true;

            this.renderer.setScissorTest(false);
        }
    }
};

window.Engine = Engine;