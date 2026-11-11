// // ============================================================
// // engine.js — инициализация 3D-сцены Three.js
// // Зависимости: THREE (глобальный), подключается ПОСЛЕ state.js
// // ============================================================
// // import * as THREE from 'three';
// import * as THREE from 'three';
// import { OrbitControls } from './orbit.js';
// import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
// import { TransformControls } from 'three/addons/controls/TransformControls.js';

// import { Node_new, Edge_new } from './factory.js';
// import { STATE, VisualPipelins } from './state.js';

// export const Engine = {
//     scene: null,
//     camera: null,
//     renderer: null,
//     controls: null,
//     raycaster: null,
//     mouse: new THREE.Vector2(),

//     // НОВОЕ: Состояние для TransformControls и построения трубопровода
//     transformControls: null,
//     isPipelineBuilding: false,
//     currentStartNode: null,
//     currentEndNode: null,
//     currentEdge: null,
//     pipelineBuildConfig: null,
    

//     init() {        
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
//         this.camera.zoom = 10000; // Объекты будут выглядеть в 4 раза крупнее (ближе)
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



//          // ✅ ИНИЦИАЛИЗАЦИЯ TransformControls
//         this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
//         this.transformControls.setSize(100);
//         this.scene.add(this.transformControls);

//         // ✅ Отключаем OrbitControls во время перетаскивания
//         this.transformControls.addEventListener('dragging-changed', (event) => {
//             this.controls.enabled = !event.value;
            
//             // Если перетаскивание закончилось и мы в режиме построения -> фиксируем сегмент
//             if (!event.value && this.isPipelineBuilding) {
//                 this.onTransformEnd();
//             }
//         });

//         // ✅ Обновляем геометрию трубы в реальном времени при движении
//         this.transformControls.addEventListener('objectChange', () => {
//             if (this.isPipelineBuilding && this.currentEdge) {
//                 this.updateTempEdgeGeometry();
//             }
//         });

//         // ✅ Обработка клавиши Esc для завершения построения
//         window.addEventListener('keydown', (event) => {
//             if (event.key === 'Escape' && this.isPipelineBuilding) {
//                 this.stopPipelineBuilding();
//             }
//         });




//         window.addEventListener('resize', () => this.onResize());

//         this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
//         this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
//         console.log("точка в ините енджина");
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

//     // 5. СНЯТИЕ ВЫДЕЛЕНИЯ С ОДНОГО МЕША
//     deselectObject(mesh) {
//         if (!mesh || !mesh.material) return;

//         if (mesh.userData.originalColor !== undefined) {
//             mesh.material.color.setHex(mesh.userData.originalColor); // Возвращаем родной цвет
//         }
//     },


//     // =========================================================================
//     // НОВЫЕ МЕТОДЫ ДЛЯ ПОСТРОЕНИЯ ТРУБОПРОВОДА
//     // =========================================================================

//         // =========================================================================
//     // НОВЫЕ МЕТОДЫ ДЛЯ ПОСТРОЕНИЯ ТРУБОПРОВОДА
//     // =========================================================================

//     startPipelineBuilding(config) {
//         console.log("🔧 Запуск режима построения трубопровода...");
        
//         this.isPipelineBuilding = true;
//         this.pipelineBuildConfig = config;
//         this.currentStartNode = null;
//         this.buildStep = 0;
        
//         const radius = (typeof VisualPipelins !== 'undefined' && VisualPipelins.d_node_base) ? VisualPipelins.d_node_base / 2 : 0.12;
//         const Node_Geometry = new THREE.SphereGeometry(radius, 32, 32);
//         const Node_Material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        
//         this.tempNode = new Node_new(Node_Geometry, Node_Material, 'Node');
//         this.tempNode.position.set(0, 0, 0);
//         this.scene.add(this.tempNode);
        
//         if (this.transformControls) {
//             // ✅ Принудительно обновляем матрицы перед привязкой
//             this.tempNode.updateMatrixWorld(true);
            
//             // ✅ Устанавливаем фиксированный крупный размер для ортографической камеры
//             this.transformControls.setSize(5); 
            
//             this.transformControls.attach(this.tempNode);
//             this.transformControls.setMode('translate');
//             this.transformControls.enabled = true;
//             this.transformControls.setSpace('world');
            
//             this.transformControls.showX = true;
//             this.transformControls.showY = true;
//             this.transformControls.showZ = true;
            
//             if (config.activeAxis === 'x') {
//                 this.transformControls.showY = false;
//                 this.transformControls.showZ = false;
//             } else if (config.activeAxis === 'y') {
//                 this.transformControls.showX = false;
//                 this.transformControls.showZ = false;
//             } else if (config.activeAxis === 'z') {
//                 this.transformControls.showX = false;
//                 this.transformControls.showY = false;
//             }
            
