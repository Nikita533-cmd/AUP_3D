import * as THREE from 'three';
// import { Engine } from './engine.js';

import { Engine } from "./engine.js";
import { Edge_new, Node_new } from "./factory.js";
import { STATE, Utils, VisualPipelins } from "./state.js";
import { get_load_pbDiameter } from './check_input.js';
import { checkAllPipelines } from './collision.js';
import { World } from './world.js';



// ============================================================================
// ДИНАМИЧЕСКОЕ МАСШТАБИРОВАНИЕ МЕТOK ПОД ЗУМ КАМЕРЫ
// ============================================================================
STATE.calculationLabels = STATE.calculationLabels || [];

const BASE_ZOOM = 1000;
const COMPENSATION_SIZE = 1.0;    // Коэффициент для РАЗМЕРА метки (1.0 = всегда читаемы)
const COMPENSATION_OFFSET = 0.3;  // Коэффициент для СМЕЩЕНИЯ (0.3 = слабо разносятся)

function updateLabelsForZoom() {
    if (!Engine || !Engine.camera) return;
    Engine.camera.updateMatrixWorld(true);

    const raw = BASE_ZOOM / Engine.camera.zoom;
    const sizeFactor = Math.max(0.4, Math.min(Math.pow(raw, COMPENSATION_SIZE), 4));
    const offsetFactor = Math.max(0.4, Math.min(Math.pow(raw, COMPENSATION_OFFSET), 2));

    const camUp = new THREE.Vector3().setFromMatrixColumn(Engine.camera.matrixWorld, 1).normalize();
    const camRight = new THREE.Vector3().setFromMatrixColumn(Engine.camera.matrixWorld, 0).normalize();
    const camPos = Engine.camera.position;

    // Делегируем обновление каждому объекту
    for (const obj of STATE.Three_D_objects) {
        if (typeof obj.updateLabelTransform === 'function') {
            obj.updateLabelTransform(sizeFactor, offsetFactor, camRight, camUp, camPos);
        }
    }
}

(function labelZoomLoop() {
    requestAnimationFrame(labelZoomLoop);
    updateLabelsForZoom();
})();

// Блок для отображения создания трубопровода.
document.getElementById("menuCreatePipeline").onclick = () => Pipe_Line_visible_block();
// Слушатель для удаления трубопровода
document.getElementById("delete_SplitPipeline").onclick = () => delete_pipe_tube();
// Слушатель для редактирвоания трубопровода
document.getElementById("menuPipeline_Edit").onclick = () => check_pipe_tube_Edit();
// Слушатель для созданяи ветки
document.getElementById("menuCreateBranch").onclick = () => Check_CreateBranch();
// Слушатель для изменения узла
document.getElementById("menuEditNode").onclick = () => Check_Edit_Node();
// Запуск сбора инфы по объектам
document.getElementById("Add_list_object").onclick = () => Add_data_base();
// Временная проверка координат элементов
// document.getElementById("Check_3D").onclick = () => logPipelineTree(); // старая рповерка
// document.getElementById("Check_3D").onclick = () => checkAllPipelines(); // новая проверка коллизии

// Слушатель для Сохранения проекта с геометрией
document.getElementById("menuSave").onclick = () => exportToJSON();
// Слушатель для Открытия проекта с геометрией
document.getElementById("menuOpen").onclick = () => importToJSON();
// Слушатель для создания Нового проекта с геометрией
document.getElementById("menuNew").onclick = refreshPageHard;

//Слушатель скрыть/показать давления в узлах
document.getElementById("btnTogglePressure").onclick = togglePressureLabels;

//Слушатель показать/скрыть расходы по участкам труб
document.getElementById("btnToggleFlow").onclick = toggleFlowLabels;

//Слушатель показать/скрыть скоости по участкам труб
document.getElementById("btnToggleVelocity").onclick = toggleVelocityLabels;

// ============================================================================
// ПРИВЯЗКА КНОПОК (добавьте это в блок с остальными document.getElementById)
// ============================================================================
document.getElementById("DN_visible").onclick = toggleDNLabels;
document.getElementById("L_visible").onclick = toggleLengthLabels;

//Слушатель для редактирования длин
document.getElementById("btnToggleLengthEdit").onclick = toggleLengthEditMode;

document.getElementById("Node_Edit_close").onclick = () => {
  document.getElementById("Node_Edit").style.display = "none";
  // Если при нажатии на "Отмена" вызывается специальная функция, например Close_Node_Edit(), вызовите её здесь
};

// ============================================================================
// ОТДЕЛЬНОЕ УПРАВЛЕНИЕ МЕТКАМИ (ИЗОЛИРОВАННОЕ)
// ============================================================================

// 1. Управление давлением (P)
function togglePressureLabels() {
    STATE.showLabelsPressure = !STATE.showLabelsPressure;
    console.log("🔘 Давление (P):", STATE.showLabelsPressure);
    
    // Обновляем старые метки (если они еще где-то есть)
    Engine.scene.traverse((child) => {
        if (child.name === 'PressureLabel') child.visible = STATE.showLabelsPressure;
    });

    // НОВОЕ: Обновляем новые метки во всех узлах (включая оросители)
    STATE.Three_D_objects.forEach((obj) => {
        if ((obj.type === "Node" || obj.type === "Sprinkler" || obj.type === "Source") && typeof obj._updateLabelsVisibility === "function") {
            obj._updateLabelsVisibility();
        }
    });
    
    updateToggleButtonState('btnTogglePressure', STATE.showLabelsPressure);
}

// ============================================================================
// УПРАВЛЕНИЕ ВИДИМОСТЬЮ DN И ДЛИНЫ (L)
// ============================================================================

function toggleDNLabels() {
    STATE.showLabelsDN = !STATE.showLabelsDN;
    console.log("🔘 Диаметр (DN):", STATE.showLabelsDN);

    STATE.Three_D_objects.forEach((obj) => {
        if (obj.type === "Edge" && typeof obj._updateLabelsVisibility === "function") {
            obj._updateLabelsVisibility();
        }
    });

    const btn = document.getElementById("DN_visible");
    if (btn) {
        STATE.showLabelsDN ? btn.classList.add("active") : btn.classList.remove("active");
    }
}

function toggleLengthLabels() {
    STATE.showLabelsLength = !STATE.showLabelsLength;
    console.log("🔘 Длина (L):", STATE.showLabelsLength);

    STATE.Three_D_objects.forEach((obj) => {
        if (obj.type === "Edge" && typeof obj._updateLabelsVisibility === "function") {
            obj._updateLabelsVisibility();
        }
    });

    const btn = document.getElementById("L_visible");
    if (btn) {
        STATE.showLabelsLength ? btn.classList.add("active") : btn.classList.remove("active");
    }
}

// Управление расходом (Q)
function toggleFlowLabels() {
    STATE.showLabelsMassFlowRate = !STATE.showLabelsMassFlowRate;
    console.log("🔘 Расход (Q):", STATE.showLabelsMassFlowRate);

    // 1. Обновляем видимость меток расхода на ТРУБАХ
    STATE.Three_D_objects.forEach((obj) => {
        if (obj.type === "Edge" && typeof obj._updateLabelsVisibility === "function") {
            obj._updateLabelsVisibility();
        }
    });

    // 2. ДОБАВИТЬ: Обновляем видимость меток расхода на УЗЛАХ (включая оросители и источники)
    STATE.Three_D_objects.forEach((obj) => {
        if ((obj.type === "Node" || obj.type === "Sprinkler" || obj.type === "Source") && typeof obj._updateLabelsVisibility === "function") {
            obj._updateLabelsVisibility();
        }
    });

    // Также обновляем старые метки в STATE.calculationLabels (для совместимости)
    STATE.calculationLabels.forEach(label => {
        if (label.name === 'FlowLabel' || label.name === 'FlowArrow') {
            label.visible = STATE.showLabelsMassFlowRate;
        }
    });

    const btn = document.getElementById("btnToggleFlow");
    if (btn) {
        STATE.showLabelsMassFlowRate ? btn.classList.add("active") : btn.classList.remove("active");
    }
}

// Управление скоростью (V)
function toggleVelocityLabels() {
    STATE.showLabelsVelocity = !STATE.showLabelsVelocity;
    console.log("🔘 Скорость (V):", STATE.showLabelsVelocity);

    // Обновляем видимость через методы классов
    STATE.Three_D_objects.forEach((obj) => {
        if (obj.type === "Edge" && typeof obj._updateLabelsVisibility === "function") {
            obj._updateLabelsVisibility();
        }
    });

    // Также обновляем старые метки в STATE.calculationLabels (для совместимости)
    STATE.calculationLabels.forEach(label => {
        if (label.name === 'VelocityLabel') {
            label.visible = STATE.showLabelsVelocity;
        }
    });

    const btn = document.getElementById("btnToggleVelocity");
    if (btn) {
        STATE.showLabelsVelocity ? btn.classList.add("active") : btn.classList.remove("active");
    }
}

// Логика переключения кнопок направления (+X, -Y и т.д.)
document.addEventListener('click', function(e) {
    // Ищем ближайшего родителя с классом .axis-dir-btn (защищает от клика по тексту/иконке внутри)
    const btn = e.target.closest('.axis-dir-btn');
    
    if (btn) {
        // 1. Убираем класс 'active' у всех кнопок направления
        document.querySelectorAll('.axis-dir-btn').forEach(b => b.classList.remove('active'));
        
        // 2. Добавляем класс 'active' именно той кнопке, по которой кликнули
        btn.classList.add('active');
        
        // 3. Добавим вывод в консоль для проверки (удалите эту строку, когда всё заработает)
        console.log("Выбрано направление:", btn.dataset.axis, btn.dataset.dir);
    }
});

