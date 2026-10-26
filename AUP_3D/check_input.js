// слушатель для обработки ячейки ввода длины при создании трубопровода
document.getElementById("pbLength").addEventListener("blur", (event) => {
    let value = parseFloat(event.target.value);
        
    if (isNaN(value) || value < 0.1) {
        event.target.value = "0.1"; 
    } 
    // else if (value > 100) {
    //     event.target.value = "100"; 
    // }
});
// слушатель для обработки ячейки ввода длины при создании трубопровода
document.getElementById("pipe_edit").addEventListener("blur", (event) => {
    let value = parseFloat(event.target.value);
        
    if (isNaN(value) || value < 0.1) {
        event.target.value = "0.1"; 
    } 
    // else if (value > 100) {
    //     event.target.value = "100"; 
    // }
});

// Функция заполнения типа трубы 
async function get_load_pipe(type_tube, dn_tube) {    
    let selectPipeTube = document.getElementById(type_tube);
    // console.log("name_cell",name_cell)
    const tubeTypes = await getTubeTypes();    
    // console.log("tubeTypes массив данных", tubeTypes);
    selectPipeTube.innerHTML = "";
    tubeTypes.forEach((tube) => {
        const option = document.createElement("option");
        option.value = tube.id;
        option.textContent = tube.name;
        selectPipeTube.appendChild(option);
    });
    get_load_pbDiameter(selectPipeTube.value, dn_tube);    
}
get_load_pipe("get_tube_pipe", "pbDiameter");
get_load_pipe("get_tube_pipe_sprinkler", "pbDiameter_sprinkler_0");
get_load_pipe("get_tube_pipe_edit", "pbDiameter_edit");
// функция заполнения ДУ для типа труб и сохранени ег освйоств
async function get_load_pbDiameter(TubeTypeValue, dn_tube) {
    const tube_DN = await getTube(TubeTypeValue);
    console.log("tube_DN массив данных",tube_DN);
    let pdDN = document.getElementById(dn_tube);
    if (!pdDN) return;
    pdDN.innerHTML = "";
    tube_DN.forEach((tube) => {
        const option = document.createElement("option");
        option.value = tube.id;
        option.textContent = tube.nom_size;
        option.dataset.k_t = tube.k_t;
        option.dataset.kvelocity = tube.kvelocity;
        pdDN.appendChild(option);
    }); 
    // console.log("TubeTypeValue_11",TubeTypeValue);
    // console.log("dn_tube_11",dn_tube);  
    // id гост на трубы и id списков труб на типоразмеры труб
    if (TubeTypeValue === "1") {
        if (dn_tube.includes("pbDiameter_sprinkler")) {pdDN.value = "6";}
        else {pdDN.value = "10";}        
    }
    else {
            if (dn_tube.includes("pbDiameter_sprinkler")) {pdDN.value = "25";}
            else {pdDN.value = "29";}
        }
    // pdDN.value = "6";    
    pdDN.dispatchEvent(new Event("change")); 
}
// // функция для заполнения и сохраенения спсика труб для спринклеров
// async function get_load_pipe_for_sprinkler(type_tube) {    
//     let selectPipeTube = document.getElementById(type_tube);
//     // console.log("name_cell",name_cell)
//     const tubeTypes = await getTubeTypes();    
//     // console.log("tubeTypes массив данных", tubeTypes);
//     selectPipeTube.innerHTML = "";
//     tubeTypes.forEach((tube) => {
//         const option = document.createElement("option");
//         option.value = tube.id;
//         option.textContent = tube.name;
//         selectPipeTube.appendChild(option);
//     });
//     // console.log("tubeTypes_for_sprinkler",tubeTypes);
//     // get_load_pbDiameter_for_sprinkler(type_tube);
//     // Tube_data = [];
//     // Tube_data = tubeTypes;
//     // get_load_pbDiameter_for_sprinkler(Tube_data);
//     // get_load_pbDiameter(selectPipeTube.value, dn_tube);    
// }
// async function get_load_pbDiameter_for_sprinkler(type_tube){
//     let pdDN = document.getElementById(type_tube);
//     if (!pdDN) return;
//     const tube_DN = await getTube(TubeTypeValue);
//     pdDN.innerHTML = "";
//     Tube_data = [];
//     // console.log("Tube_data939393",Tube_data);
//     tube_DN.forEach((tube) => {
//         const option = document.createElement("option");
//         option.value = tube.id;
//         option.textContent = tube.nom_size;
//         option.dataset.k_t = tube.k_t;
//         option.dataset.kvelocity = tube.kvelocity;
//         Tube_data.appendChild(option);
//     }); 
//     // console.log("TubeTypeValue_11",TubeTypeValue);
//     // console.log("dn_tube_11",dn_tube);  
//     // id гост на трубы и id списков труб на типоразмеры труб
//     if (TubeTypeValue === "1") {
//         if (dn_tube.includes("pbDiameter_sprinkler")) {pdDN.value = "6";}
//         else {pdDN.value = "10";}        
//     }
//     else {
//             if (dn_tube.includes("pbDiameter_sprinkler")) {pdDN.value = "25";}
//             else {pdDN.value = "29";}
//         }
//     // pdDN.value = "6";    
//     pdDN.dispatchEvent(new Event("change"));
// }
// Cлушатель для выбранного ДУ , вывод свойств
document.getElementById("get_tube_pipe").addEventListener("change", (event) => {
    get_load_pbDiameter(event.target.value, "pbDiameter");   
});
// Cлушатель для выбранного ДУ , вывод свойств
// document.getElementById("get_tube_pipe_sprinkler").addEventListener("change", (event) => {
//     get_load_pbDiameter(event.target.value, "pbDiameter_sprinkler");   
// });
// Cлушатель для выбранного ДУ , вывод свойств
document.getElementById("get_tube_pipe_edit").addEventListener("change", (event) => {
    get_load_pbDiameter(event.target.value, "pbDiameter_edit");   
});