//             console.log("✅ TransformControls привязан к tempNode!");
//         }
        
//         const hint = document.getElementById('buildPipelineHint');
//         if (hint) {
//             hint.style.display = 'block';
//             hint.innerHTML = `🔧 <b>Шаг 1:</b> Тяните за цветные стрелки и нажмите <b>ПРОБЕЛ</b> | Esc — отмена`;
//         }
        
//         this.buildKeyDownHandler = (event) => {
//             if (event.code === 'Space' && this.isPipelineBuilding) {
//                 event.preventDefault();
//                 this.onCreateNodeAtManipulator();
//             } else if (event.key === 'Escape') {
//                 this.stopPipelineBuilding();
//             }
//         };
        
//         window.addEventListener('keydown', this.buildKeyDownHandler);
//     },

//     onCreateNodeAtManipulator() {
//         if (!this.isPipelineBuilding || !this.tempNode) return;
        
//         const pos = this.tempNode.position.clone();
//         console.log(`✅ Создание узла в позиции: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
        
//         const radius = (typeof VisualPipelins !== 'undefined' && VisualPipelins.d_node_base) ? VisualPipelins.d_node_base / 2 : 0.12;
//         const Node_Geometry = new THREE.SphereGeometry(radius, 32, 32);
//         const Node_Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
//         const newNode = new Node_new(Node_Geometry, Node_Material, 'Node');
//         newNode.position.copy(pos);
//         this.scene.add(newNode);
//         if (typeof STATE !== 'undefined' && STATE.Three_D_objects) {
//             STATE.Three_D_objects.push(newNode);
//         }
        
//         if (this.currentStartNode) {
//             this.createEdgeBetweenNodes(this.currentStartNode, newNode);
//         }
        
//         this.currentStartNode = newNode;
//         this.buildStep++;
        
//         this.tempNode.position.copy(pos);
        
//         const hint = document.getElementById('buildPipelineHint');
//         if (hint) {
//             hint.innerHTML = `🔧 <b>Шаг ${this.buildStep + 1}:</b> Переместите манипулятор и нажмите <b>ПРОБЕЛ</b> | Esc — завершить`;
//         }
        
//         if (typeof updateTreeUI === 'function') updateTreeUI();
//     },

//     createEdgeBetweenNodes(startNode, endNode) {
//         const startPos = startNode.position.clone();
//         const endPos = endNode.position.clone();
//         const length = startPos.distanceTo(endPos);
        
//         const path = new THREE.LineCurve3(startPos, endPos);
//         const config = this.pipelineBuildConfig || {};
//         const radius = (config.DN || 50) / 2000;
        
//         const pipeGeom = new THREE.TubeGeometry(path, 32, radius > 0 ? radius : 0.05, 12, false);
//         const pipeMat = new THREE.MeshBasicMaterial({ color: '#0F1379' });
        
//         const edge = new Edge_new(
//             pipeGeom, pipeMat, startNode, endNode, 'Edge', length,
//             config.DN || 50, config.type || "Стальная", config.k_t || 0.01, config.kvelocity || 1.0
//         );
        
//         startNode.attach(edge);
//         edge.attach(endNode);
//         console.log(`✅ Труба создана! Длина: ${length.toFixed(2)} м`);
//     },

//     stopPipelineBuilding() {
//         if (!this.isPipelineBuilding) return;
        
//         this.isPipelineBuilding = false;
        
//         if (this.transformControls) {
//             this.transformControls.detach();
//         }
        
//         if (this.tempNode) {
//             this.scene.remove(this.tempNode);
//             this.tempNode = null;
//         }
        
//         if (this.buildKeyDownHandler) {
//             window.removeEventListener('keydown', this.buildKeyDownHandler);
//             this.buildKeyDownHandler = null;
//         }
        
//         const hint = document.getElementById('buildPipelineHint');
//         if (hint) hint.style.display = 'none';
        
//         this.currentStartNode = null;
//         this.currentEndNode = null;
//         this.currentEdge = null;
//         this.pipelineBuildConfig = null;
//         this.buildStep = 0;
        
//         if (typeof updateTreeUI === 'function') updateTreeUI();
//         if (typeof checkAllPipelines === 'function') checkAllPipelines();
        
//         console.log("✅ Построение трубопровода завершено!");
//     },


//     createTempEdge() {
//         if (this.currentEdge) {
//             this.updateTempEdgeGeometry();
//             return;
//         }
        
//         const path = new THREE.LineCurve3(this.currentStartNode.position.clone(), this.currentEndNode.position.clone());
//         const config = this.pipelineBuildConfig || {};
//         const radius = (config.DN || 50) / 2000;
        
//         const pipeGeom = new THREE.TubeGeometry(path, 32, radius > 0 ? radius : 0.05, 12, false);
//         const pipeMat = new THREE.MeshBasicMaterial({ color: '#0F1379' });
        
