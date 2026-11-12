import * as THREE from 'three';
// import { Engine } from './engine.js';

import { Engine } from "./engine.js";
import { Edge_new, Node_new } from "./factory.js";
import { STATE, Utils, VisualPipelins } from "./state.js";
import { get_load_pbDiameter } from './check_input.js';
import { checkAllPipelines } from './collision.js';

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

//Слушатель для редактирования длин
document.getElementById("btnToggleLengthEdit").onclick = toggleLengthEditMode;

document.getElementById("Node_Edit_close").onclick = () => {
  document.getElementById("Node_Edit").style.display = "none";
  // Если при нажатии на "Отмена" вызывается специальная функция, например Close_Node_Edit(), вызовите её здесь
};




// ============================================================================
// ОТДЕЛЬНОЕ УПРАВЛЕНИЕ МЕТКАМИ (ИЗОЛИРОВАННОЕ)
// ============================================================================

// // 1. Управление давлением (P)
// function togglePressureLabels() {
//     STATE.showLabelsPressure = !STATE.showLabelsPressure;
//     console.log("🔘 Давление (P):", STATE.showLabelsPressure);
    
//     // Обновляем старые метки на узлах
//     Engine.scene.traverse((child) => {
//         if (child.name === 'PressureLabel') child.visible = STATE.showLabelsPressure;
//     });
    
//     updateToggleButtonState('btnTogglePressure', STATE.showLabelsPressure);
// }

// // Управление расходом (Q) - ТОЛЬКО для расхода
// function toggleFlowLabels() {
//   STATE.showLabelsMassFlowRate = !STATE.showLabelsMassFlowRate;
//   console.log("🔘 Расход (Q):", STATE.showLabelsMassFlowRate);

//   // Обновляем видимость меток для всех труб
//   STATE.Three_D_objects.forEach((obj) => {
//     if (obj.type === "Edge") {
//       if (!obj.uiGroup) {
//         obj.createUI();
//       }
//       obj.updateDOMValues(); // Этот метод сам решит, что показать
//     }
//   });

//   // Обновляем состояние кнопки
//   const btn = document.getElementById("btnToggleFlow");
//   if (btn) {
//     STATE.showLabelsMassFlowRate ? btn.classList.add("active") : btn.classList.remove("active");
//   }
// }

// 1. Управление давлением (P)
function togglePressureLabels() {
    STATE.showLabelsPressure = !STATE.showLabelsPressure;
    console.log("🔘 Давление (P):", STATE.showLabelsPressure);
    
    // Обновляем старые метки (если они еще где-то есть)
    Engine.scene.traverse((child) => {
        if (child.name === 'PressureLabel') child.visible = STATE.showLabelsPressure;
    });

    // ✅ НОВОЕ: Обновляем новые метки во всех узлах (включая оросители)
    STATE.Three_D_objects.forEach((obj) => {
        if ((obj.type === "Node" || obj.type === "Sprinkler" || obj.type === "Source") && typeof obj._updateLabelsVisibility === "function") {
            obj._updateLabelsVisibility();
        }
    });
    
    updateToggleButtonState('btnTogglePressure', STATE.showLabelsPressure);
}

// Управление расходом (Q) - ТОЛЬКО для расхода
function toggleFlowLabels() {
  STATE.showLabelsMassFlowRate = !STATE.showLabelsMassFlowRate;
  console.log("🔘 Расход (Q):", STATE.showLabelsMassFlowRate);

  // ✅ Обновляем видимость меток и СТРЕЛОК для всех труб
  STATE.Three_D_objects.forEach((obj) => {
    if (obj.type === "Edge") {
      if (!obj.uiGroup) {
        obj.createUI();
      }
      obj.updateDOMValues(); // Этот метод вызовет updateFlowArrowVisibility внутри
    }
  });

  // Обновляем состояние кнопки
  const btn = document.getElementById("btnToggleFlow");
  if (btn) {
    STATE.showLabelsMassFlowRate ? btn.classList.add("active") : btn.classList.remove("active");
  }
}