// Проверка существования начального узала
// Если существует необходимо выбрать узел привязки
// массив для передачи на бэкэнд
// Функция для сбора информации из объектов
// alert("",)
function Add_data_base () {
    const Data_base = {
        Node: [],
        Edge: []
    };

    // 1. Находим селект
    const sprinklerSelect = document.getElementById('get_sprinkler');
    
    // 2. Считываем его текущее выбранное значение (если оно нужно в этой функции)
    const currentSprinklerValue = sprinklerSelect.value; 

    // 3. ПРИНУДИТЕЛЬНО ИНИЦИИРУЕМ СОБЫТИЕ 'change'
    // Это заставит заново сработать тот код, который слушает изменения этого селекта
    const changeEvent = new Event('change', { bubbles: true });
    sprinklerSelect.dispatchEvent(changeEvent);

    Engine.scene.traverse((child) => {    
        if (typeof child.add_list === 'function') {
            if (child.type === 'Edge') {
                const properties = child.add_list();
                Data_base.Edge.push(properties);
            }
            else {
                const properties = child.add_list();
                Data_base.Node.push(properties);
            }           
        }       
    });
    Data_base.pressure_sprinkler = Number(document.getElementById("pressure_sprinkler").value)
    console.log("Data_base для отправки на бэкэнд", Data_base)
    sendJsonAndVisualize(Data_base);
}
function Check_nodes_scene() {
    // проверка существования узла
    let Check_Nodes = false;
    Engine.scene.traverse((child) => {       
        if (child.type === 'Node') {
            Check_Nodes = true;
        }
    });
    
    return Check_Nodes;
}
// функция для вклчюения отображения блока созданяи ветки
function Pipe_Line_visible_block () {
    let Check_Nodes = Check_nodes_scene();
    if (Check_Nodes) {    
        if (!Engine.selectedObject || (Engine.selectedObject.type !== 'Node' && Engine.selectedObject.type !== 'Sprinkler' && Engine.selectedObject.type !== 'Source')) {
            alert("Перед созданием трубопровода - выберите существующий узел!");
            return; 
        }
    }
    document.getElementById("pipelineBuilder").style.display = 'block';
    document.body.classList.add('builder-active');
    
    document.getElementById("pbConfirm").onclick = () => {
        let Check_Nodes_click = Check_nodes_scene();
        if (Check_Nodes_click) {  
            Check_Nodes = true;
            if (!Engine.selectedObject || (Engine.selectedObject.type !== 'Node' && Engine.selectedObject.type !== 'Sprinkler' && Engine.selectedObject.type !== 'Source')) {
                alert("Перед созданием трубопровода - выберите существующий узел!");
                return; 
            }
        }
        
        // if (!Engine.selectedObject) {
        //     alert("Перед созданием трубопровода - выберите существующий узел!");
        // }
        const pbCX = parseFloat(document.getElementById("pbCX").value);
        const pbCY = parseFloat(document.getElementById("pbCY").value);
        const pbCZ = parseFloat(document.getElementById("pbCZ").value);        
        
        // const activeAxis = document.querySelector('.axis-btn.active').dataset.axis; // активная ось направления
        // const activeAxis_direction = document.querySelector('.dir-btn.active').dataset.dir; // активное положение направления

        const activeBtn = document.querySelector('.axis-dir-btn.active');
        const activeAxis = activeBtn.dataset.axis;             // вернет "x", "y" или "z"
        const activeAxis_direction = activeBtn.dataset.dir;    // вернет "+" или "-"

        const pbLength = parseFloat(document.getElementById("pbLength").value);
        const activeAxis_rotation = document.querySelector('.axis-btn-rot.active').dataset.axis; // активная ось дял порворота
        const rotate_value = parseFloat(document.getElementById("pbAngle").value);

        const type_tube = document.getElementById("get_tube_pipe").selectedOptions[0].textContent; // тип трубы (ГОСТ)
        
        const pbDiameter = document.getElementById("pbDiameter"); //// элемент для удосбвтва вывода свойств
        const DN_tube = parseFloat(pbDiameter.selectedOptions[0].textContent); ///// сами свойства
        const k_t = parseFloat(pbDiameter.selectedOptions[0].dataset.k_t);
        const kvelocity = parseFloat(pbDiameter.selectedOptions[0].dataset.kvelocity);
        
        CreatePipeline(pbCX, pbCY, pbCZ, activeAxis, activeAxis_direction, pbLength, activeAxis_rotation, rotate_value, type_tube, 
            DN_tube, k_t, kvelocity, Check_Nodes);
    };
    // document.getElementById("pbCancel").addEventListener("click", () => cancel("pipelineBuilder"));
    document.getElementById("pbCancel").onclick = () => cancel("pipelineBuilder");    
};
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// Функция закрытия модального окна создания 
function cancel(name) {
    document.getElementById(name).style.display = 'none';
    document.body.classList.remove('builder-active');        
}

// // функция для создания трубопровода, включена поверка начальных условий при выборре узла, и проверка конечной точки при совпадении координат
// function CreatePipeline (pbCX, pbCY, pbCZ, activeAxis, activeAxis_direction, pbLength, activeAxis_rotation, rotate_value, type_tube,
//             pbDiameter, k_t, kvelocity, Check_Nodes) {
//     // create_Pipe_line.style.display = 'block';
//     // console.log("activeAxis_direction1488888",activeAxis_direction);
//     const Node_Geometry = new THREE.SphereGeometry(VisualPipelins.d_node_base/2, 32, 32);
//     const Node_Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });    
//     const Edge_Material = new THREE.MeshBasicMaterial({ color: '#0F1379' });
    
//     console.log("Check_Nodes_121123",Check_Nodes)
//     if (Check_Nodes) {
//         const [pbCX_end, pbCY_end, pbCZ_end] = calculation_end_node(pbCX, pbCY, pbCZ, pbLength, activeAxis, activeAxis_direction,
//             activeAxis_rotation,rotate_value)
//         let Node_End; 

//         const check_node_end = check_End_Node(pbCX_end, pbCY_end, pbCZ_end);
//         console.log("check_node_end",check_node_end);
//         if(check_node_end) {
//             Node_End = check_node_end;
//         }
//         else{
//             Node_End = new Node_new(Node_Geometry, Node_Material, 'Node' );
//             Node_End.position.set(pbCX_end, pbCY_end, pbCZ_end);
//         }
            
//         // console.log("Node_End",Node_End.position);
//         // Node_Start.add(Node_End);
//         const Node_Start = Engine.selectedObject;

//         const start_World_Pos = new THREE.Vector3();
//         Node_Start.getWorldPosition(start_World_Pos);

//         const end_World_pos = new THREE.Vector3();
//         Node_End.getWorldPosition(end_World_pos);

//         const path = new THREE.LineCurve3(start_World_Pos, end_World_pos);
//         const Piepe_visible = new THREE.TubeGeometry (path, 64, VisualPipelins.d_pipe_base/2, 12, false);
//         const Pipe_connection = new Edge_new(Piepe_visible, Edge_Material, Node_Start, Node_End, 'Edge', pbLength, pbDiameter, type_tube, k_t, kvelocity );
//         Node_Start.attach(Pipe_connection);
//         if (!check_node_end) {
//             Pipe_connection.attach(Node_End);
//         }
//     }
//     else {
//         const Node_Material_start = new THREE.MeshBasicMaterial({ color: 0x800080 });
//         const Node_Start = new Node_new(Node_Geometry, Node_Material_start, 'Source');
//         Node_Start.position.set(pbCX, pbCY, pbCZ);
//         const [pbCX_end, pbCY_end, pbCZ_end] = calculation_end_node(pbCX, pbCY, pbCZ, pbLength, activeAxis, activeAxis_direction,
//             activeAxis_rotation,rotate_value)
//         const Node_End = new Node_new(Node_Geometry, Node_Material, 'Node');
//         Node_End.position.set(pbCX_end, pbCY_end, pbCZ_end);    
//         // console.log("Node_End",Node_End.position);
//         // Node_Start.add(Node_End);
//         const path = new THREE.LineCurve3(Node_Start.position, Node_End.position)
//         const Piepe_visible = new THREE.TubeGeometry (path, 64, VisualPipelins.d_pipe_base/2, 12, false)
//         const Pipe_connection = new Edge_new(Piepe_visible, Edge_Material, Node_Start, Node_End, 'Edge', pbLength, pbDiameter, type_tube, k_t, kvelocity);       
//         Engine.scene.add(Node_Start);
//         Node_Start.attach(Pipe_connection);
//         Pipe_connection.attach(Node_End); 
//         }    
//     // Engine.scene.add(Node_End);    
//     // Engine.scene.add(Pipe_connection);
//     update_Node_XYZ()
//     console.log("Engine.scene.children",Engine.scene.children);
//     console.log("STATE.Three_D_objects",STATE.Three_D_objects);
//     updateTreeUI(); // Обновить дерево построения
//     // cancel("pipelineBuilder"); 
// };



// функция для создания трубопровода
function CreatePipeline(pbCX, pbCY, pbCZ, activeAxis, activeAxis_direction, pbLength, activeAxis_rotation, rotate_value, type_tube, pbDiameter, k_t, kvelocity, Check_Nodes) {
    
    const Node_Geometry = new THREE.SphereGeometry(VisualPipelins.d_node_base/2, 32, 32);
    
    // Используем стандартные материалы без агрессивных настроек, чтобы объекты не исчезали
    const Node_Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });    
    const Edge_Material = new THREE.MeshBasicMaterial({ color: '#0F1379' });

    let Node_End;             

    console.log("Check_Nodes_121123", Check_Nodes);
    
    if (Check_Nodes) {
        const [pbCX_end, pbCY_end, pbCZ_end] = calculation_end_node(pbCX, pbCY, pbCZ, pbLength, activeAxis, activeAxis_direction, activeAxis_rotation, rotate_value);

        const check_node_end = check_End_Node(pbCX_end, pbCY_end, pbCZ_end);
        
        if (check_node_end) {
            Node_End = check_node_end; 
        } else {
            Node_End = new Node_new(Node_Geometry, Node_Material, 'Node');
            Node_End.position.set(pbCX_end, pbCY_end, pbCZ_end);
            Engine.scene.add(Node_End);
        }
            
        const Node_Start = Engine.selectedObject;

        const start_World_Pos = new THREE.Vector3();
        Node_Start.getWorldPosition(start_World_Pos);

        const end_World_pos = new THREE.Vector3();
        Node_End.getWorldPosition(end_World_pos);

        const path = new THREE.LineCurve3(start_World_Pos, end_World_pos);
        const Piepe_visible = new THREE.TubeGeometry(path, 64, VisualPipelins.d_pipe_base/2, 12, false);
        const Pipe_connection = new Edge_new(Piepe_visible, Edge_Material, Node_Start, Node_End, 'Edge', pbLength, pbDiameter, type_tube, k_t, kvelocity);
        
        Node_Start.attach(Pipe_connection);
        if (!check_node_end) {
            Pipe_connection.attach(Node_End);
        }

        // СОЗДАЁМ метки DN и L СРАЗУ, до расчёта
        if (typeof Pipe_connection._ensureLabels === 'function') {
            Pipe_connection._ensureLabels();          // создаёт _dnLabel, _lLabel с актуальными значениями
            Pipe_connection._updateLabelsVisibility(); // показывает DN и L, скрывает Q и V (они = 0)
        }

        if (typeof Pipe_connection.createUI === 'function') {
            try { Pipe_connection.createUI(); } catch (e) { console.warn('createUI:', e); }
        }


    } else {
        // Создание самого первого узла (Источника)
        const Node_Material_start = new THREE.MeshBasicMaterial({ color: '#800080' });
        const Node_Start = new Node_new(Node_Geometry, Node_Material_start, 'Source');
        Node_Start.position.set(pbCX, pbCY, pbCZ);
        
        const [pbCX_end, pbCY_end, pbCZ_end] = calculation_end_node(pbCX, pbCY, pbCZ, pbLength, activeAxis, activeAxis_direction, activeAxis_rotation, rotate_value);
        
        Node_End = new Node_new(Node_Geometry, Node_Material, 'Node');
        Node_End.position.set(pbCX_end, pbCY_end, pbCZ_end);    
        
        const path = new THREE.LineCurve3(Node_Start.position, Node_End.position);
        const Piepe_visible = new THREE.TubeGeometry(path, 64, VisualPipelins.d_pipe_base/2, 12, false);
        const Pipe_connection = new Edge_new(Piepe_visible, Edge_Material, Node_Start, Node_End, 'Edge', pbLength, pbDiameter, type_tube, k_t, kvelocity);       
        
        Engine.scene.add(Node_Start);
        Node_Start.attach(Pipe_connection);
        Pipe_connection.attach(Node_End); 

        if (typeof Pipe_connection._ensureLabels === 'function') {
            Pipe_connection._ensureLabels();
            Pipe_connection._updateLabelsVisibility();
        }
        }    
    
    
    // Обновляем матрицы и интерфейс
    Engine.scene.updateMatrixWorld(true);
    update_Node_XYZ();
    updateTreeUI(); 
    checkAllPipelines(); // функция для проверки коллизии
    // =========================================================================
    // ГАРАНТИРОВАННЫЙ ВЫБОР И ПОДСВЕТКА ПОСЛЕДНЕГО УЗЛА (ЗЕЛЕНЫЙ ЦВЕТ)
    // =========================================================================
    if (Node_End) {
        // 1. Делаем его выбранным объектом в системе
        
        
        // 2. Добавляем в STATE, если это новый узел и его там еще нет
        if (!STATE.Three_D_objects.includes(Node_End)) {
            STATE.Three_D_objects.push(Node_End);
        }

        // // 3. Визуальная подсветка: меняем цвет на ЗЕЛЕНЫЙ (как в оригинале)
        // if (!Node_End.userData.originalColor) {
        //     Node_End.userData.originalColor = Node_End.material.color.getHex();
        // }
        // Node_End.material.color.setHex(0x00ff00); // Зеленый цвет выделения
        // Node_End.material.needsUpdate = true;

        // 4. Проверяем галочку "Непрерывное создание"
        const isContinuous = document.getElementById("continuousPipelineCheck")?.checked || false;
        
        if (isContinuous) {
            // 1. Если уже был выделен другой объект — сбрасываем его через метод Engine
            if (Engine.selectedObject && Engine.selectedObject !== Node_End) {
                if (typeof Engine.deselectObject === 'function') {
                    Engine.deselectObject(Engine.selectedObject);
                }
            }

            // 2. Запоминаем в Engine и выделяем (желтым цветом) именно наш новый узел
            Engine.selectedObject = Node_End;
            if (typeof Engine.selectObject === 'function') {
                Engine.selectObject(Node_End);
            }

            // 3. Вызываем идущие следом в клике мыши функции обновлений координат и интерфейса
            if (typeof Engine.update_Pipe_tube_coordinate === 'function') Engine.update_Pipe_tube_coordinate();
            if (typeof Engine.update_Pipe_tube === 'function') Engine.update_Pipe_tube();
            if (typeof Engine.info_selected_elevent === 'function') Engine.info_selected_elevent();
            if (typeof Engine.update_Node_coordinate === 'function') Engine.update_Node_coordinate();
            
            if (typeof Utils !== 'undefined') {
                Utils.showStatus(`Участок создан. Фокус автоматически переведен на новый узел.`);
            }
        } 
        else {
            // Если галочка НЕ стоит: мы вообще не трогаем выделение и не симулируем клик.
            // Старый выбранный узел остается активным, а новый просто добавляется на сцену.
            if (typeof Utils !== 'undefined') {
                Utils.showStatus(`Участок создан. Конечный узел успешно добавлен на сцену.`);
            }
        }
    }
}