async function get_sprinkler() {
    const sprinkler_select = document.getElementById('get_sprinkler');
    const sprinkler_list = await GetSprinkler();   
    console.log(sprinkler_select, sprinkler_list);


    sprinkler_list.forEach((sprinkler) => {
        const option = document.createElement("option");
        option.value = sprinkler.K;
        option.textContent = sprinkler.name;
        sprinkler_select.appendChild(option);
    });
    STATE.sprinkler_kv=sprinkler_select.value;
}

async function get__Results() {
    const sprinkler_select = document.getElementById('get_results');
    const sprinkler_list = await GetResults();   

    sprinkler_list.forEach((sprinkler) => {
        const option = document.createElement("option");
        option.value = sprinkler.data;
        option.textContent = sprinkler.name;
        sprinkler_select.appendChild(option);
    });
}
async function exportToJSON() {
    const Data_base = {
        Node: [],
        Edge: [],
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
    const save_name = document.getElementById("save_name_structure").value;
    console.log("save_name",save_name)
    if (!save_name || !save_name.trim()) {
        alert("Заполните наименование сборки");
        return;
    }
    else {
        var d =  {
            'name': save_name,
            'data': jsonString
        };
        SaveResults(d);
    }
    

}

function loadProjectFromJSON(data1) {
            const data = JSON.parse(data1);
            clearSceneForLoad();
            const nodeMap = new Map();
            if (data.Node && Array.isArray(data.Node)) {
                data.Node.forEach(n => {
                    const geom = new THREE.SphereGeometry(VisualPipelins.d_node_base / 2, 32, 32);
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

            if (typeof update_Node_XYZ === 'function') update_Node_XYZ();
            if (typeof updateTreeUI === 'function') updateTreeUI();

            console.log("✅ Проект успешно загружен!");
            if (typeof Utils !== 'undefined' && Utils.showStatus) {
                Utils.showStatus('✅ Проект успешно загружен');
            } else {
                alert("✅ Проект успешно загружен!");
            }


}

document.getElementById("get_sprinkler").addEventListener("change", (event) => {
    STATE.sprinkler_kv=event.target.value;
    console.log(STATE.sprinkler_kv);
    Engine.scene.traverse((node) => {
        if (node.name == 'Node_new' && node.type == 'Sprinkler') {
            node.K = STATE.sprinkler_kv;
        }
    });
});

document.getElementById("get_results").addEventListener("click", (event) => {
    loadProjectFromJSON(event.target.value);
    });

get_sprinkler();
get__Results();