// Управление скоростью (V) - ТОЛЬКО для скорости
function toggleVelocityLabels() {
  STATE.showLabelsVelocity = !STATE.showLabelsVelocity;
  console.log("🔘 Скорость (V):", STATE.showLabelsVelocity);

  // ✅ Обновляем видимость меток и СТРЕЛОК для всех труб
  STATE.Three_D_objects.forEach((obj) => {
    if (obj.type === "Edge") {
      if (!obj.uiGroup) {
        obj.createUI();
      }
      obj.updateDOMValues(); // Этот метод вызовет updateFlowArrowVisibility внутри
    }
  });

  // Обновляем состояние кнопки
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
        
        // ✅ Используем .attach() для сохранения мировых координат при смене родителя
        Node_Start.attach(Pipe_connection);
        if (!check_node_end) {
            Pipe_connection.attach(Node_End);
        }
        Pipe_connection.createUI(); //Добавил 09.11.2026
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
        }    
    
    
    // Обновляем матрицы и интерфейс
    Engine.scene.updateMatrixWorld(true);
    update_Node_XYZ();
    updateTreeUI(); 
    checkAllPipelines(); // функция для проверки коллизии
    // =========================================================================
    // ✅ ГАРАНТИРОВАННЫЙ ВЫБОР И ПОДСВЕТКА ПОСЛЕДНЕГО УЗЛА (ЗЕЛЕНЫЙ ЦВЕТ)
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
        // Node_End.material.color.setHex(0x00ff00); // ✅ Зеленый цвет выделения
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
// функция дял изменения геометрии трубы
function edit_pipe_tube(Edge) {
    let start_node = Edge.start_node;
    let end_node = Edge.end_node;
    const new_type_tube = document.getElementById("get_tube_pipe_edit").selectedOptions[0].textContent; // тип трубы (ГОСТ)
        
    const new_pbDiameter = document.getElementById("pbDiameter_edit"); //// элемент для удосбвтва вывода свойств
    const new_DN_tube = parseFloat(new_pbDiameter.selectedOptions[0].textContent); ///// сами свойства
    const new_k_t = parseFloat(new_pbDiameter.selectedOptions[0].dataset.k_t);
    const new_kvelocity = parseFloat(new_pbDiameter.selectedOptions[0].dataset.kvelocity);
    const new_long = parseFloat(document.getElementById("pipe_edit").value);    
    
    const start_World_Pos = new THREE.Vector3();
    const end_World_Pos = new THREE.Vector3();
    // берем мирвоые позиции из локальных объекта 
    start_node.getWorldPosition(start_World_Pos);
    end_node.getWorldPosition(end_World_Pos);
    // преобразованеи вектора в 1
    const direction_Vector = new THREE.Vector3();
    direction_Vector.subVectors(end_World_Pos, start_World_Pos).normalize();
    // расчет положение точки end
    const new_World_End = new THREE.Vector3();
    new_World_End.addVectors(start_World_Pos, direction_Vector.multiplyScalar(new_long));
    
    const local_End_Node = new_World_End.clone();    
    // Переход из мировых координат в локальыне рордителя
    if (end_node.parent) {
        end_node.parent.worldToLocal(local_End_Node);
    }    
    end_node.position.copy(local_End_Node);
    
    end_node.updateMatrixWorld(true); 
    start_node.updateMatrixWorld(true);
    Edge.updateMatrixWorld(true);

    // обновление отображения ребра
    const path_Start = start_World_Pos.clone();
    const path_End = new_World_End.clone();

    Edge.worldToLocal(path_Start);
    Edge.worldToLocal(path_End);
    
    const new_Path = new THREE.LineCurve3(path_Start, path_End);
        
    Edge.geometry.dispose(); 
    Edge.geometry = new THREE.TubeGeometry(new_Path, 64, VisualPipelins.d_pipe_base/2, 12, false);
    
    Edge.ghost=new_type_tube;
    Edge.DN=new_DN_tube;
    Edge.k_t=new_k_t;
    Edge.kvelocity=new_kvelocity;
    Edge.Length = new_long;


    // ✅✅✅ ДОБАВИТЬ ЭТИ 2 БЛОКА НИЖЕ ✅✅✅
    
    // 1. Если включен режим редактирования, обновляем число прямо в инпуте на сцене
    if (Edge._inputLenElement) {
        Edge._inputLenElement.value = new_long.toFixed(2);
    }

    // 2. Пересчитываем позиции меток, чтобы они сдвинулись в новый центр трубы
    if (typeof Edge.updateLabelsPosition === 'function') {
        Edge.updateLabelsPosition();
    }

    // ✅✅✅ КОНЕЦ ДОБАВЛЕНИЯ ✅✅✅

    const new_Node_Geometry = new THREE.SphereGeometry(VisualPipelins.d_node_base/2, 32, 32);
    Edge.start_node.geometry.dispose();
    Edge.end_node.geometry.dispose();
    Edge.start_node.geometry = new_Node_Geometry;
    Edge.end_node.geometry = new_Node_Geometry;
    cancel("PipelineModal_Edit");

    update_Node_XYZ();

    console.log("Engine.scene.children_EDIT",Engine.scene.children);
    // check_position_node_for_edge(Edge.end_node);
    check_position_node_for_edge();
    checkAllPipelines(); // функция для проверки коллизии

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
            // ✅ Node_new САМ добавит стрелку, так как тип 'Sprinkler'
            currentEndNode = new Node_new(Node_Geometry, Node_Material, 'Sprinkler');
            currentEndNode.position.set(pbCX_end, pbCY_end, pbCZ_end);
            
            // ⚠️ ВАЖНО: добавляем узел на сцену (этой строки не хватало в старом коде)
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
        if ( child.type === 'Edge') {
            const start_check = new THREE.Vector3();
            const end_check = new THREE.Vector3();
            child.start_node.getWorldPosition(start_check);
            child.end_node.getWorldPosition(end_check);
            const new_long = start_check.distanceTo(end_check); // пересчитанная длина ребра междлу точками
            child.Length = new_long;
            const Local_position_start = start_check.clone();
            const Local_position_end = end_check.clone();
            child.worldToLocal(Local_position_start); //переходим в координаты родителя
            child.worldToLocal(Local_position_end); //переходим в координаты родителя
            const path = new THREE.LineCurve3(Local_position_start, Local_position_end); // строим путь от родителя
            child.geometry.dispose(); // удаялем старую геомтерию
            child.geometry = new THREE.TubeGeometry(path, 64, VisualPipelins.d_pipe_base/2, 12, false);
            child.updateMatrixWorld(true);
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

        // ✅ МАГИЯ: Просто вызываем метод класса! 
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

//     // 3. ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Если тип стал "Sprinkler", создаем и добавляем стрелку
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
        console.log('✅ Ответ от сервера:', result);

        if (result.status === "success") {
            // ✅ ДОБАВИТЬ ЭТО: сохраняем данные для графика
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

// ============================================================================
// 1. Вспомогательная функция для создания текстовых меток (Sprite)
// ============================================================================
function createTextLabel(text, color = '#ffffff', yOffset = 0.5) {
    // Делаем канвас КВАДРАТНЫМ для правильных пропорций
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    ctx.font = 'Bold 36px Arial, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = text.split('\n');
    const lineHeight = 60;
    const startY = (size - (lines.length * lineHeight)) / 2 + lineHeight / 2;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    lines.forEach((line, i) => {
        ctx.fillText(line, size / 2, startY + i * lineHeight);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        depthTest: false,
        transparent: true,
        sizeAttenuation: true  // Важно: масштаб зависит от расстояния до камеры
    });
    
    const sprite = new THREE.Sprite(material);
    // КВАДРАТНЫЙ масштаб — текст не будет сплюснут
    sprite.scale.set(2, 2, 1);
    sprite.position.y = yOffset;
    sprite.name = 'CalculationLabel';
    
    return sprite;
}


// ============================================================================
// ТЕКСТОВАЯ МЕТКА, ПОВЁРНУТАЯ ВДОЛЬ ТРУБЫ
// ============================================================================
function createTextLabelAlongPipe(text, startWorld, endWorld, color = '#ffffff', offset = 0.15) {
    // 1. Создаём canvas с текстом
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const fontSize = 32;
    ctx.font = `Bold ${fontSize}px Arial, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    
    // Размеры canvas с запасом
    const padding = 20;
    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = fontSize + padding * 2;
    
    // Рисуем текст
    ctx.font = `Bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    // 2. Создаём плоскость с пропорциями текста
    // Масштаб: 1 пиксель = 0.005 метра (настройте под себя)
    const scale = 0.005;
    const planeWidth = canvas.width * scale;
    const planeHeight = canvas.height * scale;
    
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthTest: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // 3. Вычисляем направление трубы
    const direction = new THREE.Vector3()
        .subVectors(endWorld, startWorld)
        .normalize();
    
    // 4. Середина трубы
    const midPoint = new THREE.Vector3()
        .lerpVectors(startWorld, endWorld, 0.5);
    
    // 5. Поворот плоскости вдоль трубы
    // PlaneGeometry по умолчанию лежит в плоскости XY (нормаль = Z)
    // Разворачиваем так, чтобы нормаль смотрела вдоль трубы
    const quaternion = new THREE.Quaternion()
        .setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    mesh.quaternion.copy(quaternion);
    
    // 6. Проверяем, не перевёрнут ли текст
    // Если труба идёт "вниз" (Y < 0), текст окажется вверх ногами
    // Разворачиваем на 180° вокруг оси трубы
    if (direction.y < 0) {
        const flipQuaternion = new THREE.Quaternion()
            .setFromAxisAngle(direction, Math.PI);
        mesh.quaternion.premultiply(flipQuaternion);
    }
    
    // 7. Смещение перпендикулярно трубе
    const upVector = new THREE.Vector3(0, 1, 0);
    if (Math.abs(direction.dot(upVector)) > 0.9) {
        upVector.set(0, 0, 1);
    }
    const offsetDir = new THREE.Vector3()
        .crossVectors(direction, upVector)
        .normalize();
    
    if (offsetDir.length() < 0.01) {
        offsetDir.set(1, 0, 0);
    }
    
    mesh.position.copy(midPoint);
    mesh.position.add(offsetDir.multiplyScalar(offset));
    
    mesh.name = 'PipeLabel';
    
    return mesh;
}

// ============================================================================
// 2. Функция очистки старых меток (ВАЖНО для предотвращения утечек памяти!)
// ============================================================================
// function clearCalculationLabels() {
//     const labelsToRemove = [];
    
//     Engine.scene.traverse((child) => {
//         // Очищаем и текстовые метки, и стрелки направления
//         if (child && (child.name === 'CalculationLabel' || child.name === 'FlowArrow')) {
//             labelsToRemove.push(child);
//         }
//     });
    
//     labelsToRemove.forEach(label => {
//         try {
//             if (label.parent) {
//                 label.parent.remove(label);
//             }
//             if (label.material) {
//                 if (label.material.map) label.material.map.dispose();
//                 label.material.dispose();
//             }
//             // Для ArrowHelper нужно удалить и линию, и конус
//             if (label.line && label.line.material) {
//                 label.line.material.dispose();
//             }
//             if (label.cone && label.cone.material) {
//                 label.cone.material.dispose();
//             }
//         } catch (e) {
//             console.warn('Ошибка при удалении метки/стрелки:', e);
//         }
//     });
    
//     console.log(`🗑️ Удалено объектов визуализации: ${labelsToRemove.length}`);
// }


function clearCalculationLabels() {
    const labelsToRemove = [];
    
    Engine.scene.traverse((child) => {
        // ✅ Обновленный список имен для очистки
        if (child && (
            child.name === 'PressureLabel' || 
            child.name === 'FlowLabel' || 
            child.name === 'VelocityLabel' || 
            child.name === 'FlowArrow'
        )) {
            labelsToRemove.push(child);
        }
    });
    
    labelsToRemove.forEach(label => {
        try {
            if (label.parent) {
                label.parent.remove(label);
            }
            if (label.material) {
                if (label.material.map) label.material.map.dispose();
                label.material.dispose();
            }
            if (label.line && label.line.material) label.line.material.dispose();
            if (label.cone && label.cone.material) label.cone.material.dispose();
        } catch (e) {
            console.warn('Ошибка при удалении метки/стрелки:', e);
        }
    });
    
    console.log(`🗑️ Удалено объектов визуализации: ${labelsToRemove.length}`);
}

function cleanSceneOrphans() {
    // Удаляем undefined детей из всех объектов сцены
    Engine.scene.traverse((parent) => {
        if (parent.children) {
            parent.children = parent.children.filter(child => child !== undefined && child !== null);
        }
    });
    
    // Очищаем STATE.Three_D_objects от битых ссылок
    STATE.Three_D_objects = STATE.Three_D_objects.filter(obj => {
        if (!obj || !obj.uuid) return false;
        // Проверяем, что объект всё ещё в сцене
        let found = false;
        Engine.scene.traverse((child) => {
            if (child.uuid === obj.uuid) found = true;
        });
        return found;
    });
    
    console.log(`🧹 Очистка сцены: ${STATE.Three_D_objects.length} объектов осталось`);
}

// ============================================================================
// 3. Главная функция визуализации результатов
// ============================================================================
// function visualizeResults(result) {
//     console.log('🚀 Начинаем визуализацию...');
    
//     // Очищаем битые ссылки перед работой
//     cleanSceneOrphans();
    
//     // Очищаем старые метки
//     clearCalculationLabels();

//     let nodesCount = 0;
//     let edgesCount = 0;

//     // 2. Добавляем метки к УЗЛАМ (Node / Source / Sprinkler)
//     for (const [uuid, data] of Object.entries(result.nodes)) {
//         const nodeObj = STATE.Three_D_objects.find(
//             obj => obj.uuid.toLowerCase() === uuid.toLowerCase() && 
//                 (obj.type === 'Node' || obj.type === 'Source' || obj.type === 'Sprinkler')
//         );

//         if (nodeObj) {
//             // Получаем мировые координаты узла
//             const nodeWorldPos = new THREE.Vector3();
//             nodeObj.getWorldPosition(nodeWorldPos);
            
//             // Давление — ОТДЕЛЬНОЙ меткой СВЕРХУ узла
//             const pressureLabel = `${data.pressure_m.toFixed(3)} м вод. ст.`;
//             const pressureLabelMesh = createTextLabel(pressureLabel, '#000000', 0);
//             pressureLabelMesh.position.copy(nodeWorldPos);
//             pressureLabelMesh.position.y += 0.25;  // ⬆️ Поднимаем выше (было 0.25)
//             Engine.scene.add(pressureLabelMesh);
            
//             // Для оросителей добавляем расход
//             if (data.type === 'sprinkler') {
//                 const flowLabel = `${data.sprinkler_flow_l_s.toFixed(3)} л/с`;
//                 const flowLabelMesh = createTextLabel(flowLabel, '#000000', 0);
//                 flowLabelMesh.position.copy(nodeWorldPos);
//                 flowLabelMesh.position.y -= 0.6;  // Чуть ниже давления
//                 Engine.scene.add(flowLabelMesh);
                
//                 if (data.pressure_m < 10) {
//                     pressureLabelMesh.material.color.set('#000000');
//                 }
//             } 
//             // Для источников
//             else if (data.type === 'source') {
//                 const sourceFlowLabel = `${Math.abs(result.summary.total_flow_l_s).toFixed(3)} л/с`;
//                 const sourceFlowLabelMesh = createTextLabel(sourceFlowLabel, '#000000', 0);
//                 sourceFlowLabelMesh.position.copy(nodeWorldPos);
//                 sourceFlowLabelMesh.position.y += 0.4;  // Чуть ниже давления
//                 Engine.scene.add(sourceFlowLabelMesh);
//             }
            
//             nodesCount++;
//         }
//     }

//     // 3. Добавляем метки РАСХОДА и СТРЕЛКИ НАПРАВЛЕНИЯ к ТРУБАМ (Edge)
//     for (const [uuid, data] of Object.entries(result.edges)) {
//         const edgeObj = STATE.Three_D_objects.find(
//             obj => obj.uuid.toLowerCase() === uuid.toLowerCase() && obj.type === 'Edge'
//         );

//         if (edgeObj && edgeObj.start_node && edgeObj.end_node) {
//             // Мировые координаты начала и конца трубы
//             const startWorld = new THREE.Vector3();
//             const endWorld = new THREE.Vector3();
//             edgeObj.start_node.getWorldPosition(startWorld);
//             edgeObj.end_node.getWorldPosition(endWorld);

//             // Середина трубы
//             const midWorld = new THREE.Vector3().lerpVectors(startWorld, endWorld, 0.5);

//             // Текстовая метка расхода — рядом со стрелкой (чуть ниже трубы)
//             const flowValue = Math.abs(data.flow_l_s);
//             const labelText = `${flowValue.toFixed(3)} л/с`;
//             const label = createTextLabel(labelText, '#000000', 0);
//             label.position.copy(midWorld);
//             label.position.y -= 0.25;  // ️ Опускаем ниже трубы (рядом со стрелкой)
//             Engine.scene.add(label);

//             // ============================================================
//             // СТРЕЛКА НАПРАВЛЕНИЯ ТЕЧЕНИЯ
//             // ============================================================
//             const isReverse = (data.direction === 'reverse');
//             // const arrowColor = '#0f1379';
//             const arrowColor = '#006400';
            
//             const flowArrow = createFlowArrow(
//                 startWorld, 
//                 endWorld, 
//                 isReverse, 
//                 arrowColor
//             );
//             Engine.scene.add(flowArrow);

//             if (isReverse) {
//                 console.log(`⚠️ Труба ${uuid}: ОБРАТНОЕ направление течения`);
//             }

//             edgesCount++;
//         }
//     }

//     console.log(`✅ ВИЗУАЛИЗАЦИЯ ЗАВЕРШЕНА! Добавлено меток: узлов=${nodesCount}, труб=${edgesCount}`);

//     alert(
//     `✅ Расчет успешно завершен!\n` +
//     `Давление насоса: ${result.summary.source_pressure_m.toFixed(3)} м\n` +
//     `Добавлено меток: ${nodesCount + edgesCount}\n\n` +
//     `⏱️ Время расчета (всего): ${result.summary.timing.total_s.toFixed(4)} сек\n` +
//     `  • Этап 1: ${result.summary.timing.stage1_s.toFixed(4)} сек\n` +
//     `  • Поиск источника: ${result.summary.timing.source_search_s.toFixed(4)} сек\n` +
//     `  • Финальное решение: ${result.summary.timing.final_solve_s.toFixed(4)} сек\n\n` +
//     `📊 Невязки:\n` +
//     `  • Норма невязки: ${result.summary.residual_norm.toExponential(4)}\n` +
//     `  • Макс. невязка: ${result.summary.max_residual.toExponential(4)}`
// );

// }

// function visualizeResults(result) {
//     console.log('🚀 Начинаем визуализацию...');
    
//     // Очищаем битые ссылки перед работой
//     cleanSceneOrphans();
    
//     // Очищаем старые метки
//     clearCalculationLabels();

//     let nodesCount = 0;
//     let edgesCount = 0;

//     // =========================================================================
//     // 2. Добавляем метки к УЗЛАМ (Node / Source / Sprinkler)
//     // =========================================================================
//     for (const [uuid, data] of Object.entries(result.nodes)) {
//         const nodeObj = STATE.Three_D_objects.find(
//             obj => obj.uuid.toLowerCase() === uuid.toLowerCase() && 
//                 (obj.type === 'Node' || obj.type === 'Source' || obj.type === 'Sprinkler')
//         );

//         if (nodeObj) {
//             const nodeWorldPos = new THREE.Vector3();
//             nodeObj.getWorldPosition(nodeWorldPos);
            
//             // --- 1. ДАВЛЕНИЕ ---
//             const pressureLabel = `${data.pressure_m.toFixed(3)} м вод. ст.`;
//             const pressureLabelMesh = createTextLabel(pressureLabel, '#000000', 0);
//             pressureLabelMesh.name = 'PressureLabel'; 
//             pressureLabelMesh.visible = STATE.showLabelsPressure; 
//             pressureLabelMesh.position.copy(nodeWorldPos);
//             pressureLabelMesh.position.y += 0.25;
//             Engine.scene.add(pressureLabelMesh);
            
//             // --- 2. РАСХОД (для оросителей) ---
//             // Используем toLowerCase() для надежной проверки типа
//             if (data.type && data.type.toLowerCase() === 'sprinkler') {
//                 nodeObj.updateFlow(data.sprinkler_flow_l_s || 0);
                
//                 // Старая логика для спрайтов (если она еще используется)
//                 const flowLabelMesh = createTextLabel(`${(data.sprinkler_flow_l_s || 0).toFixed(3)} л/с`, '#000000', 0);
//                 flowLabelMesh.name = 'FlowLabel'; 
//                 flowLabelMesh.visible = STATE.showLabelsMassFlowRate; 
//                 flowLabelMesh.position.copy(nodeWorldPos);
//                 flowLabelMesh.position.y -= 0.6;
//                 Engine.scene.add(flowLabelMesh);
                
//                 if (data.pressure_m < 10) {
//                     // pressureLabelMesh.material.color.set('#ff0000'); // Если нужно
//                 }
//             } 
//             // --- 3. РАСХОД (для источников) ---
//             else if (data.type && data.type.toLowerCase() === 'source') {
//                 nodeObj.updateFlow(Math.abs(result.summary.total_flow_l_s) || 0);
                
//                 const sourceFlowLabelMesh = createTextLabel(`${(Math.abs(result.summary.total_flow_l_s) || 0).toFixed(3)} л/с`, '#000000', 0);
//                 sourceFlowLabelMesh.name = 'FlowLabel'; 
//                 sourceFlowLabelMesh.visible = STATE.showLabelsMassFlowRate;
//                 sourceFlowLabelMesh.position.copy(nodeWorldPos);
//                 sourceFlowLabelMesh.position.y += 0.4;
//                 Engine.scene.add(sourceFlowLabelMesh);
//             }

//             // --- 4. СКОРОСТЬ (в узле, если поле есть в ответе сервера) ---
//             if (data.velocity_m_s !== undefined) {
//                 const velocityLabel = `${data.velocity_m_s.toFixed(2)} м/с`;
//                 const velocityLabelMesh = createTextLabel(velocityLabel, '#0000ff', 0);
//                 velocityLabelMesh.name = 'VelocityLabel';
//                 velocityLabelMesh.visible = STATE.showLabelsVelocity;
//                 velocityLabelMesh.position.copy(nodeWorldPos);
//                 velocityLabelMesh.position.y -= 1.2; // Размещаем ниже расхода
//                 Engine.scene.add(velocityLabelMesh);
//             }
            
//             nodesCount++;
//         }
//     }

//        // =========================================================================
//     // 3. Обновляем результаты РАСХОДА и СКОРОСТИ в объектах ТРУБ (Edge)
//     // =========================================================================
//     for (const [uuid, data] of Object.entries(result.edges)) {
//         const edgeObj = STATE.Three_D_objects.find(
//             obj => obj.uuid.toLowerCase() === uuid.toLowerCase() && obj.type === 'Edge'
//         );

//         if (edgeObj) {
//             // ✅ МАГИЯ: Просто передаем данные в объект, он сам обновит свои метки!
//             const flow = Math.abs(data.flow_l_s || data.massflowrate || 0);
//             const velocity = data.velocity_m_s || data.velocity || 0;
            
//             edgeObj.updateResults(flow, velocity);
//             edgesCount++;
//         }
//     }

//     console.log(`✅ ВИЗУАЛИЗАЦИЯ ЗАВЕРШЕНА! Добавлено меток: узлов=${nodesCount}, труб=${edgesCount}`);

//     alert(
//         `✅ Расчет успешно завершен!\n` +
//         `Давление насоса: ${result.summary.source_pressure_m.toFixed(3)} м\n` +
//         `Добавлено меток: ${nodesCount + edgesCount}\n\n` +
//         `⏱️ Время расчета (всего): ${result.summary.timing.total_s.toFixed(4)} сек\n` +
//         `  • Этап 1: ${result.summary.timing.stage1_s.toFixed(4)} сек\n` +
//         `  • Поиск источника: ${result.summary.timing.source_search_s.toFixed(4)} сек\n` +
//         `  • Финальное решение: ${result.summary.timing.final_solve_s.toFixed(4)} сек\n\n` +
//         `📊 Невязки:\n` +
//         `  • Норма невязки: ${result.summary.residual_norm.toExponential(4)}\n` +
//         `  • Макс. невязка: ${result.summary.max_residual.toExponential(4)}`
//     );
// }

function visualizeResults(result) {
    console.log('🚀 Начинаем визуализацию...');
    
    // 1. Очищаем битые ссылки и старые метки перед работой
    cleanSceneOrphans();
    clearCalculationLabels();

    // ВКЛЮЧАЕМ ВСЕ ТРИ ФЛАГА СРАЗУ
    STATE.showLabelsPressure = true;
    STATE.showLabelsMassFlowRate = true;
    STATE.showLabelsVelocity = true;

    // Обновляем состояние кнопок (делаем их активными)
    updateToggleButtonState('btnTogglePressure', true);
    updateToggleButtonState('btnToggleFlow', true);
    updateToggleButtonState('btnToggleVelocity', true);


    // Удаляем старые 3D-стрелки из всех труб перед новым расчетом
    STATE.Three_D_objects.forEach((obj) => {
        if (obj.type === "Edge" && obj._flowArrow) {
            obj.remove(obj._flowArrow);
            obj._flowArrow = null;
        }
    });

    let nodesCount = 0;
    let edgesCount = 0;

    // =========================================================================
    // 2. Обновляем данные и метки в УЗЛАХ (Node / Source / Sprinkler)
    // =========================================================================
    for (const [uuid, data] of Object.entries(result.nodes)) {
        const nodeObj = STATE.Three_D_objects.find(
            obj => obj.uuid.toLowerCase() === uuid.toLowerCase() && 
                (obj.type === 'Node' || obj.type === 'Source' || obj.type === 'Sprinkler')
        );

        if (nodeObj) {
            // ✅ Передаем данные в новый класс Node_new
            nodeObj.updatePressure(data.pressure_m || 0);
            
            if (data.type && data.type.toLowerCase() === 'sprinkler') {
                nodeObj.updateFlow(data.sprinkler_flow_l_s || 0);
            } else if (data.type && data.type.toLowerCase() === 'source') {
                nodeObj.updateFlow(Math.abs(result.summary.total_flow_l_s) || 0);
            }

            // ✅ Принудительно обновляем видимость и позиции меток (давление сверху, расход снизу)
            if (typeof nodeObj._updateLabelsVisibility === "function") {
                nodeObj._updateLabelsVisibility();
            }

            nodesCount++;
        }
    }

    // =========================================================================
    // 3. Обновляем результаты РАСХОДА, СКОРОСТИ и СТРЕЛОК в объектах ТРУБ (Edge)
    // =========================================================================
    for (const [uuid, data] of Object.entries(result.edges)) {
        const edgeObj = STATE.Three_D_objects.find(
            obj => obj.uuid.toLowerCase() === uuid.toLowerCase() && obj.type === 'Edge'
        );

        if (edgeObj) {
            // ✅ Берем значения и сразу переводим в модуль для отображения
            const absFlow = Math.abs(data.flow_l_s || data.massflowrate || 0);
            const absVel = Math.abs(data.velocity_m_s || data.velocity || 0);
            
            edgeObj.massflowrate = absFlow;
            edgeObj.velocity = absVel;
            
            // ✅ Направление стрелки определяем по флагу "reverse" от бэкенда
            edgeObj.flowDirection = data.direction === "reverse" ? -1 : 1;

            if (!edgeObj.uiGroup) {
                edgeObj.createUI();
            }
            
            // ✅ Пересоздаем стрелку (она сама проверит flowDirection)
            edgeObj.createFlowArrow(); 
            edgeObj.updateDOMValues(); 
            
            edgesCount++;
        }
    }

    console.log(`✅ ВИЗУАЛИЗАЦИЯ ЗАВЕРШЕНА! Узлов: ${nodesCount}, труб: ${edgesCount}`);

    alert(
        `✅ Расчет успешно завершен!\n` +
        `Давление насоса: ${result.summary.source_pressure_m.toFixed(3)} м\n` +
        `Добавлено меток: ${nodesCount + edgesCount}\n\n` +
        `⏱️ Время расчета (всего): ${result.summary.timing.total_s.toFixed(4)} сек\n` +
        `  • Этап 1: ${result.summary.timing.stage1_s.toFixed(4)} сек\n` +
        `  • Поиск источника: ${result.summary.timing.source_search_s.toFixed(4)} сек\n` +
        `  • Финальное решение: ${result.summary.timing.final_solve_s.toFixed(4)} сек\n\n` +
        `📊 Невязки:\n` +
        `  • Норма невязки: ${result.summary.residual_norm.toExponential(4)}\n` +
        `  • Макс. невязка: ${result.summary.max_residual.toExponential(4)}`
    );
}

// Функция для проверки структуры STATE.Three_D_objects
function checkSceneStructure() {
    console.log('=== ПРОВЕРКА СЦЕНЫ ===');
    console.log('Всего объектов в STATE.Three_D_objects:', STATE.Three_D_objects.length);
    
    const nodes = STATE.Three_D_objects.filter(obj => 
        obj.type === 'Node' || obj.type === 'Source' || obj.type === 'Sprinkler'
    );
    const edges = STATE.Three_D_objects.filter(obj => obj.type === 'Edge');
    
    console.log('Узлов:', nodes.length);
    console.log('Труб:', edges.length);
    
    if (nodes.length > 0) {
        console.log('Пример UUID первого узла:', nodes[0].uuid);
        console.log('Тип первого узла:', nodes[0].type);
    }
    if (edges.length > 0) {
        console.log('Пример UUID первой трубы:', edges[0].uuid);
    }
}

// ============================================================================
// 4. Функция создания стрелки направления течения (КОНУС ПО ОСИ ТРУБЫ)
// ============================================================================

function createFlowArrow(startWorld, endWorld, isReverse = false, color = '#006400') {
    // 1. Определяем направление потока
    const from = isReverse ? endWorld.clone() : startWorld.clone();
    const to = isReverse ? startWorld.clone() : endWorld.clone();
    
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    
    // 2. Точный центр трубы
    const midPoint = new THREE.Vector3().lerpVectors(startWorld, endWorld, 0.5);

    // 3. Размеры конуса (уменьшенные для лучшего вида)
    const pipeLength = startWorld.distanceTo(endWorld);
    // const coneHeight = Math.min(pipeLength * 0.15, 0.8); // Высота конуса (25% длины трубы, макс 0.8м)
    const coneHeight = Math.min(0.2, 0.2); 
    const coneRadius = coneHeight * 0.25;                 // Радиус основания (половина высоты)

    // 4. Создаём геометрию конуса (32 сегмента для гладкости)
    const geometry = new THREE.ConeGeometry(coneRadius, coneHeight, 128);
    
    // 5. Материал
    const material = new THREE.MeshBasicMaterial({ 
        color: color
        // transparent: true,
        // opacity: 0.85
    });

    // 6. Создаём меш
    const cone = new THREE.Mesh(geometry, material);

    // 7. Позиционируем в центре трубы
    cone.position.copy(midPoint);

    // 8. ПОВОРОТ КОНУСА ПО НАПРАВЛЕНИЮ ТРУБЫ
    // ConeGeometry по умолчанию смотрит вверх (0, 1, 0)
    // Поворачиваем так, чтобы ось Y конуса совпала с direction
    const yAxis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(yAxis, direction);
    cone.setRotationFromQuaternion(quaternion);

    // 9. Небольшое смещение перпендикулярно трубе, чтобы конус не сливался с ней
    // Находим вектор, перпендикулярный направлению
    const upVector = new THREE.Vector3(0, 1, 0);
    if (Math.abs(direction.dot(upVector)) > 0.9) {
        upVector.set(0, 0, 1); // Если труба вертикальна, используем Z
    }
    const offsetDir = new THREE.Vector3().crossVectors(direction, upVector).normalize();
    
    // Если cross product дал ноль (труба строго по Z), берем X
    if (offsetDir.length() < 0.01) {
        offsetDir.set(1, 0, 0);
    }
    
    // Сдвигаем конус на 0.12 м перпендикулярно трубе
    cone.position.add(offsetDir.multiplyScalar(0));

    cone.name = 'FlowArrow';

    return cone;
}

// // ============================================================================
// // ЭКСПОРТ ДАННЫХ СЕТИ В JSON
// // ============================================================================
// function exportToJSON() {
//     // Собираем данные из сцены
//     const Data_base = {
//         Node: [],
//         Edge: [],
//         PRESSURE_TARGET: 19.17  // Целевое давление по умолчанию
//     };
    
//     Engine.scene.traverse((child) => {    
//         if (typeof child.add_list === 'function') {
//             if (child.type === 'Edge' || child.isEdgeGroup) {
//                 // Для групп берем толстую трубу
//                 const edge = child.isEdgeGroup ? 
//                     child.children.find(m => m.name === 'thickPipe') : child;
                
//                 if (edge && typeof edge.add_list === 'function') {
//                     Data_base.Edge.push(edge.add_list());
//                 }
//             }
//             else {
//                 const properties = child.add_list();
//                 Data_base.Node.push(properties);
//             }
//         }       
//     });
    
//     console.log("📦 Данные для экспорта:", Data_base);
    
//     // Создаем JSON-строку с форматированием
//     const jsonString = JSON.stringify(Data_base, null, 2);
    
//     // Создаем Blob и ссылку для скачивания
//     const blob = new Blob([jsonString], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
    
//     // Создаем временную ссылку
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `network_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    
//     // Имитируем клик
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
    
//     // Освобождаем URL
//     URL.revokeObjectURL(url);
    
//     console.log("✅ JSON-файл успешно экспортирован");
    
//     // Показываем уведомление
//     if (typeof Utils !== 'undefined' && Utils.showStatus) {
//         Utils.showStatus('JSON-файл экспортирован');
//     }
// }





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
        Utils.showStatus('✅ Проект успешно сохранен');
    } else {
        console.log("✅ Проект успешно сохранен");
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
    console.log("🧹 Сцена очищена для загрузки нового проекта");
}

// 5.3. Главная функция загрузки из JSON
function loadProjectFromJSON(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            console.log("📦 Данные для загрузки:", data);

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

                    // ✅ Node_new сам нарисует стрелку при создании, если typeName === 'Sprinkler'
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
                        
                        STATE.Three_D_objects.push(edge);
                    } else {
                        console.warn(`⚠️ Не найдены узлы для трубы: start=${ed.start_node}, end=${ed.end_node}`);
                    }
                });
            }

            // 5. Обновляем глобальные координаты и дерево
            if (typeof update_Node_XYZ === 'function') update_Node_XYZ();
            if (typeof updateTreeUI === 'function') updateTreeUI();

            console.log("✅ Проект успешно загружен!");
            if (typeof Utils !== 'undefined' && Utils.showStatus) {
                Utils.showStatus('✅ Проект успешно загружен');
            } else {
                alert("✅ Проект успешно загружен!");
            }

        } catch (error) {
            console.error("❌ Ошибка при парсинге JSON:", error);
            alert("Ошибка при чтении файла. Убедитесь, что это корректный JSON проекта.");
        }
    };

    reader.readAsText(file);
}

// // ============================================================================
// // 6. ПРИВЯЗКА СОБЫТИЙ К КНОПКАМ
// // ============================================================================
// document.addEventListener("DOMContentLoaded", () => {
//     // Кнопка Сохранить
//     const btnSave = document.getElementById("menuSave");
//     if (btnSave) {
//         btnSave.onclick = () => exportToJSON();
//     }

//     // Кнопка Открыть
//     const btnOpen = document.getElementById("menuOpen");
//     const fileInput = document.getElementById("fileInputJSON");

//     if (btnOpen && fileInput) {
//         btnOpen.onclick = () => {
//             fileInput.click(); // Открываем системное окно выбора файла
//         };

//         fileInput.onchange = (event) => {
//             const file = event.target.files[0];
//             if (file) {
//                 loadProjectFromJSON(file);
//                 // Сбрасываем input, чтобы можно было загрузить тот же файл повторно при необходимости
//                 fileInput.value = ''; 
//             }
//         };
//     }
    
//     // Кнопка Экспорт (если она отличается от Сохранить)
//     const btnExport = document.getElementById("menuExportJSON");
//     if (btnExport) {
//         btnExport.onclick = () => exportToJSON();
//     }
// });




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
            console.log("📂 Выбран файл для загрузки:", file.name);
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
// ПРИНУДИТЕЛЬНОЕ ИСПРАВЛЕНИЕ ВИДИМОСТИ СЦЕНЫ (Гарантия отображения)
// ============================================================================
// window.addEventListener('load', () => {
//     setTimeout(() => {
//         // 1. Гарантированно скрываем экран загрузки, если он "завис"
//         const loadingEl = document.getElementById('loading');
//         if (loadingEl) {
//             loadingEl.classList.add('hidden');
//         }

//         // 2. Проверяем, инициализирован ли Engine
//         if (typeof Engine !== 'undefined' && Engine.scene) {
//             // Принудительно задаем светлый фон сцены (убирает черноту)
//             Engine.scene.background = new THREE.Color(0xf5f5f5);
            
//             // 3. Проверяем наличие сетки и осей, добавляем их, если нет
//             let hasGrid = false;
//             let hasAxes = false;
            
//             Engine.scene.traverse((child) => {
//                 if (child.type === 'GridHelper') hasGrid = true;
//                 if (child.type === 'AxesHelper') hasAxes = true;
//             });

//             if (!hasGrid) {
//                 const gridHelper = new THREE.GridHelper(50, 50, 0xcccccc, 0xe0e0e0);
//                 Engine.scene.add(gridHelper);
//                 console.log("✅ Сетка добавлена принудительно");
//             }
            
//             if (!hasAxes) {
//                 const axesHelper = new THREE.AxesHelper(3);
//                 Engine.scene.add(axesHelper);
//                 console.log("✅ Оси координат добавлены принудительно");
//             }

//             // 4. Принудительно обновляем размеры рендера и камеры (на случай сбоев ресайза)
//             if (Engine.renderer && Engine.camera) {
//                 Engine.renderer.setSize(window.innerWidth, window.innerHeight);
//                 Engine.camera.aspect = window.innerWidth / window.innerHeight;
//                 Engine.camera.updateProjectionMatrix();
//                 console.log("✅ Размеры канваса обновлены");
//             }
//         } else {
//             console.warn("⚠️ Объект Engine или Engine.scene не найден при загрузке!");
//         }
//     }, 500); // Задержка 500мс дает время на полную инициализацию Engine из других файлов
// });

// ============================================================================
// ПРИНУДИТЕЛЬНОЕ ИСПРАВЛЕНИЕ ВИДИМОСТИ СЦЕНЫ (Только загрузка и ресайз)
// ============================================================================
window.addEventListener('load', () => {
    setTimeout(() => {
        // 1. Гарантированно скрываем экран загрузки, если он "завис"
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }

        // 2. Проверяем, инициализирован ли Engine
        if (typeof Engine !== 'undefined' && Engine.scene && Engine.renderer && Engine.camera) {
            
            // ✅ Мы УДАЛИЛИ отсюда принудительное создание осей и сетки!
            // Теперь они управляются только через world.js и STATE.showGrid
            
            // 3. Принудительно обновляем размеры рендера и камеры (на случай сбоев ресайза при загрузке)
            Engine.renderer.setSize(window.innerWidth, window.innerHeight);
            Engine.camera.aspect = window.innerWidth / window.innerHeight;
            Engine.camera.updateProjectionMatrix();
            
            console.log("✅ Сцена успешно инициализирована и готова к работе");
        } else {
            console.warn("⚠️ Объект Engine или сцена не найдены при загрузке!");
        }
    }, 500); // Задержка 500мс дает время на полную инициализацию Engine из других файлов
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

// 5.2. Функция полной очистки сцены перед загрузкой
// function clearSceneForLoad() {
//     const toRemove = [];
//     Engine.scene.traverse((child) => {
//         // Собираем все узлы и трубы для удаления
//         if (child.type === 'Node' || child.type === 'Source' || child.type === 'Sprinkler' || child.type === 'Edge') {
//             toRemove.push(child);
//         }
//     });

//     toRemove.forEach((obj) => {
//         // Открепляем от родителя
//         if (obj.parent) {
//             obj.parent.remove(obj);
//         } else {
//             Engine.scene.remove(obj);
//         }
        
//         // Очищаем память (Geometry и Material)
//         if (obj.geometry) obj.geometry.dispose();
//         if (obj.material) {
//             if (Array.isArray(obj.material)) {
//                 obj.material.forEach(m => m.dispose());
//             } else {
//                 obj.material.dispose();
//             }
//         }
//     });

//     // Полностью очищаем массив отслеживаемых объектов
//     STATE.Three_D_objects = [];
//     console.log("🧹 Сцена очищена для загрузки нового проекта");
// }


function loadProjectFromJSOssN(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            console.log("📦 Данные для загрузки:", data);

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

                    // ✅ Восстанавливаем стрелку ТОЛЬКО для оросителей
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

            console.log("✅ Проект успешно загружен!");
            if (typeof Utils !== 'undefined' && Utils.showStatus) {
                Utils.showStatus('✅ Проект успешно загружен');
            } else {
                alert("✅ Проект успешно загружен!");
            }

        } catch (error) {
            console.error("❌ Ошибка при парсинге JSON:", error);
            alert("Ошибка при чтении файла. Убедитесь, что это корректный JSON проекта.");
        }
    };

    reader.readAsText(file);
}


// ============================================================================
// ФУНКЦИЯ ОБНОВЛЕНИЯ ВИДИМОСТИ ВСЕХ МЕТOK
// ============================================================================
function updateLabelsVisibility() {
    Engine.scene.traverse((child) => {
        // Давление
        if (child.name === 'PressureLabel') {
            child.visible = STATE.showLabelsPressure;
        }
        // Расход (текст) и стрелки направления
        if (child.name === 'FlowLabel' || child.name === 'FlowArrow') {
            child.visible = STATE.showLabelsMassFlowRate;
        }
        // Скорость (если добавите позже)
        if (child.name === 'VelocityLabel') {
            child.visible = STATE.showLabelsVelocity;
        }
    });

    // Обновляем состояние кнопок в интерфейсе (опционально, для подсветки активных)
    updateToggleButtonState('btnTogglePressure', STATE.showLabelsPressure);
    updateToggleButtonState('btnToggleFlow', STATE.showLabelsMassFlowRate);
    updateToggleButtonState('btnToggleVelocity', STATE.showLabelsVelocity);
}

// Вспомогательная функция для визуального состояния кнопок
function updateToggleButtonState(btnId, isActive) {
    const btn = document.getElementById(btnId);
    if (btn) {
        if (isActive) {
            // ✅ ТОЛЬКО добавляем класс. Текст и иконки внутри кнопки НЕ трогаем!
            btn.classList.add('active');
        } else {
            // ✅ ТОЛЬКО убираем класс. Текст и иконки внутри кнопки НЕ трогаем!
            btn.classList.remove('active');
        }
    }
}

// function toggleSpecificLabel(type) {
//     // Переключаем флаг
//     if (type === 'pressure') STATE.showLabelsPressure = !STATE.showLabelsPressure;
//     if (type === 'flow') STATE.showLabelsMassFlowRate = !STATE.showLabelsMassFlowRate;
//     if (type === 'velocity') STATE.showLabelsVelocity = !STATE.showLabelsVelocity;

//     console.log(`🔘 Переключение: ${type} = `, 
//         type === 'pressure' ? STATE.showLabelsPressure : 
//         type === 'flow' ? STATE.showLabelsMassFlowRate : 
//         STATE.showLabelsVelocity
//     );

//     // Обновляем метки для всех труб
//     STATE.Three_D_objects.forEach(obj => {
//         if (obj.type === 'Edge') {
//             obj.updateDOMValues(); // Этот метод сам решит, что показать
//         }
//     });

//     // Обновляем старые метки (для узлов)
//     Engine.scene.traverse((child) => {
//         if (child.name === 'PressureLabel') child.visible = STATE.showLabelsPressure;
//         if (child.name === 'FlowLabel') child.visible = STATE.showLabelsMassFlowRate;
//         if (child.name === 'VelocityLabel') child.visible = STATE.showLabelsVelocity;
//     });

//     // Обновляем состояние кнопок
//     updateToggleButtonState('btnTogglePressure', STATE.showLabelsPressure);
//     updateToggleButtonState('btnToggleFlow', STATE.showLabelsMassFlowRate);
//     updateToggleButtonState('btnToggleVelocity', STATE.showLabelsVelocity);
// }


// ============================================================================
// РЕЖИМ МАССОВОГО РЕДАКТИРОВАНИЯ ДЛИН (Через CSS2DRenderer)
// ============================================================================

// function toggleLengthEditMode() {
//     STATE.isEditingLengths = !STATE.isEditingLengths;
//     const btn = document.getElementById('btnToggleLengthEdit');

//     if (STATE.isEditingLengths) {
//         if (btn) btn.classList.add('active');
        
//         STATE.Three_D_objects.forEach(obj => {
//             if (obj.type === 'Edge') {
//                 // 1. Создаем HTML-обертку и инпут
//                 const div = document.createElement('div');
//                 div.className = 'length-inline-input'; // Убедитесь, что этот класс есть в CSS
                
//                 const input = document.createElement('input');
//                 input.type = 'number';
//                 input.step = '0.1';
//                 input.min = '0.1';
//                 input.value = obj.Length.toFixed(2);
                
//                 // 2. Обработчик изменения
//                 input.addEventListener('change', (e) => {
//                     const newLength = parseFloat(e.target.value);
//                     if (newLength > 0.1) {
//                         applyNewLengthToEdge(obj, newLength);
//                         e.target.value = obj.Length.toFixed(2);
//                     } else {
//                         alert("Длина должна быть больше 0.1 м");
//                         e.target.value = obj.Length.toFixed(2);
//                     }
//                 });

//                 // Отключаем вращение камеры при клике в инпут
//                 input.addEventListener('focus', () => { Engine.controls.enabled = false; });
//                 input.addEventListener('blur', () => { Engine.controls.enabled = true; });

//                 div.appendChild(input);

//                 // 3. ✅ МАГИЯ: Превращаем HTML в 3D-объект и привязываем к центру трубы
//                 const label = new CSS2DObject(div);
//                 label.position.set(0, 0, 0); // Локальный центр трубы
                
//                 // Сохраняем ссылку, чтобы потом удалить
//                 obj.lengthInputLabel = label; 
                
//                 Engine.scene.add(label);
//             }
//         });
        
//     } else {
//         if (btn) btn.classList.remove('active');
        
//         // Очищаем все инпуты со сцены
//         STATE.Three_D_objects.forEach(obj => {
//             if (obj.type === 'Edge' && obj.lengthInputLabel) {
//                 Engine.scene.remove(obj.lengthInputLabel);
//                 obj.lengthInputLabel = null;
//             }
//         });
//     }
// }

// // ============================================================================
// // РЕЖИМ МАССОВОГО РЕДАКТИРОВАНИЯ ДЛИН (УЛЬТРА-ПРОСТАЯ ВЕРСИЯ)
// // ============================================================================
// function toggleLengthEditMode(event) {
//   if (event) {
//     event.stopPropagation();
//     event.preventDefault();
//   }

//   STATE.isEditingLengths = !STATE.isEditingLengths;
//   const btn = document.getElementById("btnToggleLengthEdit");
//   if (btn) {
//     STATE.isEditingLengths ? btn.classList.add("active") : btn.classList.remove("active");
//   }

//   console.log("🔘 Режим редактирования длин:", STATE.isEditingLengths);
//   console.log("📦 Всего труб в STATE:", STATE.Three_D_objects.filter(o => o.type === 'Edge').length);

//   // Принудительно обновляем ВСЕ трубы
//   let count = 0;
//   STATE.Three_D_objects.forEach((obj) => {
//     if (obj.type === "Edge") {
//       console.log(`🔍 Обработка трубы #${count + 1}:`, obj.uuid);
      
//       if (!obj.uiGroup) {
//         console.log("  ⚠️ UI не создан, создаем...");
//         obj.createUI();
//       }
      
//       console.log("  📏 Вызываем updateDOMValues...");
//       obj.updateDOMValues();
      
//       // Проверяем, что метод существует
//       if (typeof obj.updateDOMValues !== 'function') {
//         console.error("  ❌ Метод updateDOMValues НЕ НАЙДЕН!");
//       } else {
//         console.log("  ✅ Метод updateDOMValues вызван");
//       }
      
//       count++;
//     }
//   });
  
//   console.log(`✅ Обновлено ${count} труб`);
  
//   // Принудительно сообщаем рендереру об изменениях
//   if (window.Engine && window.Engine.labelRenderer) {
//     window.Engine.labelRenderer.forceRender = true;
//   }
// }


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

  console.log("🔘 Режим редактирования длин:", STATE.isEditingLengths);

  STATE.Three_D_objects.forEach((obj) => {
    if (obj.type === "Edge") {
      if (!obj.uiGroup) obj.createUI();
      obj.updateDOMValues(); // Этот метод теперь жестко меняет style.display
    }
  });
}



// // Делаем функцию доступной глобально (на всякий случай)
// window.toggleLengthEditMode = toggleLengthEditMode;

// 3. Обработка изменения длины
// function handleLengthInputChange(event, edgeObj) {
//     const newLength = parseFloat(event.target.value);
    
//     if (newLength > 0.1) {
//         // Применяем новую длину напрямую к геометрии
//         applyNewLengthToEdge(edgeObj, newLength);
//         // Обновляем значение в инпуте на случай округлений
//         event.target.value = edgeObj.Length.toFixed(2);
//     } else {
//         alert("Длина должна быть больше 0.1 м");
//         event.target.value = edgeObj.Length.toFixed(2); // Откат
//     }
// }

// 4. Прямое обновление геометрии трубы (аналог edit_pipe_tube, но без зависимости от DOM)
// function applyNewLengthToEdge(edge, newLength) {
//     const start_node = edge.start_node;
//     const end_node = edge.end_node;
    
//     const start_World_Pos = new THREE.Vector3();
//     const end_World_Pos = new THREE.Vector3();
    
//     start_node.getWorldPosition(start_World_Pos);
//     end_node.getWorldPosition(end_World_Pos);
    
//     // Направление от начала к концу
//     const direction_Vector = new THREE.Vector3().subVectors(end_World_Pos, start_World_Pos).normalize();
    
//     // Новая мировая позиция конца
//     const new_World_End = new THREE.Vector3().addVectors(start_World_Pos, direction_Vector.multiplyScalar(newLength));
    
//     // Переводим новую мировую позицию в локальные координаты родителя конечного узла
//     const local_End_Node = new_World_End.clone();
//     if (end_node.parent) {
//         end_node.parent.worldToLocal(local_End_Node);
//     }    
//     end_node.position.copy(local_End_Node);
    
//     // Обновляем матрицы
//     end_node.updateMatrixWorld(true); 
//     start_node.updateMatrixWorld(true);
//     edge.updateMatrixWorld(true);

//     // Пересоздаем геометрию трубы
//     const path_Start = start_World_Pos.clone();
//     const path_End = new_World_End.clone();
//     edge.worldToLocal(path_Start);
//     edge.worldToLocal(path_End);
    
//     const new_Path = new THREE.LineCurve3(path_Start, path_End);
//     edge.geometry.dispose(); 
//     edge.geometry = new THREE.TubeGeometry(new_Path, 64, VisualPipelins.d_pipe_base/2, 12, false);
    
//     // Обновляем свойства объекта
//     edge.Length = newLength;
    
//     // Пересчитываем длины всех труб на сцене (ваша существующая функция)
//     check_position_node_for_edge();
//     checkAllPipelines(); // Проверка коллизий
// }

// function applyNewLengthToEdge(edge, newLength) {
//     const start_node = edge.start_node;
//     const end_node = edge.end_node;
    
//     const start_World_Pos = new THREE.Vector3();
//     const end_World_Pos = new THREE.Vector3();
    
//     start_node.getWorldPosition(start_World_Pos);
//     end_node.getWorldPosition(end_World_Pos);
    
//     const direction_Vector = new THREE.Vector3().subVectors(end_World_Pos, start_World_Pos).normalize();
//     const new_World_End = new THREE.Vector3().addVectors(start_World_Pos, direction_Vector.multiplyScalar(newLength));
    
//     const local_End_Node = new_World_End.clone();
//     if (end_node.parent) {
//         end_node.parent.worldToLocal(local_End_Node);
//     }    
//     end_node.position.copy(local_End_Node);
    
//     end_node.updateMatrixWorld(true); 
//     start_node.updateMatrixWorld(true);
//     edge.updateMatrixWorld(true);

//     const path_Start = start_World_Pos.clone();
//     const path_End = new_World_End.clone();
//     edge.worldToLocal(path_Start);
//     edge.worldToLocal(path_End);
    
//     const new_Path = new THREE.LineCurve3(path_Start, path_End);
//     edge.geometry.dispose(); 
//     edge.geometry = new THREE.TubeGeometry(new_Path, 64, VisualPipelins.d_pipe_base/2, 12, false);
    
//     edge.Length = newLength;
    
//     // ✅ Метки автоматически обновятся, так как они дети трубы!
//     // Никакого пересоздания не нужно!
    
//     check_position_node_for_edge();
//     checkAllPipelines();
// }

// Глобальная функция для изменения длины трубы
window.applyNewLengthToEdge = function(edge, newLength) {
    console.log("📏 Изменение длины трубы:", edge.uuid, "новая длина:", newLength);
    
    const start_node = edge.start_node;
    const end_node = edge.end_node;
    
    const start_World_Pos = new THREE.Vector3();
    const end_World_Pos = new THREE.Vector3();
    
    start_node.getWorldPosition(start_World_Pos);
    end_node.getWorldPosition(end_World_Pos);
    
    const direction_Vector = new THREE.Vector3().subVectors(end_World_Pos, start_World_Pos).normalize();
    const new_World_End = new THREE.Vector3().addVectors(start_World_Pos, direction_Vector.multiplyScalar(newLength));
    
    const local_End_Node = new_World_End.clone();
    if (end_node.parent) {
        end_node.parent.worldToLocal(local_End_Node);
    }    
    end_node.position.copy(local_End_Node);
    
    end_node.updateMatrixWorld(true); 
    start_node.updateMatrixWorld(true);
    edge.updateMatrixWorld(true);

    const path_Start = start_World_Pos.clone();
    const path_End = new_World_End.clone();
    edge.worldToLocal(path_Start);
    edge.worldToLocal(path_End);
    
    const new_Path = new THREE.LineCurve3(path_Start, path_End);
    edge.geometry.dispose(); 
    edge.geometry = new THREE.TubeGeometry(new_Path, 64, VisualPipelins.d_pipe_base/2, 12, false);
    
    edge.Length = newLength;
    
    // ✅ НОВОЕ: Обновляем позиции меток!
    if (typeof edge.updateLabelsPosition === 'function') {
        edge.updateLabelsPosition();
    }
    
    if (typeof check_position_node_for_edge === 'function') {
        check_position_node_for_edge();
    }
    
    if (typeof checkAllPipelines === 'function') {
        checkAllPipelines();
    }
    
    console.log("✅ Длина трубы обновлена:", edge.Length);
};