//         this.currentEdge = new Edge_new(
//             pipeGeom, pipeMat, 
//             this.currentStartNode, this.currentEndNode, 
//             'Edge', 0, 
//             config.DN || 50,
//             config.type || "Стальная",
//             config.k_t || 0.01,
//             config.kvelocity || 1.0
//         );
        
//         this.currentStartNode.attach(this.currentEdge);
//         this.currentEdge.attach(this.currentEndNode);
//     },

//     updateTempEdgeGeometry() {
//         if (!this.currentEdge || !this.currentStartNode || !this.currentEndNode) return;
        
//         const startPos = this.currentStartNode.position.clone();
//         const endPos = this.currentEndNode.position.clone();
//         this.currentEdge.Length = startPos.distanceTo(endPos);
        
//         const path = new THREE.LineCurve3(startPos, endPos);
//         this.currentEdge.geometry.dispose();
//         const radius = (this.pipelineBuildConfig?.DN || 50) / 2000;
//         this.currentEdge.geometry = new THREE.TubeGeometry(path, 32, radius > 0 ? radius : 0.05, 12, false);
        
//         const hint = document.getElementById('buildPipelineHint');
//         if (hint) {
//             hint.innerHTML = `🔧 Режим построения: длина сегмента <b>${this.currentEdge.Length.toFixed(2)} м</b> | Esc — завершить`;
//         }
//     },

//     applyAxisConstraints(activeAxis) {
//         this.transformControls.showX = false;
//         this.transformControls.showY = false;
//         this.transformControls.showZ = false;
        
//         if (activeAxis === 'x') this.transformControls.showX = true;
//         else if (activeAxis === 'y') this.transformControls.showY = true;
//         else if (activeAxis === 'z') this.transformControls.showZ = true;
//     },

//     onTransformEnd() {
//         if (!this.isPipelineBuilding) return;
        
//         console.log(`✅ Сегмент создан! Длина: ${this.currentEdge.Length.toFixed(2)} м`);
        
//         this.currentStartNode = this.currentEndNode;
        
//         const radius = typeof VisualPipelins !== 'undefined' ? VisualPipelins.d_node_base / 2 : 0.12;
//         const Node_Geometry = new THREE.SphereGeometry(radius, 32, 32);
//         const Node_Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
//         this.currentEndNode = new Node_new(Node_Geometry, Node_Material, 'Node');
//         this.currentEndNode.position.copy(this.currentStartNode.position);
//         this.scene.add(this.currentEndNode);
//         if (typeof STATE !== 'undefined' && STATE.Three_D_objects) {
//             STATE.Three_D_objects.push(this.currentEndNode);
//         }
        
//         this.currentEdge = null;
//         this.createTempEdge();
        
//         this.transformControls.attach(this.currentEndNode);
        
//         if (typeof updateTreeUI === 'function') updateTreeUI();
//     },

//     stopPipelineBuilding() {
//         if (!this.isPipelineBuilding) return;
        
//         this.isPipelineBuilding = false;
//         this.transformControls.detach();
        
//         this.currentStartNode = null;
//         this.currentEndNode = null;
//         this.currentEdge = null;
//         this.pipelineBuildConfig = null;
        
//         const hint = document.getElementById('buildPipelineHint');
//         if (hint) hint.style.display = 'none';
        
//         if (typeof updateTreeUI === 'function') updateTreeUI();
//         if (typeof checkAllPipelines === 'function') checkAllPipelines();
        
//         console.log("✅ Построение трубопровода завершено!");
//     },

//     /// =========================================================================
//     /// НОВЫЕ МЕТОДЫ ДЛЯ ПОСТРОЕНИЯ ТРУБОПРОВОДА
//     /// =========================================================================


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


// ============================================================
// engine.js — инициализация 3D-сцены Three.js
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from './orbit.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { Node_new, Edge_new } from './factory.js';
import { STATE, VisualPipelins } from './state.js';