// Функция расчета коенчного узла для трубопровода
function calculation_end_node(pbCX, pbCY, pbCZ, pbLength, activeAxis, activeAxis_direction,
    activeAxis_rotation,rotate_value)
    {
        let symbol = (activeAxis_direction === "+") ? 1 : -1;
        
        let offset = new THREE.Vector3(0, 0, 0);
        
        if (activeAxis === "x") offset.x = pbLength * symbol;
        else if (activeAxis === "y") offset.y = pbLength * symbol;
        else offset.z = pbLength * symbol;
        
        if (rotate_value && rotate_value !== 0) {
            let radians = rotate_value * Math.PI / 180;
                        
            let rotationAxis = new THREE.Vector3(0, 0, 0);
            if (activeAxis_rotation === "x") rotationAxis.x = 1;
            else if (activeAxis_rotation === "y") rotationAxis.y = 1;
            else rotationAxis.z = 1;
            
            offset.applyAxisAngle(rotationAxis, radians);
        }

        let nextX = pbCX + offset.x;
        let nextY = pbCY + offset.y;
        let nextZ = pbCZ + offset.z;        
        
        return [nextX, nextY, nextZ];
        
}

// функция првоерки координат для конечного узла трубопровода
function check_End_Node(pbCX_end, pbCY_end, pbCZ_end){
    let foundNode = null;    
    Engine.scene.traverse((child) => {
        if (child.type === 'Node'|| child.type === 'Sprinkler') { 
            const child_World_Pos = new THREE.Vector3();
            child.getWorldPosition(child_World_Pos);                         
            if (child_World_Pos.x === pbCX_end && child_World_Pos.y === pbCY_end && child_World_Pos.z === pbCZ_end) {                            
                foundNode = child; 
            }
        }
    });
    return foundNode; 
}

// Првоерка выбранной трубы
function check_pipe_tube_Edit(){
    // проверка существования трубопровода
    // alert("внутри функции разбиения")
    let Check_tube = false;
    Engine.scene.traverse((child) => {       
        if (child.type === 'Edge') {
            Check_tube = true;
        }        
    });    
    if (Check_tube) {    
        if (!Engine.selectedObject || Engine.selectedObject.type !== 'Edge') {
            alert("Перед редактированием выберите турбопровод!");
            return; 
        }
    }
    else{
        alert("Создайте и выберите трубопровод!")
        return;
    }
    document.getElementById("PipelineModal_Edit").style.display = 'block';
    document.body.classList.add('builder-active');
    document.getElementById("number_pipe_edit").innerText = `${ Engine.selectedObject.name} id: ${Engine.selectedObject.id}`;
    document.getElementById("type_pipe_edit").innerText = Engine.selectedObject.ghost;
    document.getElementById("DN_pipe_edit").innerText = Engine.selectedObject.DN;
    document.getElementById("Length_pipe_edit").innerText = Engine.selectedObject.Length;
    document.getElementById("pipe_edit").value = Engine.selectedObject.Length; 
    // document.getElementById("get_tube_pipe_edit").value = Engine.selectedObject.ghost;
    // document.getElementById("pbDiameter_edit").value = Engine.selectedObject.DN;   
    // console.log("Engine.selectedObject",Engine.selectedObject);
    // document.getElementById("splitCancelBtn_Edit").addEventListener("click", () => cancel("PipelineModal_Edit"));
    // document.getElementById("splitApplyBtn_Edit").addEventListener("click", () => edit_pipe_tube(Engine.selectedObject));
    document.getElementById("splitCancelBtn_Edit").onclick = () => cancel("PipelineModal_Edit");
    document.getElementById("splitApplyBtn_Edit").onclick = () => edit_pipe_tube(Engine.selectedObject);
    
}
// функция для изменения геометрии трубы
function edit_pipe_tube(Edge) {
    let start_node = Edge.start_node;
    let end_node = Edge.end_node;
    const new_type_tube = document.getElementById("get_tube_pipe_edit").selectedOptions[0].textContent;
    const new_pbDiameter = document.getElementById("pbDiameter_edit");
    const new_DN_tube = parseFloat(new_pbDiameter.selectedOptions[0].textContent);
    const new_k_t = parseFloat(new_pbDiameter.selectedOptions[0].dataset.k_t);
    const new_kvelocity = parseFloat(new_pbDiameter.selectedOptions[0].dataset.kvelocity);
    const new_long = parseFloat(document.getElementById("pipe_edit").value);

    const start_World_Pos = new THREE.Vector3();
    const end_World_Pos = new THREE.Vector3();
    start_node.getWorldPosition(start_World_Pos);
    end_node.getWorldPosition(end_World_Pos);

    const direction_Vector = new THREE.Vector3().subVectors(end_World_Pos, start_World_Pos).normalize();
    const new_World_End = new THREE.Vector3().addVectors(start_World_Pos, direction_Vector.multiplyScalar(new_long));

    const local_End_Node = new_World_End.clone();
    if (end_node.parent) end_node.parent.worldToLocal(local_End_Node);
    end_node.position.copy(local_End_Node);

    end_node.updateMatrixWorld(true);
    start_node.updateMatrixWorld(true);
    Edge.updateMatrixWorld(true);

    const path_Start = start_World_Pos.clone();
    const path_End = new_World_End.clone();
    Edge.worldToLocal(path_Start);
    Edge.worldToLocal(path_End);
    const new_Path = new THREE.LineCurve3(path_Start, path_End);
    Edge.geometry.dispose();
    Edge.geometry = new THREE.TubeGeometry(new_Path, 64, VisualPipelins.d_pipe_base/2, 12, false);

    Edge.ghost = new_type_tube;
    Edge.DN = new_DN_tube;
    Edge.k_t = new_k_t;
    Edge.kvelocity = new_kvelocity;
    Edge.Length = new_long;

    // Перерисовываем текст + стрелку + смещения именно этой трубы
    if (typeof Edge._updateLabelTexts === 'function') Edge._updateLabelTexts();
    if (typeof Edge.createFlowArrow === 'function') Edge.createFlowArrow();
    if (typeof Edge._updateLabelsVisibility === 'function') Edge._updateLabelsVisibility();

    if (Edge._inputLenElement) Edge._inputLenElement.value = new_long.toFixed(2);
    if (typeof Edge.updateLabelsPosition === 'function') Edge.updateLabelsPosition();

    const new_Node_Geometry = new THREE.SphereGeometry(VisualPipelins.d_node_base/2, 32, 32);
    Edge.start_node.geometry.dispose();
    Edge.end_node.geometry.dispose();
    Edge.start_node.geometry = new_Node_Geometry;
    Edge.end_node.geometry = new_Node_Geometry;

    cancel("PipelineModal_Edit");
    update_Node_XYZ();

    // ⚠️ ВАЖНО: этот вызов пересобирает ВСЕ трубы — теперь он обновит и их метки/стрелки
    check_position_node_for_edge();
    checkAllPipelines();
}

// функция для обновления глобал координат (функция внутри класса Node)
function update_Node_XYZ(){
    Engine.scene.traverse((child) => {    
        if (child.name === 'Node_new') {
                        
            child.update_Global(); 
            
        }
    });
    console.log("Engine.scene.children_update_Node_XYZ",Engine.scene.children);
}

// функция првоерки и созданяи новой ветки 
function Check_CreateBranch(){
    // проверка существования узла
    // alert("внутри функции разбиения")
    let Check_node = false;
    Engine.scene.traverse((child) => {       
        if (child.type === 'Node') {
            Check_node = true;
        }        
    });    
    if (Check_node) {    
        if (!Engine.selectedObject || (Engine.selectedObject.type !== 'Node' && Engine.selectedObject.type !== 'Sprinkler' && Engine.selectedObject.type !== 'Source')) {
            alert("Выберите узел привязки!");
            return; 
        }
    }
    else{
        alert("Создайте и выберите узел!")
        return;
    }

    document.getElementById("createBranchModal").style.display = 'block';
    document.body.classList.add('builder-active');
    document.getElementById("createBranchCancelBtn").onclick = () => cancel("createBranchModal");
    const sprCountInput = document.getElementById("createBranchSprCount");
    sprCountInput.addEventListener("input", function() {
        let Count = parseFloat(document.getElementById("createBranchSprCount").value);        
        const tabContent = document.getElementById('myTabContent');
        const tybe_type = document.getElementById("get_tube_pipe_sprinkler");                
        tabContent.innerHTML = html_branch_content(Count);        
        for (let i = 0; i < Count; i++) {
            // get_load_pipe("get_tube_pipe_sprinkler", `pbDiameter_sprinkler_${i}`);   
            get_load_pbDiameter(tybe_type.value, `pbDiameter_sprinkler_${i}`);         
            document.getElementById("get_tube_pipe_sprinkler").addEventListener("change", (event) => {
                get_load_pbDiameter(event.target.value, `pbDiameter_sprinkler_${i}`);   
            });
        }
    });
    // const sprCountInput = document.getElementById("createBranchSprCount");
    // sprCountInput.addEventListener("input", function() {
    //     let Count = parseFloat(document.getElementById("createBranchSprCount").value);        
    //     const tabContent = document.getElementById('myTabContent');                
    //     tabContent.innerHTML = html_branch_content(Count);
    //     get_load_pipe_for_sprinkler("get_tube_pipe_sprinkler");
    //     document.getElementById("get_tube_pipe_sprinkler").addEventListener("change", (event) => {
    //         // get_load_pipe_for_sprinkler("get_tube_pipe_sprinkler");   
    //     });      
    //     for (let i = 0; i < Count; i++) {
    //         // get_load_pipe("get_tube_pipe_sprinkler", `pbDiameter_sprinkler_${i}`);
    //         // get_load_pbDiameter_for_sprinkler(`pbDiameter_sprinkler_${i}`);            
    //         // document.getElementById("get_tube_pipe_sprinkler").addEventListener("change", (event) => {
    //         //     get_load_pbDiameter_for_sprinkler(event.target.value, `pbDiameter_sprinkler_${i}`);   
    //         // });
    //     }
    // });
    sprCountInput.dispatchEvent(new Event('input'));   
    document.getElementById("createBranchApplyBtn").onclick = () => create_branch(Engine.selectedObject);
    // cancel("createBranchModal");
}


// функция создания новой ветки

function create_branch(Node) {    
    
    const activeAxis = document.querySelector('#createBranchModal .axis-btn.active').dataset.axis;
    const activeAxis_direction = document.querySelector('#createBranchModal .dir-btn.active').dataset.dir; // активное положение направления
    const activeAxis_rotation = document.querySelector('#createBranchModal .axis-btn-rot.active').dataset.axis; // активная ось дял порворота
    const rotate_value = parseFloat(document.getElementById("pbAngle_branch").value);   

    const type_tube = document.getElementById("get_tube_pipe_sprinkler").selectedOptions[0].textContent; // тип трубы (ГОСТ)
    const Count = parseFloat(document.getElementById("createBranchSprCount").value);
    
    const start_World_Pos = new THREE.Vector3();
    Node.getWorldPosition(start_World_Pos);
    
    let currentX = start_World_Pos.x;
    let currentY = start_World_Pos.y;
    let currentZ = start_World_Pos.z;
    // Дефолтный материал    
    const Node_Material = new THREE.MeshBasicMaterial({ color: '#FF0000' });    
    const Edge_Material = new THREE.MeshBasicMaterial({ color: '#0F1379' });    

    let currentStartNode = Node;

    // Цикл для создания ветвей и новых оросителей
    for (let i = 0; i < Count; i++) {

        const pbDiameter_sprinkler = document.getElementById(`pbDiameter_sprinkler_${i}`); //// элемент для удосбвтва вывода свойств
        const new_DN_tube = parseFloat(pbDiameter_sprinkler.selectedOptions[0].textContent); ///// сами свойства
        const new_k_t = parseFloat(pbDiameter_sprinkler.selectedOptions[0].dataset.k_t);
        const new_kvelocity = parseFloat(pbDiameter_sprinkler.selectedOptions[0].dataset.kvelocity);
        
        const pbLength_branch = parseFloat(document.getElementById(`pbLength_branch_${i}`).value); //// элемент для удосбвтва вывода свойств
        
        const [pbCX_end, pbCY_end, pbCZ_end] = calculation_end_node(currentX, currentY, currentZ, pbLength_branch, activeAxis,
            activeAxis_direction, activeAxis_rotation, rotate_value);   
                
        let currentEndNode;
        console.log("new_DN_tube в создании ветки",new_DN_tube)
        const Node_Geometry = new THREE.SphereGeometry(VisualPipelins.d_node_base/2, 32, 32);
        // проверка на созданные орсоители пока не нужна 
                // проверка на созданные оросители пока не нужна 
        const check_node_end = check_End_Node(pbCX_end, pbCY_end, pbCZ_end);
        if (check_node_end) {
            currentEndNode = check_node_end;
        } 
        else {            
            // Node_new САМ добавит стрелку, так как тип 'Sprinkler'
            currentEndNode = new Node_new(Node_Geometry, Node_Material, 'Sprinkler');
            currentEndNode.position.set(pbCX_end, pbCY_end, pbCZ_end);
            
            // ВАЖНО: добавляем узел на сцену (этой строки не хватало в старом коде)
            Engine.scene.add(currentEndNode); 
        }

        // Просто создаем новые узлы с типом орсоитель      

        const step_Start_Pos = new THREE.Vector3();
        currentStartNode.getWorldPosition(step_Start_Pos);

        const step_End_Pos = new THREE.Vector3();
        currentEndNode.getWorldPosition(step_End_Pos);
        
        const path = new THREE.LineCurve3(step_Start_Pos, step_End_Pos);
        const Pipe_visible = new THREE.TubeGeometry(path, 64, VisualPipelins.d_pipe_base/2, 12, false);
        const Pipe_connection = new Edge_new(Pipe_visible, Edge_Material, currentStartNode, currentEndNode, 'Edge',pbLength_branch,
            new_DN_tube, type_tube, new_k_t, new_kvelocity);
        
        currentStartNode.attach(Pipe_connection);
        Pipe_connection.attach(currentEndNode);

        if (typeof Pipe_connection._ensureLabels === 'function') {
            Pipe_connection._ensureLabels();
            Pipe_connection._updateLabelsVisibility();
        }

        Pipe_connection.createUI();
                
        currentStartNode = currentEndNode;
                
        currentX = pbCX_end;
        currentY = pbCY_end;
        currentZ = pbCZ_end;
    }
    
    console.log("Engine.scene.children", Engine.scene.children);
    updateTreeUI(); //Обновляем дерево построения
    cancel("createBranchModal");
    update_Node_XYZ();
    checkAllPipelines(); // функция для проверки коллизии
}


function html_branch_content(Count) {
    let html = '';
    for (let i = 0; i < Count; i++) {
        html += `
            <div class="branch_segment" style="border-bottom: 1px solid #F3F2F8; margin-bottom: 15px; padding-bottom: 15px; ">
                <div class="step">
                    <span>Участок №${i + 1}</span>            
                </div>
                <div class="step">
                    <span>Диаметр трубопровода DN</span>
                    <select id="pbDiameter_sprinkler_${i}"></select>
                    <span>Длина, м</span>
                    <input type="number" id="pbLength_branch_${i}" value="5" step="0.1" min="0.1" max="100">
                </div>                
            </div>
        `;
    }
    return html;
}

function check_position_node_for_edge() {
    Engine.scene.traverse((child) => {
        if (child.type === 'Edge' && child.start_node && child.end_node) {
            const start_check = new THREE.Vector3();
            const end_check = new THREE.Vector3();
            child.start_node.getWorldPosition(start_check);
            child.end_node.getWorldPosition(end_check);

            // 1. Пересчитываем длину
            const new_long = start_check.distanceTo(end_check);
            child.Length = new_long;

            // 2. Пересоздаём геометрию трубы
            const Local_position_start = start_check.clone();
            const Local_position_end = end_check.clone();
            child.worldToLocal(Local_position_start);
            child.worldToLocal(Local_position_end);
            const path = new THREE.LineCurve3(Local_position_start, Local_position_end);
            child.geometry.dispose();
            child.geometry = new THREE.TubeGeometry(path, 64, VisualPipelins.d_pipe_base/2, 12, false);
            child.updateMatrixWorld(true);

            // 3. Обновляем ТЕКСТ меток (L и DN могли измениться)
            if (typeof child._updateLabelTexts === 'function') child._updateLabelTexts();

            // 4. Пересоздаём СТРЕЛКУ по новой геометрии
            if (typeof child.createFlowArrow === 'function') child.createFlowArrow();

            // 5. Пересчитываем СМЕЩЕНИЯ меток (targetOffset DN/Q/V/L)
            if (typeof child._updateLabelsVisibility === 'function') child._updateLabelsVisibility();
        }
    });
}

// Удаление выбранной трубы и связанный с ней дочерних элементов и есть дочерний узел является концом другого трубопровода,тот тоже удаляется
function delete_pipe_tube() {
    // проверка существования трубопровода        
    let Check_tube = false;
    Engine.scene.traverse((child) => {       
        if (child.type === 'Edge') {
            Check_tube = true;
        }        
    });    
    if (Check_tube) {    
        if (!Engine.selectedObject || Engine.selectedObject.type !== 'Edge') {
            alert("Перед удалением выберите турбопровод!");
            return; 
        }
    }
    else{
        alert("Трубопроводов нет!")
        return;
    }
    
    if (Engine.selectedObject.parent) {
        Engine.selectedObject.parent.remove(Engine.selectedObject);
    } else {
        Engine.scene.remove(Engine.selectedObject);
    }
// у данного метода возможен скрытый баг, при обходе всех объектов на сцене и динамичном их удалении , возможно переназначение
// внутреннего id объектов и слцучайных пропуск элемента , идущег осразу за удаленным!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// 2 цикла в каждом удалении обусловлены логикой работы js, он переназанчает id объектов динамичнро
    Engine.selectedObject.traverse((child_node) => {
        if (child_node.name === 'Node_new') {
            const child_tube = [];
            Engine.scene.traverse((scene_Child) => {
                // Ищем трубы, которые НЕ принадлежат удаляемому объекту
                if (scene_Child.type ==='Edge' && scene_Child.parent.uuid !== Engine.selectedObject.uuid) {
                    child_tube.push(scene_Child);
                }
            });
            child_tube.forEach((child) => {                
                if (child.start_node.uuid === child_node.uuid || child.end_node.uuid === child_node.uuid) {
                    child.parent.remove(child);
                }                
            });            
        }        
    });

    Engine.scene.updateMatrixWorld(true);
    // массив и логика проверки источника (source) если он являестя родителем и не имеет больше дочерних
    // элементов то тоже удаляется со сцены
    const source_node = [];
    Engine.scene.traverse((child_node)=>{        
        if (child_node.type === "Source" && child_node.children.length === 0) {
            source_node.push(child_node);            
        }        
    });
    source_node.forEach((child) => {                
            if (child.parent) {
                child.parent.remove(child);
            } else {
                Engine.scene.remove(child);
            }              
        });
    Engine.scene.updateMatrixWorld(true);
    updateTreeUI();
    checkAllPipelines(); // функция для проверки коллизии
    console.log("Engine.scene.children проверка после удаления",Engine.scene.children);
    
}

// function Check_Edit_Node(){
//     // проверка существования узла
//     // alert("внутри функции разбиения")
//     let Check_node = false;
//     Engine.scene.traverse((child) => {       
//         if (child.type === 'Node') {
//             Check_node = true;
//         }        
//     });    
//     if (Check_node) {    
//         if (!Engine.selectedObject || (Engine.selectedObject.type !== 'Node' && Engine.selectedObject.type !== 'Sprinkler' && Engine.selectedObject.type !== 'Source')) {
//             alert("Выберите узел привязки!");
//             return; 
//         }
//     }
//     else{
//         alert("Создайте и выберите узел!")
//         return;
//     }
//     document.getElementById("Node_Edit").style.display = 'block';
//     document.body.classList.add('builder-active');

//     document.getElementById("number_node_edit").innerText = `${ Engine.selectedObject.name} id: ${Engine.selectedObject.id}`;
//     document.getElementById("type_node_edit").innerText = Engine.selectedObject.type;
//     document.getElementById("pbCX_edit_node").value = Engine.selectedObject.X_gl;
//     document.getElementById("pbCY_edit_node").value = Engine.selectedObject.Y_gl;
//     document.getElementById("pbCZ_edit_node").value = Engine.selectedObject.Z_gl;
    