export const Engine = {
    scene: null,
    camera: null,
    renderer: null,
    labelRenderer: null,
    controls: null,
    raycaster: null,
    mouse: new THREE.Vector2(),

    transformControls: null,
    isPipelineBuilding: false,
    currentStartNode: null,
    currentEndNode: null,
    currentEdge: null,
    pipelineBuildConfig: null,
    tempNode: null,
    _onManipulatorChange: null,
    buildKeyDownHandler: null,
    buildStep: 0,

    // ✅ АННОТАЦИИ
    annotations: [],

    init() {        
        // ✅ ВСТАВЛЯЕМ СТИЛИ ДЛЯ АННОТАЦИЙ ПРЯМО В JS
        this.injectAnnotationStyles();
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f6fa);

        const f = 20000; 
        const aspect = window.innerWidth / window.innerHeight;
        
        this.camera = new THREE.OrthographicCamera(
            -f * aspect / 2, f * aspect / 2,
            f / 2, -f / 2,
            -10000, 10000 
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

        // CSS3DRenderer для режима "Изменить длины" и аннотаций
        this.labelRenderer = new CSS3DRenderer();
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
        this.selectedObjects = [];
        this.selectedObject = null;

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x888899, 0.7));
        const dl = new THREE.DirectionalLight(0xffffff, 0.6);
        dl.position.set(20, 30, 20);
        this.scene.add(dl);

        // TransformControls
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        const gizmo = this.transformControls.getHelper ? this.transformControls.getHelper() : this.transformControls;
        this.scene.add(gizmo);

        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
        });

        // Динамическая корректировка размера манипулятора при изменении зума
        this.controls.addEventListener('change', () => {
            if (this.isPipelineBuilding && this.transformControls) {
                const baseSize = 0.45;
                const baseZoom = 1000;
                const newSize = baseSize * (this.camera.zoom / baseZoom);
                this.transformControls.setSize(newSize);
            }
        });

        window.addEventListener('resize', () => this.onResize());
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.renderer.domElement.addEventListener('pointermove', (e) => this.onPointerMove(e));
    },

    // ✅ ВСТАВКА СТИЛЕЙ ДЛЯ АННОТАЦИЙ
    injectAnnotationStyles() {
        if (document.getElementById('engine-annotation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'engine-annotation-styles';
        style.textContent = `
            /* Стили для аннотаций */
            .annotation-label {
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                border: 2px solid #00ff00;
                font-family: 'Roboto', Arial, sans-serif;
                font-size: 12px;
                pointer-events: none;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                transform: translate(-50%, -50%);
                z-index: 1001;
            }

            .annotation-title {
                font-weight: bold;
                color: #00ff00;
                margin-bottom: 4px;
                font-size: 13px;
            }

            .annotation-coords {
                font-size: 11px;
                color: #cccccc;
            }

            .annotation-info {
                font-size: 11px;
                color: #cccccc;
                line-height: 1.4;
            }

            .annotation-label.warning {
                border-color: #ffff00;
            }
            .annotation-label.warning .annotation-title {
                color: #ffff00;
            }

            .annotation-label.danger {
                border-color: #ff0000;
            }
            .annotation-label.danger .annotation-title {
                color: #ff0000;
            }
        `;
        document.head.appendChild(style);
        console.log("✅ Стили аннотаций вставлены");
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
        if (this.isPipelineBuilding) return;

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
        }

        this.update_Pipe_tube_coordinate();
        this.update_Pipe_tube();
        this.info_selected_elevent();
        this.update_Node_coordinate();
    },

    findValidMesh(intersects) {
        if (intersects.length === 0) return null;
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            if (obj.name === 'EdgeUI' || (obj.parent && obj.parent.name === 'EdgeUI')) continue;
            
            while (obj.parent && obj.parent !== this.scene) {
                if (obj.parent.name === 'EdgeUI') break;
                if (obj.type === 'Node' || obj.type === 'Sprinkler' || obj.type === 'Source' || obj.type === 'Edge') {
                    return obj; 
                }
                obj = obj.parent;
            }
            if (!obj.isGridHelper && !obj.isLight && obj.isMesh && obj.name !== 'EdgeUI') {
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

    // =========================================================================
    // АННОТАЦИИ: стрелка + текст к 3D-объекту
    // =========================================================================

    /**
     * Создаёт аннотацию: стрелка от точки к объекту + текстовая метка
     * @param {THREE.Object3D} targetObject - объект, на который указывает аннотация
     * @param {THREE.Vector3} startPoint - откуда начинается стрелка (мировые координаты)
     * @param {string} text - заголовок аннотации
     * @param {number} color - цвет стрелки (hex)
     * @param {string} extraInfo - дополнительная информация (HTML)
     */
    createAnnotation(targetObject, startPoint, text, color = 0xff0000, extraInfo = '') {
        // 1. Мировая позиция целевого объекта
        const targetPos = new THREE.Vector3();
        targetObject.getWorldPosition(targetPos);

        // 2. ArrowHelper (стрелка)
        const direction = new THREE.Vector3().subVectors(targetPos, startPoint).normalize();
        const length = startPoint.distanceTo(targetPos);
        
        const arrow = new THREE.ArrowHelper(
            direction,
            startPoint,
            length,
            color,
            Math.max(length * 0.15, 0.3),
            Math.max(length * 0.08, 0.15)
        );
        arrow.name = 'AnnotationArrow';
        this.scene.add(arrow);

        // 3. Текстовая метка через CSS3DObject
        const labelDiv = document.createElement('div');
        labelDiv.className = 'annotation-label';
        
        // Определяем класс по цвету
        if (color === 0xffff00) labelDiv.classList.add('warning');
        else if (color === 0xff0000) labelDiv.classList.add('danger');
        
        let coordsHtml = `X: ${targetPos.x.toFixed(2)} | Y: ${targetPos.y.toFixed(2)} | Z: ${targetPos.z.toFixed(2)}`;
        
        labelDiv.innerHTML = `
            <div class="annotation-title">${text}</div>
            ${extraInfo ? `<div class="annotation-info">${extraInfo}</div>` : ''}
            <div class="annotation-coords">${coordsHtml}</div>
        `;
        
        const label = new CSS3DObject(labelDiv);
        label.position.copy(targetPos);
        label.position.y += 1.5;
        label.name = 'AnnotationLabel';
        this.scene.add(label);

        // 4. Сохраняем аннотацию
        const annotation = {
            arrow: arrow,
            label: label,
            labelDiv: labelDiv,
            target: targetObject,
            startPoint: startPoint.clone(),
            color: color,
            text: text,
            extraInfo: extraInfo
        };
        
        this.annotations.push(annotation);
        
        console.log(`✅ Аннотация создана: "${text}" → ${targetObject.type}`);
        return annotation;
    },

    /**
     * Создаёт аннотацию к узлу с информацией о давлении/расходе
     */
    createNodeAnnotation(node, offset = 3) {
        const pos = new THREE.Vector3();
        node.getWorldPosition(pos);
        
        const startPoint = pos.clone();
        startPoint.y += offset; // Стрелка идёт сверху вниз
        
        let color = 0x00ff00;
        let extraInfo = '';
        
        if (node.pressure_m !== undefined) {
            extraInfo += `P = ${node.pressure_m.toFixed(2)} м<br>`;
            if (node.pressure_m < 10) color = 0xff0000;
            else if (node.pressure_m < 20) color = 0xffff00;
        }
        if (node.flow_l_s !== undefined) {
            extraInfo += `Q = ${node.flow_l_s.toFixed(2)} л/с`;
        }
        
        return this.createAnnotation(node, startPoint, `${node.type} #${node.id}`, color, extraInfo);
    },

    /**
     * Создаёт аннотацию к трубе (посередине)
     */
    createEdgeAnnotation(edge, offset = 1.5) {
        const startPos = new THREE.Vector3();
        const endPos = new THREE.Vector3();
        edge.start_node.getWorldPosition(startPos);
        edge.end_node.getWorldPosition(endPos);
        
        const midPoint = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
        const startPoint = midPoint.clone();
        startPoint.y += offset;
        
        const extraInfo = `L = ${edge.Length.toFixed(2)} м | DN = ${edge.DN} мм`;
        
        return this.createAnnotation(edge, startPoint, `Труба`, 0x0000ff, extraInfo);
    },

    /**
     * Обновляет все аннотации (вызывать в animate())
     */
    updateAnnotations() {
        for (let i = this.annotations.length - 1; i >= 0; i--) {
            const ann = this.annotations[i];
            
            if (!ann.target || !ann.target.parent) {
                this.removeAnnotation(ann);
                continue;
            }

            const targetPos = new THREE.Vector3();
            ann.target.getWorldPosition(targetPos);

            // Обновляем стрелку
            const newDirection = new THREE.Vector3().subVectors(targetPos, ann.startPoint).normalize();
            const newLength = ann.startPoint.distanceTo(targetPos);
            
            ann.arrow.setDirection(newDirection);
            ann.arrow.setLength(
                newLength, 
                Math.max(newLength * 0.15, 0.3), 
                Math.max(newLength * 0.08, 0.15)
            );

            // Обновляем позицию метки
            ann.label.position.copy(targetPos);
            ann.label.position.y += 1.5;

            // Обновляем координаты в тексте
            const coordsDiv = ann.labelDiv.querySelector('.annotation-coords');
            if (coordsDiv) {
                coordsDiv.innerHTML = `X: ${targetPos.x.toFixed(2)} | Y: ${targetPos.y.toFixed(2)} | Z: ${targetPos.z.toFixed(2)}`;
            }
        }
    },

    /**
     * Удаляет одну аннотацию
     */
    removeAnnotation(annotation) {
        if (annotation.arrow) this.scene.remove(annotation.arrow);
        if (annotation.label) this.scene.remove(annotation.label);
        const idx = this.annotations.indexOf(annotation);
        if (idx > -1) this.annotations.splice(idx, 1);
    },

    /**
     * Удаляет все аннотации
     */
    clearAnnotations() {
        this.annotations.forEach(ann => this.removeAnnotation(ann));
        this.annotations = [];
        console.log("✅ Все аннотации удалены");
    },

    // =========================================================================
    // ПОСТРОЕНИЕ ТРУБОПРОВОДА
    // =========================================================================

    startPipelineBuilding(config) {
        console.log("🔧 Запуск режима построения...");
        
        this.isPipelineBuilding = true;
        this.pipelineBuildConfig = config;
        
        this.currentStartNode = (this.selectedObject && (this.selectedObject.type === 'Node' || this.selectedObject.type === 'Sprinkler' || this.selectedObject.type === 'Source')) 
            ? this.selectedObject 
            : null;
            
        this.buildStep = 0;
        
        const radius = (typeof VisualPipelins !== 'undefined' && VisualPipelins.d_node_base) ? VisualPipelins.d_node_base / 2 : 0.12;
        const Node_Geometry = new THREE.SphereGeometry(radius, 32, 32);
        const Node_Material = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: false }); 
        
        this.tempNode = new Node_new(Node_Geometry, Node_Material, 'Node');
        const startPos = this.currentStartNode ? this.currentStartNode.position.clone() : new THREE.Vector3(0, 0, 0);
        this.tempNode.position.copy(startPos);
        this.scene.add(this.tempNode);
        
        if (this.transformControls) {
            this.tempNode.updateMatrixWorld(true);
            
            const baseSize = 0.45;
            const baseZoom = 1000;
            const adaptiveSize = baseSize * (this.camera.zoom / baseZoom);
            this.transformControls.setSize(adaptiveSize);
            
            this.transformControls.attach(this.tempNode);
            this.transformControls.update();
            
            this.transformControls.setMode('translate');
            this.transformControls.enabled = true;
            this.transformControls.setSpace('world');
            
            this.transformControls.showX = true;
            this.transformControls.showY = true;
            this.transformControls.showZ = true;
            
            console.log("✅ TransformControls привязан. Размер:", adaptiveSize.toFixed(4), "| Zoom:", this.camera.zoom);
        } else {
            console.error("❌ ОШИБКА: transformControls не инициализирован!");
        }
        
        this.controls.target.copy(this.tempNode.position);
        this.controls.update();
        
        const hint = document.getElementById('buildPipelineHint');
        if (hint) {
            hint.style.display = 'block';
            hint.innerHTML = `🔧 Тяните за стрелки. <b>ENTER</b> — создать узел, <b>Esc</b> — отмена`;
        }
        
        this._onManipulatorChange = () => {
            this.syncManipulatorToUI();
            if (this.currentEdge) {
                this.updateTempEdgeGeometry();
            }
        };
        this.transformControls.addEventListener('objectChange', this._onManipulatorChange);
        
        this.syncManipulatorToUI();
        
        this.buildKeyDownHandler = (event) => {
            if (!this.isPipelineBuilding) return;
            
            if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                return;
            }
            
            if (event.code === 'Enter' || event.key === 'Enter') {
                event.preventDefault();
                console.log("✅ ENTER нажат — создаём узел");
                this.onCreateNodeAtManipulator();
            } else if (event.code === 'Space') {
                event.preventDefault();
                this.onCreateNodeAtManipulator();
            } else if (event.key === 'Escape') {
                this.stopPipelineBuilding();
            }
        };
        window.addEventListener('keydown', this.buildKeyDownHandler);
    },

    syncManipulatorToUI() {
        if (!this.tempNode) return;
        const startPos = this.currentStartNode ? this.currentStartNode.position.clone() : new THREE.Vector3(0, 0, 0);
        const distance = this.tempNode.position.distanceTo(startPos);
        
        const lengthInput = document.getElementById('pbLength');
        if (lengthInput) lengthInput.value = distance.toFixed(2);

        const cxInput = document.getElementById('pbCX');
        const cyInput = document.getElementById('pbCY');
        const czInput = document.getElementById('pbCZ');
        
        if (cxInput) cxInput.value = this.tempNode.position.x.toFixed(2);
        if (cyInput) cyInput.value = this.tempNode.position.y.toFixed(2);
        if (czInput) czInput.value = this.tempNode.position.z.toFixed(2);
    },

    applyUIValuesToManipulator() {
        if (!this.tempNode || !this.pipelineBuildConfig) return;
        
        const lengthInput = document.getElementById('pbLength');
        const newLength = parseFloat(lengthInput ? lengthInput.value : 0);
        
        if (isNaN(newLength) || newLength < 0.1) return;
        
        const startPos = this.currentStartNode ? this.currentStartNode.position.clone() : new THREE.Vector3(0, 0, 0);
        const direction = new THREE.Vector3();
        
        if (this.pipelineBuildConfig.activeAxis === 'x') direction.set(1, 0, 0);
        else if (this.pipelineBuildConfig.activeAxis === 'y') direction.set(0, 1, 0);
        else if (this.pipelineBuildConfig.activeAxis === 'z') direction.set(0, 0, 1);
        
        this.tempNode.position.copy(startPos).add(direction.multiplyScalar(newLength));
        console.log(`✅ Манипулятор перемещен на ${newLength} м`);
    },

    onCreateNodeAtManipulator() {
        if (!this.isPipelineBuilding || !this.tempNode) return;
        
        const pos = this.tempNode.position.clone();
        console.log(`✅ Создание узла в: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
        
        const radius = (typeof VisualPipelins !== 'undefined' && VisualPipelins.d_node_base) ? VisualPipelins.d_node_base / 2 : 0.12;
        const Node_Geometry = new THREE.SphereGeometry(radius, 32, 32);
        const Node_Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        const newNode = new Node_new(Node_Geometry, Node_Material, 'Node');
        newNode.position.copy(pos);
        this.scene.add(newNode);
        if (typeof STATE !== 'undefined' && STATE.Three_D_objects) {
            STATE.Three_D_objects.push(newNode);
        }
        
        if (this.currentStartNode) {
            this.createEdgeBetweenNodes(this.currentStartNode, newNode);
        }
        
        this.currentStartNode = newNode;
        this.buildStep++;
        
        this.tempNode.position.copy(pos);
        this.syncManipulatorToUI();
        
        const hint = document.getElementById('buildPipelineHint');
        if (hint) {
            hint.innerHTML = `🔧 <b>Шаг ${this.buildStep + 1}:</b> Переместите манипулятор и нажмите <b>ENTER</b> | Esc — завершить`;
        }
        
        if (typeof updateTreeUI === 'function') updateTreeUI();
        
        console.log(`✅ Узел создан! Всего узлов: ${this.buildStep}`);
    },

    createEdgeBetweenNodes(startNode, endNode) {
        const startPos = startNode.position.clone();
        const endPos = endNode.position.clone();
        const length = startPos.distanceTo(endPos);
        
        const path = new THREE.LineCurve3(startPos, endPos);
        const config = this.pipelineBuildConfig || {};
        const radius = (config.DN || 50) / 2000;
        
        const pipeGeom = new THREE.TubeGeometry(path, 32, radius > 0 ? radius : 0.05, 12, false);
        const pipeMat = new THREE.MeshBasicMaterial({ color: '#0F1379' });
        
        this.currentEdge = new Edge_new(
            pipeGeom, pipeMat, startNode, endNode, 'Edge', length,
            config.DN || 50, config.type || "Стальная", config.k_t || 0.01, config.kvelocity || 1.0
        );
        
        startNode.attach(this.currentEdge);
        this.currentEdge.attach(endNode);
        console.log(`✅ Труба создана! Длина: ${length.toFixed(2)} м`);
    },

    updateTempEdgeGeometry() {
        if (!this.currentEdge || !this.currentStartNode || !this.tempNode) return;
        
        const startPos = this.currentStartNode.position.clone();
        const endPos = this.tempNode.position.clone();
        this.currentEdge.Length = startPos.distanceTo(endPos);
        
        const path = new THREE.LineCurve3(startPos, endPos);
        this.currentEdge.geometry.dispose();
        const radius = (this.pipelineBuildConfig?.DN || 50) / 2000;
        this.currentEdge.geometry = new THREE.TubeGeometry(path, 32, radius > 0 ? radius : 0.05, 12, false);
        
        const hint = document.getElementById('buildPipelineHint');
        if (hint) {
            hint.innerHTML = `🔧 Режим построения: длина сегмента <b>${this.currentEdge.Length.toFixed(2)} м</b> | Esc — завершить`;
        }
    },

    stopPipelineBuilding() {
        if (!this.isPipelineBuilding) return;
        this.isPipelineBuilding = false;
        
        if (this._onManipulatorChange) {
            this.transformControls.removeEventListener('objectChange', this._onManipulatorChange);
        }
        
        if (this.transformControls) {
            this.transformControls.detach();
        }
        
        if (this.tempNode) {
            this.scene.remove(this.tempNode);
            this.tempNode = null;
        }
        
        if (this.buildKeyDownHandler) {
            window.removeEventListener('keydown', this.buildKeyDownHandler);
            this.buildKeyDownHandler = null;
        }
        
        const hint = document.getElementById('buildPipelineHint');
        if (hint) hint.style.display = 'none';
        
        this.currentStartNode = null;
        this.currentEdge = null;
        this.pipelineBuildConfig = null;
        this.buildStep = 0;
        
        if (typeof updateTreeUI === 'function') updateTreeUI();
        if (typeof checkAllPipelines === 'function') checkAllPipelines();
        
        console.log("✅ Построение завершено!");
    },

    update_Pipe_tube_coordinate() {
        const selected = this.selectedObject;
        const inputX = document.getElementById("pbCX");
        const inputY = document.getElementById("pbCY");
        const inputZ = document.getElementById("pbCZ");
        const inputX_branch = document.getElementById("pbCX_branch");
        const inputY_branch = document.getElementById("pbCY_branch");
        const inputZ_branch = document.getElementById("pbCZ_branch");
        
        if (selected && (selected.type === 'Node' || selected.type === 'Sprinkler' || selected.type === 'Source')) {
            const worldPos = new THREE.Vector3();
            selected.getWorldPosition(worldPos);
            if(inputX) inputX.value = worldPos.x;
            if(inputY) inputY.value = worldPos.y;
            if(inputZ) inputZ.value = worldPos.z;
            if(inputX_branch) inputX_branch.value = worldPos.x;
            if(inputY_branch) inputY_branch.value = worldPos.y;
            if(inputZ_branch) inputZ_branch.value = worldPos.z;
        }
    },

    update_Pipe_tube() {
        const selected = this.selectedObject;
        if (selected && selected.type === 'Edge') {
            const el1 = document.getElementById("number_pipe_edit");
            const el2 = document.getElementById("type_pipe_edit");
            const el3 = document.getElementById("DN_pipe_edit");
            const el4 = document.getElementById("Length_pipe_edit");
            const el5 = document.getElementById("pipe_edit");
            if(el1) el1.innerText = `${selected.name} id: ${selected.id}`;
            if(el2) el2.innerText = selected.ghost;
            if(el3) el3.innerText = selected.DN;
            if(el4) el4.innerText = selected.Length;
            if(el5) el5.value = selected.Length;
        }
    },

    info_selected_elevent() {
        const selected = this.selectedObject;
        if (selected && (selected.type === 'Node' || selected.type === 'Source' || selected.type === 'Sprinkler')) {
            document.getElementById("info_selected_node").style.display = 'block';
            document.getElementById("info_selected_edge").style.display = 'none';
            document.getElementById("name_selected_node").innerText = `${selected.name} id: ${selected.id}`;
            document.getElementById("type_selected_node").innerText = selected.type;
            document.getElementById("pbCX_selected_node").value = selected.X_gl;
            document.getElementById("pbCY_selected_node").value = selected.Y_gl;
            document.getElementById("pbCZ_selected_node").value = selected.Z_gl;
        } else if (selected && selected.type === 'Edge') {
            document.getElementById("info_selected_edge").style.display = 'block';
            document.getElementById("info_selected_node").style.display = 'none';
            document.getElementById("name_selected_edge").innerText = `${selected.name} id: ${selected.id}`;
            document.getElementById("name_selected_edge_uuid").innerText = selected.uuid;
            document.getElementById("pbCX_selected_start_node").value = selected.start_node.X_gl;
            document.getElementById("pbCY_selected_start_node").value = selected.start_node.Y_gl;
            document.getElementById("pbCZ_selected_start_node").value = selected.start_node.Z_gl;
            document.getElementById("pbCX_selected_end_node").value = selected.end_node.X_gl;
            document.getElementById("pbCY_selected_end_node").value = selected.end_node.Y_gl;
            document.getElementById("pbCZ_selected_end_node").value = selected.end_node.Z_gl;
            document.getElementById("ghost_selected_edge").innerText = selected.ghost;
            document.getElementById("DN_selected_edge").innerText = selected.DN;
            document.getElementById("length_selected_edge").innerText = selected.Length;
            document.getElementById("kt_selected_edge").innerText = selected.k_t;
            document.getElementById("kvelocity_selected_edge").innerText = selected.kvelocity;
        } else {
            document.getElementById("info_selected_node").style.display = 'none';
            document.getElementById("info_selected_edge").style.display = 'none';
        }
    },

    update_Node_coordinate() {
        const selected = this.selectedObject;
        const inputX = document.getElementById("pbCX_edit_node");
        const inputY = document.getElementById("pbCY_edit_node");
        const inputZ = document.getElementById("pbCZ_edit_node");
        
        if (selected && (selected.type === 'Node' || selected.type === 'Sprinkler' || selected.type === 'Source')) {
            const worldPos = new THREE.Vector3();
            selected.getWorldPosition(worldPos);
            if(inputX) inputX.value = worldPos.x;
            if(inputY) inputY.value = worldPos.y;
            if(inputZ) inputZ.value = worldPos.z;
            
            const typeEl = document.getElementById("type_node_edit");
            const numEl = document.getElementById("number_node_edit");
            if(typeEl) typeEl.innerText = selected.type;
            if(numEl) numEl.innerText = `${selected.name} id: ${selected.id}`;
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

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        
        // Динамическая корректировка размера манипулятора
        if (this.isPipelineBuilding && this.transformControls && this.tempNode) {
            const baseSize = 0.45;
            const baseZoom = 1000;
            const newSize = baseSize * (this.camera.zoom / baseZoom);
            this.transformControls.setSize(newSize);
        }
        
        // ✅ Обновление аннотаций
        this.updateAnnotations();
        
        this.renderer.render(this.scene, this.camera);
        
        if (this.labelRenderer) {
            this.labelRenderer.render(this.scene, this.camera);
        }
    }
};

window.Engine = Engine;