//     document.getElementById("Node_Edit_confirm").onclick = () => Edit_Node(Engine.selectedObject);
//     document.getElementById("Node_Edit_cancel").onclick = () => cancel("Node_Edit"); 
// }

function Check_Edit_Node() {
    // Фильтруем только узлы из выделенных объектов
    const selectedNodes = Engine.selectedObjects.filter(obj => 
        obj.type === 'Node' || obj.type === 'Sprinkler' || obj.type === 'Source'
    );

    if (selectedNodes.length === 0) {
        alert("Выберите один или несколько узлов!\n(Зажмите Ctrl, чтобы выделить несколько)");
        return;
    }

    document.getElementById("Node_Edit").style.display = 'block';
    document.body.classList.add('builder-active');

    const firstNode = selectedNodes[0];
    
    // Показываем в интерфейсе, сколько узлов выбрано
    if (selectedNodes.length > 1) {
        document.getElementById("number_node_edit").innerText = `Выбрано узлов: ${selectedNodes.length}`;
    } else {
        document.getElementById("number_node_edit").innerText = `${firstNode.name} id: ${firstNode.id}`;
    }
    
    document.getElementById("type_node_edit").innerText = firstNode.type;
    document.getElementById("pbCX_edit_node").value = firstNode.X_gl;
    document.getElementById("pbCY_edit_node").value = firstNode.Y_gl;
    document.getElementById("pbCZ_edit_node").value = firstNode.Z_gl;
    
    // Привязываем новую функцию массового редактирования
    document.getElementById("Node_Edit_confirm").onclick = () => Edit_Multiple_Nodes(selectedNodes);
    document.getElementById("Node_Edit_cancel").onclick = () => cancel("Node_Edit"); 
}


function Edit_Multiple_Nodes(nodesArray) {
    const new_type = document.getElementById("select_node_edit").value;

    // Проходим по ВСЕМ выделенным узлам
    nodesArray.forEach(node => {
        node.type = new_type;

        // 1. Обновляем материал (цвет) узла
        node.material.dispose();
        let new_Node_Material;
        if (new_type === "Node") {        
            new_Node_Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        } else if (new_type === "Sprinkler") {        
            new_Node_Material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        } else if (new_type === "Source") {        
            new_Node_Material = new THREE.MeshBasicMaterial({ color: 0x800080 });
        }    
        
        node.material = new_Node_Material;
        node.material.needsUpdate = true;
        
        // Обновляем originalColor, чтобы при снятии выделения он стал цветом нового типа
        node.userData.originalColor = node.material.color.getHex();

        // МАГИЯ: Просто вызываем метод класса! 
        // Он сам удалит старую стрелку (если тип сменился с Sprinkler) 
        // или нарисует новую (если тип стал Sprinkler)
        if (typeof node.updateSprinklerArrow === "function") {
            node.updateSprinklerArrow();
        }
    });

    // Обновляем дерево и снимаем выделение после успешного изменения
    if (typeof updateTreeUI === 'function') {
        updateTreeUI();
    }
    
    Engine.clearSelection(); // Снимаем выделение после редактирования
    cancel("Node_Edit");
}

// function Edit_Node(Node) {
//     const new_type = document.getElementById("select_node_edit").value;
//     Node.type = new_type;

//     // 1. Удаляем старую стрелку, если она была (на случай смены с Оросителя на Узел/Источник)
//     const existingArrow = Node.getObjectByName('SprinklerArrow');
//     if (existingArrow) {
//         Node.remove(existingArrow);
//     }

//     // 2. Обновляем материал (цвет) узла
//     Node.material.dispose();
//     let new_Node_Material;
//     if (new_type === "Node") {        
//         new_Node_Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
//     }
//     else if (new_type === "Sprinkler") {        
//         new_Node_Material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Используем hex для надежности
//     }
//     else if (new_type === "Source") {        
//         new_Node_Material = new THREE.MeshBasicMaterial({ color: 0x800080 });
//     }    
    
//     Node.material = new_Node_Material;
//     Node.material.needsUpdate = true;
//     Node.userData.originalColor = Node.material.color.getHex();

//     // 3. ГЛАВНОЕ ИСПРАВЛЕНИЕ: Если тип стал "Sprinkler", создаем и добавляем стрелку
//     if (new_type === "Sprinkler") {
//         const sprinklerGroup = new THREE.Group();
//         sprinklerGroup.name = 'SprinklerArrow';
//         const nodeRadius = VisualPipelins.d_node_base / 2;
        
//         // 1. Стержень стрелки (цилиндр)
//         const shaftRadius = nodeRadius * 0.1;
//         const shaftHeight = nodeRadius * 2.5;
//         const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftHeight, 16);
//         const shaft = new THREE.Mesh(shaftGeo, new_Node_Material); // Используем новый красный материал
//         shaft.position.y = -(shaftHeight / 2);
        
//         // 2. Наконечник стрелки (конус, направленный вниз)
//         const headRadius = nodeRadius * 1;
//         const headHeight = nodeRadius * 1.5;
//         const headGeo = new THREE.ConeGeometry(headRadius, headHeight, 16);
//         const head = new THREE.Mesh(headGeo, new_Node_Material); // Используем новый красный материал
//         head.rotation.x = Math.PI;
//         head.position.y = -(shaftHeight + headHeight / 2);

//         sprinklerGroup.add(shaft);
//         sprinklerGroup.add(head);
        
//         // Добавляем группу со стрелкой к узлу
//         Node.add(sprinklerGroup);
//     }

//     // 4. Обновляем дерево построения, чтобы в левой панели тоже обновилась иконка и название
//     if (typeof updateTreeUI === 'function') {
//         updateTreeUI();
//     }

//     cancel("Node_Edit");
// }

async function sendJsonAndVisualize(v) {
    console.log(" Отправка данных на расчет...", v);
    
    try {
        const response = await fetch('api/sole/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(v)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка HTTP: ${response.status}`);
        }

        const result = await response.json();
        console.log('Ответ от сервера:', result);

        if (result.status === "success") {
            // ДОБАВИТЬ ЭТО: сохраняем данные для графика
            window.lastCalculationResult = {
                K_system: result.summary.K_system || 0.025,
                H_max: result.summary.H_max || 0.0,
                Q_total: result.summary.total_flow_l_s || 0.0,
                H_source: result.summary.source_pressure_m || 0.0
            };
            
            console.log("💾 Данные для графика сохранены:", window.lastCalculationResult);

            // Вызываем функцию отрисовки меток на сцене
            visualizeResults(result);
        } else {
            alert("Ошибка расчета: " + result.message);
        }

    } catch (error) {
        console.error('❌ Ошибка при отправке запроса:', error);
        alert("Ошибка сети или сервера: " + error.message);
    }
}

// функция для контроля узлов отработка 
function logPipelineTree() {
    console.log("=== ОТЧЕТ ПО ТРУБОПРОВОДНОЙ СЕТИ ===");    
    let edgeCount = 0;
    // Проходим по всем объектам на сцене Three.js
    Engine.scene.traverse((object) => {
        console.log("objec689", object)
        // Проверяем, что объект является трубой (Edge)
        // (Здесь используется проверка типа, как у вас в коде 'Edge' или по вашему классу Edge_new)
        if (object.type === 'Edge' || object.name === 'Edge_new') {
            edgeCount++;
            
            const startNode = object.start_node;
            const endNode = object.end_node;

            // Создаем пустые векторы для сбора РЕАЛЬНЫХ мировых координат
            const startWorldPos = new THREE.Vector3();
            const endWorldPos = new THREE.Vector3();

            // Если узлы привязаны к трубе, вытаскиваем их глобальные позиции
            if (startNode) startNode.getWorldPosition(startWorldPos);
            if (endNode) endNode.getWorldPosition(endWorldPos);

            // Получаем зафиксированную длину из свойств объекта (или считаем расстояние между мировыми точками)
            const savedLength = object.Length; 
            const realLength = startWorldPos.distanceTo(endWorldPos); // Честное расстояние в 3D мире

            console.group(`Трубопровод №${edgeCount} [ID: ${object.uuid || 'нет'}]`);
            console.log(`Диаметр (DN): %c${object.DN || 'Не указан'} мм`, "color: #007bff; font-weight: bold;");
            console.log(`Сохраненная длина (.Length): %c${savedLength ? savedLength.toFixed(3) : 'нет'} м`, "color: #ffc107; font-weight: bold;");
            console.log(`Реальное расстояние на сцене: %c${realLength.toFixed(3)} м`, "color: #28a745; font-weight: bold;");
            
            if (startNode) {
                console.log(`  📍 НАЧАЛО (Узел): [ X: ${startWorldPos.x.toFixed(3)}, Y: ${startWorldPos.y.toFixed(3)}, Z: ${startWorldPos.z.toFixed(3)} ]`);
            } else {
                console.log(`  📍 НАЧАЛО (Узел): %cНЕ НАЙДЕН`, "color: red;");
            }

            if (endNode) {
                console.log(`  📍 КОНЕЦ  (Узел): [ X: ${endWorldPos.x.toFixed(3)}, Y: ${endWorldPos.y.toFixed(3)}, Z: ${endWorldPos.z.toFixed(3)} ]`);
            } else {
                console.log(`  📍 КОНЕЦ  (Узел): %cНЕ НАЙДЕН`, "color: red;");
            }
            console.groupEnd();
        }
    });

    if (edgeCount === 0) {
        console.log("Трубопроводы на сцене не найдены.");
    }
    console.log("====================================");
}

/// ============================================================================
// ГЛАВНАЯ ФУНКЦИЯ ВИЗУАЛИЗАЦИИ (ПОЛНАЯ ИНКАПСУЛЯЦИЯ)
// ============================================================================
function visualizeResults(result) {
    console.log('🚀 Начинаем визуализацию...');

    // 1. Очищаем СТАРЫЕ глобальные метки из сцены (на случай, если остались от прошлых версий)
    const stale = [];
    Engine.scene.traverse((c) => {
        if (c.name === 'PressureLabel' || c.name === 'FlowLabel' ||
            c.name === 'VelocityLabel' || c.name === 'FlowArrow' || 
            c.name === 'DNLabel' || c.name === 'LengthLabel') {
            stale.push(c);
        }
    });
    stale.forEach(l => {
        if (l.parent) l.parent.remove(l);
        if (l.geometry) l.geometry.dispose();
        if (l.material) { 
            if (l.material.map) l.material.map.dispose(); 
            l.material.dispose(); 
        }
    });

    // 2. Очищаем инкапсулированные метки через методы классов + сбрасываем глобальный массив
    STATE.Three_D_objects.forEach(obj => {
        if (typeof obj.destroyLabels === 'function') obj.destroyLabels();
    });
    STATE.calculationLabels = [];

    // 3. Включаем все флаги видимости
    STATE.showLabelsPressure = true;
    STATE.showLabelsMassFlowRate = true;
    STATE.showLabelsVelocity = true;
    STATE.showLabelsDN = true;          
    STATE.showLabelsLength = true; 

    updateToggleButtonState('btnTogglePressure', true);
    updateToggleButtonState('btnToggleFlow', true);
    updateToggleButtonState('btnToggleVelocity', true);

    const btnDN = document.getElementById("DN_visible");
    if (btnDN) btnDN.classList.add("active");
    
    const btnL = document.getElementById("L_visible");
    if (btnL) btnL.classList.add("active");

    let nodesCount = 0;
    let edgesCount = 0;

    // 4. Применяем результаты к УЗЛАМ (Node / Source / Sprinkler)
    // МАГИЯ: Класс Node_new сам создаст/обновит метки P и Q через свой метод applyResult
    for (const [uuid, data] of Object.entries(result.nodes)) {
        const nodeObj = STATE.Three_D_objects.find(
            obj => obj.uuid.toLowerCase() === uuid.toLowerCase() &&
            (obj.type === 'Node' || obj.type === 'Source' || obj.type === 'Sprinkler')
        );
        
        if (nodeObj && typeof nodeObj.applyResult === 'function') {
            nodeObj.applyResult(data);
            nodesCount++;
        }
    }

    // 5. Применяем результаты к ТРУБАМ (Edge)
    // МАГИЯ: Класс Edge_new сам создаст/обновит метки DN, Q, L, V и стрелку через свой метод applyResult
    for (const [uuid, data] of Object.entries(result.edges)) {
        const edgeObj = STATE.Three_D_objects.find(
            obj => obj.uuid.toLowerCase() === uuid.toLowerCase() && obj.type === 'Edge'
        );
        
        if (edgeObj && typeof edgeObj.applyResult === 'function') {
            edgeObj.applyResult(data);
            edgesCount++;
        }
    }

    // 6. Принудительно обновляем позиции и размеры всех меток под текущий зум камеры
    updateLabelsForZoom();

    console.log(`ВИЗУАЛИЗАЦИЯ ЗАВЕРШЕНА! Узлов: ${nodesCount}, труб: ${edgesCount}`);
    
    // 7. Показываем итоговое сообщение пользователю
    alert(
        `Расчет успешно завершен!\n` +
        `Давление насоса: ${result.summary.source_pressure_m.toFixed(3)} м\n` +
        `Добавлено меток: ${nodesCount + edgesCount}\n` +
        `⏱️ Время расчета (всего): ${result.summary.timing.total_s.toFixed(4)} сек\n` +
        `  • Этап 1: ${result.summary.timing.stage1_s.toFixed(4)} сек\n` +
        `  • Поиск источника: ${result.summary.timing.source_search_s.toFixed(4)} сек\n` +
        `  • Финальное решение: ${result.summary.timing.final_solve_s.toFixed(4)} сек\n` +
        `📊 Невязки:\n` +
        `  • Норма невязки: ${result.summary.residual_norm.toExponential(4)}\n` +
        `  • Макс. невязка: ${result.summary.max_residual.toExponential(4)}`
    );
}

// ============================================================================
// 5. ФУНКЦИИ СОХРАНЕНИЯ И ЗАГРУЗКИ ПРОЕКТА (JSON)
// ============================================================================

// 5.1. Улучшенное сохранение (ваша функция, немного доработанная для надежности)
function exportToJSON() {
    const Data_base = {
        Node: [],
        Edge: [],
        PRESSURE_TARGET: 19.17
    };
    
    Engine.scene.traverse((child) => {    
        if (typeof child.add_list === 'function') {
            if (child.type === 'Edge' || child.isEdgeGroup) {
                const edge = child.isEdgeGroup ? child.children.find(m => m.name === 'thickPipe') : child;
                if (edge && typeof edge.add_list === 'function') {
                    Data_base.Edge.push(edge.add_list());
                }
            } else {
                Data_base.Node.push(child.add_list());
            }
        }       
    });
    
    const jsonString = JSON.stringify(Data_base, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    // Имя файла с текущей датой и временем
    const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `AUP_Project_${date}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (typeof Utils !== 'undefined' && Utils.showStatus) {
        Utils.showStatus('Проект успешно сохранен');
    } else {
        console.log("Проект успешно сохранен");
    }
}

// 5.2. Функция полной очистки сцены перед загрузкой
export function clearSceneForLoad() {
    const toRemove = [];
    Engine.scene.traverse((child) => {
        // Собираем все узлы и трубы для удаления
        if (child.type === 'Node' || child.type === 'Source' || child.type === 'Sprinkler' || child.type === 'Edge') {
            toRemove.push(child);
        }
    });

    toRemove.forEach((obj) => {
        // Открепляем от родителя
        if (obj.parent) {
            obj.parent.remove(obj);
        } else {
            Engine.scene.remove(obj);
        }
        
        // Очищаем память (Geometry и Material)
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });

    // Полностью очищаем массив отслеживаемых объектов
    STATE.Three_D_objects = [];
    console.log("Сцена очищена для загрузки нового проекта");
}

// 5.3. Главная функция загрузки из JSON
function loadProjectFromJSON(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            console.log("Данные для загрузки:", data);

            // 1. Очищаем текущую сцену
            clearSceneForLoad();

            // 2. Словарь для быстрого поиска узлов по их ID (нужен для привязки труб)
            const nodeMap = new Map();

            // 3. Воссоздаем УЗЛЫ (Node, Source, Sprinkler)
            if (data.Node && Array.isArray(data.Node)) {
                data.Node.forEach(n => {
                    const geom = new THREE.SphereGeometry(VisualPipelins.d_node_base / 2, 32, 32);
                    
                    // Выбираем цвет в зависимости от типа
                    let color = 0x00ff00; // Node
                    let typeName = 'Node';
                    if (n.type === 'Source' || (n.name && n.name.toLowerCase().includes('source'))) {
                        color = 0x800080;
                        typeName = 'Source';
                    } else if (n.type === 'Sprinkler' || (n.name && n.name.toLowerCase().includes('sprinkler'))) {
                        color = 0xff0000;
                        typeName = 'Sprinkler';
                    }

                    const mat = new THREE.MeshBasicMaterial({ color: color });
                    const node = new Node_new(geom, mat, typeName);
                    
                    // Восстанавливаем координаты
                    const x = n.X_gl !== undefined ? n.X_gl : (n.x !== undefined ? n.x : 0);
                    const y = n.Y_gl !== undefined ? n.Y_gl : (n.y !== undefined ? n.y : 0);
                    const z = n.Z_gl !== undefined ? n.Z_gl : (n.z !== undefined ? n.z : 0);
                    
                    node.position.set(x, y, z);
                    
                    // Сохраняем оригинальный ID
                    const originalId = n.id || n.uuid || `node_${nodeMap.size}`;
                    node.id = originalId; 
                    
                    Engine.scene.add(node);
                    nodeMap.set(originalId, node);
                    STATE.Three_D_objects.push(node);

                    // Node_new сам нарисует стрелку при создании, если typeName === 'Sprinkler'
                    // Дополнительно вызываем метод для гарантии корректной отрисовки
                    if (typeof node.updateSprinklerArrow === "function") {
                        node.updateSprinklerArrow();
                    }
                });
            }

            // 4. Воссоздаем ТРУБЫ (Edge)
            if (data.Edge && Array.isArray(data.Edge)) {
                data.Edge.forEach(ed => {
                    // Ищем узлы по сохраненным ID
                    const startNode = nodeMap.get(ed.start_node);
                    const endNode = nodeMap.get(ed.end_node);

                    if (startNode && endNode) {
                        const path = new THREE.LineCurve3(
                            new THREE.Vector3(startNode.position.x, startNode.position.y, startNode.position.z),
                            new THREE.Vector3(endNode.position.x, endNode.position.y, endNode.position.z)
                        );
                        
                        const pipeGeom = new THREE.TubeGeometry(path, 64, VisualPipelins.d_pipe_base / 2, 12, false);
                        const pipeMat = new THREE.MeshBasicMaterial({ color: '#0F1379' });
                        
                        // Восстанавливаем свойства трубы
                        const length = ed.Length || 5;
                        const dn = ed.DN || 50;
                        const typeTube = ed.type_tube || ed.ghost || "Стальная";
                        const kt = ed.k_t || 0.01;
                        const kv = ed.kvelocity || 1.0;

                        const edge = new Edge_new(pipeGeom, pipeMat, startNode, endNode, 'Edge', length, dn, typeTube, kt, kv);
                        
                        // Привязываем трубу к узлам (как в CreatePipeline)
                        startNode.attach(edge);
                        edge.attach(endNode);

                        if (typeof edge._ensureLabels === 'function') {
                            edge._ensureLabels();
                            edge._updateLabelsVisibility();
                        }
                        
                        STATE.Three_D_objects.push(edge);
                    } else {
                        console.warn(`Не найдены узлы для трубы: start=${ed.start_node}, end=${ed.end_node}`);
                    }
                });
            }

            // 5. Обновляем глобальные координаты и дерево
            if (typeof update_Node_XYZ === 'function') update_Node_XYZ();
            if (typeof updateTreeUI === 'function') updateTreeUI();

            console.log("Проект успешно загружен!");
            if (typeof Utils !== 'undefined' && Utils.showStatus) {
                Utils.showStatus('Проект успешно загружен');
            } else {
                alert("Проект успешно загружен!");
            }

        } catch (error) {
            console.error("Ошибка при парсинге JSON:", error);
            alert("Ошибка при чтении файла. Убедитесь, что это корректный JSON проекта.");
        }
    };

    reader.readAsText(file);
}

// ============================================================================
// ФУНКЦИЯ ИМПОРТА ПРОЕКТА ИЗ JSON
// ============================================================================
function importToJSON() {
    // 1. Находим или создаем скрытый input для выбора файла
    let fileInput = document.getElementById("fileInputJSON");
    if (!fileInput) {
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.id = "fileInputJSON";
        fileInput.accept = ".json";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);
    }

    // 2. Настраиваем обработчик события выбора файла
    fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log("Выбран файл для загрузки:", file.name);
            loadProjectFromJSON(file);
            
            // Сбрасываем value, чтобы можно было выбрать тот же файл повторно
            fileInput.value = "";
        }
    };

    // 3. Имитируем клик по скрытому input, чтобы открыть системное окно выбора файла
    fileInput.click();
}


// Функция для жесткого обновления страницы (имитация Ctrl + F5)
function refreshPageHard() {    
    window.location.href = window.location.origin + window.location.pathname + '?r=' + Date.now();
}

// ============================================================================
// УПРАВЛЕНИЕ ДЕРЕВОМ ПОСТРОЕНИЯ
// ============================================================================

let treeVisible = false;
let treeBuilt = false;

function toggleTree() {
  const panel = document.getElementById('treePanel');
  const btn = document.getElementById('floatingTreeBtn');
  const title = document.getElementById('treeTitle');
  
  if (!treeBuilt) return;
  
  treeVisible = !treeVisible;
  
  if (treeVisible) {
    panel.classList.remove('hidden');
    btn.classList.add('active');
    title.classList.add('visible');  // ← Показываем заголовок
  } else {
    panel.classList.add('hidden');
    btn.classList.remove('active');
    title.classList.remove('visible');  // ← Скрываем заголовок
  }
}

export function updateTreeUI() {
  const btn = document.getElementById('floatingTreeBtn');
  if (btn) {
    btn.classList.add('active');
  }
  treeBuilt = true;
  buildTree(true);  // true = свернуть все группы
}

function buildTree(collapseAll = false) {
  const container = document.getElementById('treeContainer');
  if (!container || !Engine || !Engine.scene) return;
  
  container.innerHTML = '';
  const rootUl = document.createElement('ul');
  rootUl.className = 'tree-root';

  let sources = [], nodes = [], sprinklers = [], edges = [];

  Engine.scene.traverse((child) => {
    if (['FlowArrow', 'CalculationLabel', 'PipeLabel', 'NodeLabel', 
         'SprinklerArrow', 'GridHelper', 'AxesHelper', 'thickPipe', 'thinPipe'].includes(child.name)) {
      return;
    }

    if (child.isEdgeGroup) {
      const thickPipe = child.children.find(m => m.name === 'thickPipe');
      if (thickPipe) {
        const dn = thickPipe.DN || thickPipe.diameter || 50;
        const len = thickPipe.Length ? thickPipe.Length.toFixed(1) : '?';
        edges.push({ 
          id: child.uuid, 
          name: `Труба (DN${dn}, ${len}м)`, 
          type: 'Edge', 
          object: child 
        });
      }
      return;
    }

    let type = (child.type || '').trim();
    let name = (child.name || '').trim();
    
    const cleanType = type.toLowerCase();
    const cleanName = name.toLowerCase();

    if (cleanType === 'source' || cleanName === 'source' || cleanName.includes('source')) {
      sources.push({ id: child.uuid, name: 'Источник', type: 'Source', object: child });
    }
    else if (cleanType === 'sprinkler' || cleanName === 'sprinkler' || cleanName.includes('sprinkler')) {
      sprinklers.push({ id: child.uuid, name: 'Ороситель', type: 'Sprinkler', object: child });
    }
    else if (cleanType === 'node' || cleanName === 'node' || cleanName.includes('node_new')) {
      nodes.push({ id: child.uuid, name: 'Узел', type: 'Node', object: child });
    }
    else if (cleanType === 'edge' || cleanType === 'edge_new' || cleanName.includes('edge')) {
      const dn = child.DN || child.diameter || 50;
      const len = child.Length ? child.Length.toFixed(1) : '?';
      edges.push({ 
        id: child.uuid, 
        name: `Труба (DN${dn}, ${len}м)`, 
        type: 'Edge', 
        object: child 
      });
    }
  });

  const createGroup = (title, type, items) => {
    if (items.length === 0) return null;
    
    const groupLi = document.createElement('li');
    groupLi.className = 'tree-group';

    const header = document.createElement('div');
    header.className = 'tree-group-header';
    
    const toggleClass = collapseAll ? 'tree-toggle collapsed' : 'tree-toggle expanded';
    const listClass = collapseAll ? 'tree-list hidden' : 'tree-list';
    
    header.innerHTML = `
      <span class="${toggleClass}"></span>
      <span class="tree-group-icon ${type.toLowerCase()}"></span>
      <span class="tree-group-name">${title} [${items.length}]</span>
    `;

    const childUl = document.createElement('ul');
    childUl.className = listClass;

    items.forEach((item, index) => {
      const itemLi = document.createElement('li');
      itemLi.className = 'tree-item';
      
      const displayName = items.length > 1 ? `${item.name} ${index + 1}` : item.name;
      
      itemLi.innerHTML = `
        <span class="tree-item-icon ${type.toLowerCase()}"></span>
        <span class="tree-item-name" title="${displayName}">${displayName}</span>
      `;
      
      itemLi.addEventListener('click', (e) => {
        e.stopPropagation();
        container.querySelectorAll('.tree-item.selected').forEach(el => 
          el.classList.remove('selected'));
        itemLi.classList.add('selected');
        
        if (Engine) Engine.selectedObject = item.object;
        focusOnItem(item.object);
      });
      
      childUl.appendChild(itemLi);
    });

    header.addEventListener('click', () => {
      const toggle = header.querySelector('.tree-toggle');
      toggle.classList.toggle('expanded');
      toggle.classList.toggle('collapsed');
      childUl.classList.toggle('hidden');
    });

    groupLi.appendChild(header);
    groupLi.appendChild(childUl);
    return groupLi;
  };

  [createGroup('Источники', 'Source', sources),
   createGroup('Узлы', 'Node', nodes),
   createGroup('Оросители', 'Sprinkler', sprinklers),
   createGroup('Трубопроводы', 'Edge', edges)
  ].forEach(g => { if (g) rootUl.appendChild(g); });

  container.appendChild(rootUl);
}

function focusOnItem(object) {
    if (!Engine || !Engine.camera || !Engine.controls) return;
    const pos = new THREE.Vector3();
    if (object.getWorldPosition) object.getWorldPosition(pos);
    else pos.copy(object.position);
    
    Engine.camera.position.set(pos.x + 5, pos.y + 5, pos.z + 5);
    Engine.controls.target.copy(pos);
    Engine.controls.update();
}

// Привязка кнопки
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("floatingTreeBtn");
    if (btn) {
        btn.onclick = () => toggleTree();
    }
});

// ============================================================================
// ПРИНУДИТЕЛЬНОЕ ИСПРАВЛЕНИЕ ВИДИМОСТИ СЦЕНЫ И ИНИЦИАЛИЗАЦИЯ МЕНЮ
// ============================================================================
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.classList.add('hidden');

        const eng = window.Engine;
        if (eng && eng.scene && eng.renderer && eng.camera) {
            
            eng.renderer.setSize(window.innerWidth, window.innerHeight);
            eng.camera.aspect = window.innerWidth / window.innerHeight;
            eng.camera.updateProjectionMatrix();
            World.initAxesGizmo();
            
            console.log("Сцена успешно инициализирована и готова к работе");
            
            // ДОБАВИТЬ ЭТО: Включаем DN и L по умолчанию при старте
            if (typeof STATE !== 'undefined') {
                STATE.showLabelsDN = true;
                STATE.showLabelsLength = true;
            }

            // ДОБАВИТЬ ЭТО: Делаем кнопки визуально активными (красными) сразу
            const btnDN = document.getElementById("DN_visible");
            if (btnDN) btnDN.classList.add("active");
            
            const btnL = document.getElementById("L_visible");
            if (btnL) btnL.classList.add("active");
            
            if (typeof window.initContextMenu === 'function') {
                window.initContextMenu();
            } else {
                console.warn("Функция initContextMenu не найдена!");
            }
            
        } else {
            console.warn("Объект Engine или сцена не найдены при загрузке!");
        }
    }, 500);
});


function exportToJSON234() {
    const Data_base = {
        Node: [],
        Edge: [],
        PRESSURE_TARGET: 19.17
    };
    
    Engine.scene.traverse((child) => {    
        if (typeof child.add_list === 'function') {
            if (child.type === 'Edge' || child.isEdgeGroup) {
                const edge = child.isEdgeGroup ? child.children.find(m => m.name === 'thickPipe') : child;
                if (edge && typeof edge.add_list === 'function') {
                    Data_base.Edge.push(edge.add_list());
                }
            } else {
                Data_base.Node.push(child.add_list());
            }
        }       
    });
    
    const jsonString = JSON.stringify(Data_base, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
  
}

function loadProjectFromJSOssN(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            console.log("Данные для загрузки:", data);

            // 1. Очищаем текущую сцену
            clearSceneForLoad();

            // 2. Словарь для быстрого поиска узлов по их ID (нужен для привязки труб)
            const nodeMap = new Map();

            // 3. Воссоздаем УЗЛЫ (Node, Source, Sprinkler)
            if (data.Node && Array.isArray(data.Node)) {
                data.Node.forEach(n => {
                    const geom = new THREE.SphereGeometry(VisualPipelins.d_node_base / 2, 32, 32);
                    
                    // Выбираем цвет в зависимости от типа
                    let color = 0x00ff00; // Node
                    let typeName = 'Node';
                    if (n.type === 'Source' || (n.name && n.name.toLowerCase().includes('source'))) {
                        color = 0x800080;
                        typeName = 'Source';
                    } else if (n.type === 'Sprinkler' || (n.name && n.name.toLowerCase().includes('sprinkler'))) {
                        color = 0xff0000;
                        typeName = 'Sprinkler';
                    }

                    const mat = new THREE.MeshBasicMaterial({ color: color });
                    const node = new Node_new(geom, mat, typeName);
                    
                    // Восстанавливаем координаты
                    const x = n.X_gl !== undefined ? n.X_gl : (n.x !== undefined ? n.x : 0);
                    const y = n.Y_gl !== undefined ? n.Y_gl : (n.y !== undefined ? n.y : 0);
                    const z = n.Z_gl !== undefined ? n.Z_gl : (n.z !== undefined ? n.z : 0);
                    
                    node.position.set(x, y, z);
                    
                    // Сохраняем оригинальный ID
                    const originalId = n.id || n.uuid || `node_${nodeMap.size}`;
                    node.id = originalId; 
                    
                    Engine.scene.add(node);
                    nodeMap.set(originalId, node);
                    STATE.Three_D_objects.push(node);

                    // Восстанавливаем стрелку ТОЛЬКО для оросителей
                    if (typeName === 'Sprinkler') {
                        const sprinklerGroup = new THREE.Group();
                        sprinklerGroup.name = 'SprinklerArrow';
                        const nodeRadius = VisualPipelins.d_node_base / 2;
                        
                        // 1. Стержень стрелки (цилиндр)
                        const shaftRadius = nodeRadius * 0.1;
                        const shaftHeight = nodeRadius * 2.5;
                        const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftHeight, 16);
                        const shaft = new THREE.Mesh(shaftGeo, mat);
                        shaft.position.y = -(shaftHeight / 2);
                        
                        // 2. Наконечник стрелки (конус, направленный вниз)
                        const headRadius = nodeRadius * 1;
                        const headHeight = nodeRadius * 1.5;
                        const headGeo = new THREE.ConeGeometry(headRadius, headHeight, 16);
                        const head = new THREE.Mesh(headGeo, mat);
                        head.rotation.x = Math.PI;
                        head.position.y = -(shaftHeight + headHeight / 2);

                        sprinklerGroup.add(shaft);
                        sprinklerGroup.add(head);
                        
                        // Добавляем группу со стрелкой к узлу
                        node.add(sprinklerGroup);
                    }
                });
            }

            // 4. Воссоздаем ТРУБЫ (Edge)
            if (data.Edge && Array.isArray(data.Edge)) {
                data.Edge.forEach(ed => {
                    // Ищем узлы по сохраненным ID
                    const startNode = nodeMap.get(ed.start_node);
                    const endNode = nodeMap.get(ed.end_node);

                    if (startNode && endNode) {
                        const path = new THREE.LineCurve3(
                            new THREE.Vector3(startNode.position.x, startNode.position.y, startNode.position.z),
                            new THREE.Vector3(endNode.position.x, endNode.position.y, endNode.position.z)
                        );
                        
                        const pipeGeom = new THREE.TubeGeometry(path, 64, VisualPipelins.d_pipe_base / 2, 12, false);
                        const pipeMat = new THREE.MeshBasicMaterial({ color: '#0F1379' });
                        
                        // Восстанавливаем свойства трубы
                        const length = ed.Length || 5;
                        const dn = ed.DN || 50;
                        const typeTube = ed.type_tube || ed.ghost || "Стальная";
                        const kt = ed.k_t || 0.01;
                        const kv = ed.kvelocity || 1.0;

                        const edge = new Edge_new(pipeGeom, pipeMat, startNode, endNode, 'Edge', length, dn, typeTube, kt, kv);
                        
                        // Привязываем трубу к узлам (как в CreatePipeline)
                        startNode.attach(edge);
                        edge.attach(endNode);
                        
                        STATE.Three_D_objects.push(edge);
                    } else {
                        console.warn(`⚠️ Не найдены узлы для трубы: start=${ed.start_node}, end=${ed.end_node}`);
                    }
                });
            }

            // 5. Обновляем глобальные координаты и дерево
            if (typeof update_Node_XYZ === 'function') update_Node_XYZ();
            if (typeof updateTreeUI === 'function') updateTreeUI();

            console.log("Проект успешно загружен!");
            if (typeof Utils !== 'undefined' && Utils.showStatus) {
                Utils.showStatus('Проект успешно загружен');
            } else {
                alert("Проект успешно загружен!");
            }

        } catch (error) {
            console.error("Ошибка при парсинге JSON:", error);
            alert("Ошибка при чтении файла. Убедитесь, что это корректный JSON проекта.");
        }
    };

    reader.readAsText(file);
}

// Вспомогательная функция для визуального состояния кнопок
function updateToggleButtonState(btnId, isActive) {
    const btn = document.getElementById(btnId);
    if (btn) {
        if (isActive) {            
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
}

function toggleLengthEditMode(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  STATE.isEditingLengths = !STATE.isEditingLengths;
  const btn = document.getElementById("btnToggleLengthEdit");
  if (btn) {
    STATE.isEditingLengths ? btn.classList.add("active") : btn.classList.remove("active");
  }

  console.log("Режим редактирования длин:", STATE.isEditingLengths);

  STATE.Three_D_objects.forEach((obj) => {
    if (obj.type === "Edge") {
      if (!obj.uiGroup) obj.createUI();
      obj.updateDOMValues(); // Этот метод теперь жестко меняет style.display
    }
  });
}

// Глобальная функция для изменения длины трубы
window.applyNewLengthToEdge = function(edge, newLength) {
    const start_node = edge.start_node;
    const end_node = edge.end_node;
    const start_World_Pos = new THREE.Vector3();
    const end_World_Pos = new THREE.Vector3();
    start_node.getWorldPosition(start_World_Pos);
    end_node.getWorldPosition(end_World_Pos);

    const direction_Vector = new THREE.Vector3().subVectors(end_World_Pos, start_World_Pos).normalize();
    const new_World_End = new THREE.Vector3().addVectors(start_World_Pos, direction_Vector.multiplyScalar(newLength));

    const local_End_Node = new_World_End.clone();
    if (end_node.parent) end_node.parent.worldToLocal(local_End_Node);
    end_node.position.copy(local_End_Node);

    end_node.updateMatrixWorld(true);
    start_node.updateMatrixWorld(true);
    edge.updateMatrixWorld(true);

    const path_Start = start_World_Pos.clone();
    const path_End = new_World_End.clone();
    edge.worldToLocal(path_Start);
    edge.worldToLocal(path_End);
    edge.geometry.dispose();
    edge.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(path_Start, path_End), 64, VisualPipelins.d_pipe_base/2, 12, false);
    edge.Length = newLength;

    // Текст + стрелка + смещения
    if (typeof edge._updateLabelTexts === 'function') edge._updateLabelTexts();
    if (typeof edge.createFlowArrow === 'function') edge.createFlowArrow();
    if (typeof edge._updateLabelsVisibility === 'function') edge._updateLabelsVisibility();

    if (typeof edge.updateLabelsPosition === 'function') edge.updateLabelsPosition();

    check_position_node_for_edge();
    checkAllPipelines();
};

// ============================================================================
// КОНТЕКСТНОЕ МЕНЮ ПО ПРАВОМУ КЛИКУ (CAD-style) — С ОТЛОЖЕННОЙ ИНИЦИАЛИЗАЦИЕЙ
// ============================================================================
let contextMenu, contextMenuList, currentContextObject = null;

// Функция инициализации — вызывается ПОСЛЕ того, как Engine готов
function initContextMenu() {
    contextMenu = document.getElementById('contextMenu');
    contextMenuList = document.getElementById('contextMenuList');
    
    if (!contextMenu || !contextMenuList) {
        console.warn('HTML контекстного меню не найден в DOM');
        return;
    }
    
    if (!Engine.renderer || !Engine.renderer.domElement) {
        console.warn('Engine.renderer ещё не инициализирован');
        return;
    }
    
    Engine.renderer.domElement.addEventListener('contextmenu', (event) => {
        event.preventDefault(); // Запрещаем стандартное меню браузера
        
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        Engine.raycaster.setFromCamera(mouse, Engine.camera);
        const intersects = Engine.raycaster.intersectObjects(Engine.scene.children, true);
        const hitMesh = Engine.findValidMesh(intersects);
        
        if (hitMesh) {
            currentContextObject = hitMesh;
            
            // Выделяем объект при правом клике
            if (!Engine.selectedObjects.includes(hitMesh)) {
                Engine.selectedObjects.forEach(obj => Engine.deselectObject(obj));
                Engine.selectedObjects = [hitMesh];
                Engine.selectObject(hitMesh);
                Engine.selectedObject = hitMesh;
            }
            
            buildContextMenu(hitMesh);
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${event.clientX}px`;
            contextMenu.style.top = `${event.clientY}px`;
        } else {
            hideContextMenu();
        }
    });
    
    console.log('Контекстное меню инициализировано');
}

function buildContextMenu(obj) {
    contextMenuList.innerHTML = '';
    let items = [];
    
    if (obj.type === 'Node' || obj.type === 'Sprinkler' || obj.type === 'Source') {
        items.push({ 
            label: 'ℹ️ Информация', 
            action: () => { 
                Engine.selectedObject = obj; 
                Engine.selectedObjects = [obj]; 
                Engine.info_selected_elevent(); // ✅ ЯВНЫЙ ВЫЗОВ ПОКАЗА ИНФОРМАЦИИ
                hideContextMenu(); 
            } 
        });
        items.push({ label: '✏️ Изменить узел', action: () => { Engine.selectedObject = obj; Check_Edit_Node(); hideContextMenu(); } });
        items.push({ label: '🎯 Фокус на объекте', action: () => { focusOnItem(obj); hideContextMenu(); } });
        items.push('separator');
        items.push({ label: '🗑️ Удалить узел', action: () => { if(confirm('Удалить этот узел?')) { Engine.selectedObject = obj; delete_pipe_tube(); } hideContextMenu(); }, danger: true });
    } 
    else if (obj.type === 'Edge') {
        items.push({ 
            label: 'ℹ️ Информация', 
            action: () => { 
                Engine.selectedObject = obj; 
                Engine.selectedObjects = [obj]; 
                Engine.info_selected_elevent(); // ✅ ЯВНЫЙ ВЫЗОВ ПОКАЗА ИНФОРМАЦИИ
                hideContextMenu(); 
            } 
        });
        items.push({ label: '✏️ Изменить трубопровод', action: () => { Engine.selectedObject = obj; check_pipe_tube_Edit(); hideContextMenu(); } });
        items.push({ label: '🎯 Фокус на объекте', action: () => { focusOnItem(obj); hideContextMenu(); } });
        items.push('separator');
        items.push({ label: '🗑️ Удалить трубопровод', action: () => { if(confirm('Удалить этот трубопровод?')) { Engine.selectedObject = obj; delete_pipe_tube(); } hideContextMenu(); }, danger: true });
    }
    
    items.forEach(item => {
        if (item === 'separator') {
            const sep = document.createElement('li');
            sep.className = 'separator';
            contextMenuList.appendChild(sep);
        } else {
            const li = document.createElement('li');
            li.textContent = item.label;
            if (item.danger) li.classList.add('danger');
            li.addEventListener('click', (e) => {
                e.stopPropagation(); 
                item.action();
            });
            contextMenuList.appendChild(li);
        }
    });
}

function hideContextMenu() {
    if (contextMenu) contextMenu.style.display = 'none';
    currentContextObject = null;
}

document.addEventListener('click', (event) => {
    if (!event.target.closest('.cad-context-menu')) {
        hideContextMenu();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hideContextMenu();
});

// ============================================================================
// ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ СИСТЕМЫ КООРДИНАТ В (0,0,0)
// ============================================================================
const axesToggleButton = document.getElementById('menuToggleAxes');
if (axesToggleButton) {
    // По умолчанию система координат показана
    axesToggleButton.classList.add('active');
    
    axesToggleButton.addEventListener('click', () => {
        if (STATE.meshes && STATE.meshes.axes) {
            STATE.meshes.axes.visible = !STATE.meshes.axes.visible;
            axesToggleButton.classList.toggle('active', STATE.meshes.axes.visible);
            console.log(`Система координат: ${STATE.meshes.axes.visible ? 'показана' : 'скрыта'}`);
        } else {
            console.warn('Система координат не создана');
        }
    });
}


// ============================================================================
// УДАЛЕНИЕ ОБЪЕКТА ПО КЛАВИШЕ DELETE
// ============================================================================
document.addEventListener('keydown', (event) => {
    // Проверяем нажатие клавиши Delete или Backspace
    if (event.key === 'Delete' || event.key === 'Backspace') {
        // Игнорируем нажатие, если фокус находится в поле ввода текста (чтобы не стирать текст)
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        event.preventDefault(); // Предотвращаем стандартное действие браузера
        deleteCurrentSelection();
    }
});

function deleteCurrentSelection() {
    const obj = Engine.selectedObject;
    
    if (!obj) {
        console.log("⚠️ Ничего не выбрано для удаления");
        return;
    }

    const type = obj.type;

    if (type === 'Edge') {
        // Если выбрана труба, используем существующую логику (она также чистит связанные узлы)
        delete_pipe_tube();
    } 
    else if (type === 'Node' || type === 'Sprinkler' || type === 'Source') {
        // Если выбран узел, удаляем его и все трубы, которые к нему привязаны
        
        // 1. Находим все трубы, подключенные к этому узлу
        const connectedEdges = [];
        Engine.scene.traverse((child) => {
            if (child.type === 'Edge') {
                if (child.start_node.uuid === obj.uuid || child.end_node.uuid === obj.uuid) {
                    connectedEdges.push(child);
                }
            }
        });

        // 2. Удаляем подключенные трубы
        connectedEdges.forEach(edge => {
            if (typeof edge.destroyLabels === 'function') edge.destroyLabels();
            if (edge.parent) edge.parent.remove(edge);
            else Engine.scene.remove(edge);
        });

        // 3. Удаляем сам узел
        if (typeof obj.destroyLabels === 'function') obj.destroyLabels();
        if (obj.parent) obj.parent.remove(obj);
        else Engine.scene.remove(obj);

        // 4. Очищаем массив STATE.Three_D_objects от удаленных объектов
        STATE.Three_D_objects = STATE.Three_D_objects.filter(
            item => item !== obj && !connectedEdges.includes(item)
        );

        // 5. Проверяем и удаляем источники-сироты (без дочерних элементов)
        const orphanSources = [];
        Engine.scene.traverse((child_node) => {
            if (child_node.type === "Source" && child_node.children.length === 0) {
                orphanSources.push(child_node);
            }
        });
        
        orphanSources.forEach((source) => {
            if (typeof source.destroyLabels === 'function') source.destroyLabels();
            if (source.parent) source.parent.remove(source);
            else Engine.scene.remove(source);
            STATE.Three_D_objects = STATE.Three_D_objects.filter(item => item !== source);
        });

        // 6. Обновляем сцену и интерфейс
        Engine.scene.updateMatrixWorld(true);
        Engine.clearSelection(); // Сбрасываем выделение
        updateTreeUI();
        checkAllPipelines();
        
        console.log(`✅ Объект типа ${type} и связанные элементы успешно удалены`);
    } 
    else {
        console.log("⚠️ Этот тип объекта нельзя удалить клавишей Delete");
    }
}

// Экспортируем функцию инициализации глобально
window.initContextMenu = initContextMenu;