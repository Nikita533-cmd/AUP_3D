// ============================================================
// factory.js — Фабрика для создания 3D-объектов (трубы, ветки, рядки, узлы)
// Зависимости: THREE (глобальный), CONFIG, AXES_SETTINGS, genNodeId (из state.js)
// ============================================================

import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { AXES_SETTINGS, CONFIG, STATE, VisualPipelins } from "./state.js";

export class Node_new extends THREE.Mesh {
  constructor(geometry, material, type) {
    super(geometry, material);
    this.type = type;
    this.name = "Node_new";
    this.X_gl = 10;
    this.Y_gl = 0;
    this.Z_gl = 0;
    this.K = Number(STATE.sprinkler_kv);
    
    // Данные для меток
    this.pressure_m = 0;
    this.flow_l_s = 0;

    // 1. МЕТКА ДАВЛЕНИЯ (над узлом)
    this._pressureSpan = document.createElement("span");
    this._pressureSpan.className = "node-pressure-label";
    this._pressureSpan.style.display = "none";
    
    const pressureDiv = document.createElement("div");
    pressureDiv.className = "node-label-pressure-container";
    pressureDiv.appendChild(this._pressureSpan);
    
    this._pressureObject = new CSS2DObject(pressureDiv);
    this._pressureObject.position.set(0, 0.25, 0); // Над узлом
    this.add(this._pressureObject);

    // 2. МЕТКА РАСХОДА (под стрелкой)
    this._flowSpan = document.createElement("span");
    this._flowSpan.className = "node-flow-label";
    this._flowSpan.style.display = "none";
    
    const flowDiv = document.createElement("div");
    flowDiv.className = "node-label-flow-container";
    flowDiv.appendChild(this._flowSpan);
    
    this._flowObject = new CSS2DObject(flowDiv);
    this._flowObject.position.set(0, -0.6, 0); // Под стрелкой (ниже узла)
    this.add(this._flowObject);
 
    // проверяем, нужно ли рисовать стрелку
    this.updateSprinklerArrow();

    STATE.Three_D_objects.push(this);
  }

  update_Global() {
    const World_Vector = new THREE.Vector3();
    this.getWorldPosition(World_Vector);
    this.X_gl = World_Vector.x;
    this.Y_gl = World_Vector.y;
    this.Z_gl = World_Vector.z;
    return [this.X_gl, this.Y_gl, this.Z_gl];
  }

  add_list() {
    return {
      id: this.uuid,
      type: this.type,
      X_gl: this.X_gl,
      Y_gl: this.Y_gl,
      Z_gl: this.Z_gl,
      K: this.K,
      pressure_m: this.pressure_m,
      flow_l_s: this.flow_l_s,
    };
  }

  // Методы обновления данных
  updatePressure(pressure) {
    this.pressure_m = pressure;
    this._updateLabelsVisibility();
  }

  updateFlow(flow) {
    this.flow_l_s = flow;
    this._updateLabelsVisibility();
  }

  // Единый метод управления видимостью
  _updateLabelsVisibility() {
    const showPressure = typeof STATE !== "undefined" && STATE.showLabelsPressure === true;
    const showFlow = typeof STATE !== "undefined" && STATE.showLabelsMassFlowRate === true;

    // Давление - отображаем НАД узлом
    if (this._pressureSpan) {
      if (showPressure && this.pressure_m > 0) {
        this._pressureSpan.innerText = `P = ${this.pressure_m.toFixed(3)} м`;
        this._pressureSpan.style.display = "inline";
        this._pressureObject.visible = true;
      } else {
        this._pressureSpan.innerText = "";
        this._pressureSpan.style.display = "none";
        this._pressureObject.visible = false;
      }
    }

    // Расход - отображаем ПОД стрелкой (ниже узла)
    if (this._flowSpan) {
      if (showFlow && this.flow_l_s > 0) {
        this._flowSpan.innerText = `Q = ${this.flow_l_s.toFixed(3)} л/с`;
        this._flowSpan.style.display = "inline";
        this._flowObject.visible = true;
      } else {
        this._flowSpan.innerText = "";
        this._flowSpan.style.display = "none";
        this._flowObject.visible = false;
      }
    }
  }


    // ✅ НОВЫЙ МЕТОД: Управляет отображением 3D-стрелки оросителя
  updateSprinklerArrow() {
    // 1. Удаляем старую стрелку, если она есть (и очищаем память)
    const existingArrow = this.getObjectByName('SprinklerArrow');
    if (existingArrow) {
      this.remove(existingArrow);
      existingArrow.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    // 2. Если тип узла "Sprinkler", создаем новую стрелку
    if (this.type === 'Sprinkler') {
      const sprinklerGroup = new THREE.Group();
      sprinklerGroup.name = 'SprinklerArrow';
      
      // Используем размер из VisualPipelins или запасной вариант
      const nodeRadius = (typeof VisualPipelins !== 'undefined' ? VisualPipelins.d_node_base : 0.12) / 2;
      
      // Стержень
      const shaftRadius = nodeRadius * 0.1;
      const shaftHeight = nodeRadius * 2.5;
      const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftHeight, 16);
      const shaft = new THREE.Mesh(shaftGeo, this.material); // Используем материал самого узла
      shaft.position.y = -(shaftHeight / 2);
      
      // Наконечник (конус)
      const headRadius = nodeRadius * 1;
      const headHeight = nodeRadius * 1.5;
      const headGeo = new THREE.ConeGeometry(headRadius, headHeight, 16);
      const head = new THREE.Mesh(headGeo, this.material);
      head.rotation.x = Math.PI; // Поворачиваем вниз
      head.position.y = -(shaftHeight + headHeight / 2);

      sprinklerGroup.add(shaft);
      sprinklerGroup.add(head);
      
      this.add(sprinklerGroup);
    }
  }

}

export class Edge_new extends THREE.Mesh {
  constructor(
    geometry,
    material,
    start_node,
    end_node,
    type,
    Length,
    DN,
    ghost,
    k_t,
    kvelocity,
  ) {
    super(geometry, material);

    this.start_node = start_node;
    this.end_node = end_node;
    this.name = "Edge_new";
    this.type = type;
    this.Length = Length;
    this.DN = DN;
    this.ghost = ghost;
    this.k_t = k_t;
    this.kvelocity = kvelocity;

    // Результаты расчета
    this.massflowrate = 0;
    this.velocity = 0;
    this.flowDirection = 1;

    // Ссылки на DOM-элементы для быстрого обновления без пересоздания
    this.uiGroup = null;
    this._inputLenElement = null;
    this._divFlowElement = null;
    this._divVelElement = null;
    this._flowArrow = null;

    if (typeof STATE !== "undefined" && STATE.Three_D_objects) {
      STATE.Three_D_objects.push(this);
    }
  }

  add_list() {
    return {
      id: this.uuid,
      type: this.type,
      DN: this.DN,
      Length: this.Length,
      start_node: this.start_node.uuid,
      end_node: this.end_node.uuid,
      ghost: this.ghost,
      k_t: this.k_t,
      kvelocity: this.kvelocity,
      massflowrate: this.massflowrate,
      velocity: this.velocity,
    };
  }

  // Полная очистка DOM-элементов без использования ломающегося instanceof  
  destroyUI() {
    if (this.uiGroup) {
      this.uiGroup.traverse((child) => {
        if ((child.isCSS2DObject || child.element) && typeof child.element.remove === "function") {
          child.element.remove();
        }
      });
      this.remove(this.uiGroup);
      this.uiGroup = null;
      this._inputLenElement = null;
      this._divFlowElement = null;
      this._divVelElement = null;
      this._labelLen = null;
      this._labelFlow = null;
      this._labelVel = null;
    }
  }

  createUI() {
    console.log("🔥 ВЫПОЛНЯЕТСЯ НОВЫЙ createUI!");

    if (this.uiGroup) {
      this.updateDOMValues();
      return;
    }

    this.uiGroup = new THREE.Group();
    this.uiGroup.name = "EdgeUI";

    const startPos = new THREE.Vector3();
    const endPos = new THREE.Vector3();
    this.start_node.getWorldPosition(startPos);
    this.end_node.getWorldPosition(endPos);

    const midWorldPos = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
    const midLocalPos = midWorldPos.clone();
    this.worldToLocal(midLocalPos);

    // 1. Инпут длины (L)
    const divLen = document.createElement("div");
    divLen.className = "edge-ui-input";
    divLen.style.display = "none"; // 🔥 КРИТИЧЕСКИ ВАЖНО: скрываем сразу при создании

    const labelPrefix = document.createElement("span");
    labelPrefix.className = "edge-ui-label-prefix";
    labelPrefix.innerText = "L = ";
    divLen.appendChild(labelPrefix);

    this._inputLenElement = document.createElement("input");
    this._inputLenElement.type = "number";
    this._inputLenElement.step = "0.1";
    this._inputLenElement.min = "0.1";

    this._inputLenElement.addEventListener("change", (e) => {
      const newLength = parseFloat(e.target.value);
      if (newLength > 0.1 && typeof window.applyNewLengthToEdge === "function") {
        window.applyNewLengthToEdge(this, newLength);
      }
      this._inputLenElement.value = this.Length.toFixed(2);
    });
    this._inputLenElement.addEventListener("focus", () => { if (window.Engine?.controls) window.Engine.controls.enabled = false; });
    this._inputLenElement.addEventListener("blur", () => { if (window.Engine?.controls) window.Engine.controls.enabled = true; });
    divLen.appendChild(this._inputLenElement);

    this._labelLen = new CSS2DObject(divLen);
    this._labelLen.isCSS2DObject = true;
    this._labelLen.position.copy(midLocalPos);
    this._labelLen.position.y += 0.35;
    this._labelLen.visible = false;
    this.uiGroup.add(this._labelLen);

    // 2. Метка расхода (Q)
    this._divFlowElement = document.createElement("div");
    this._divFlowElement.className = "edge-ui-label flow-label";
    this._divFlowElement.innerText = "";
    this._divFlowElement.style.display = "none"; // 🔥 Скрываем сразу

    this._labelFlow = new CSS2DObject(this._divFlowElement);
    this._labelFlow.isCSS2DObject = true;
    this._labelFlow.position.copy(midLocalPos);
    this._labelFlow.position.y += 0.2;
    this._labelFlow.visible = false;
    this.uiGroup.add(this._labelFlow);

    // 3. Метка скорости (V)
    this._divVelElement = document.createElement("div");
    this._divVelElement.className = "edge-ui-label velocity-label";
    this._divVelElement.innerText = "";
    this._divVelElement.style.display = "none"; // 🔥 Скрываем сразу

    this._labelVel = new CSS2DObject(this._divVelElement);
    this._labelVel.isCSS2DObject = true;
    this._labelVel.position.copy(midLocalPos);
    this._labelVel.position.y -= 0.2;
    this._labelVel.visible = false;
    this.uiGroup.add(this._labelVel);

    this.add(this.uiGroup);
    this.uiGroup.visible = true;
    this.updateMatrixWorld(true);

    console.log("✅ createUI завершен. Все элементы изначально скрыты.");
  }

  // updateDOMValues() {
  //   if (!this.uiGroup) return;

  //   const isEditing = typeof STATE !== "undefined" && STATE.isEditingLengths === true;
  //   const showFlow = typeof STATE !== "undefined" && STATE.showLabelsMassFlowRate === true;
  //   const showVel = typeof STATE !== "undefined" && STATE.showLabelsVelocity === true;

  //   // 1. Длина (L)
  //   if (this._labelLen && this._labelLen.element) {
  //     if (this._inputLenElement) {
  //       this._inputLenElement.value = this.Length ? this.Length.toFixed(3) : "0.00";
  //     }
  //     this._labelLen.visible = isEditing;
  //     this._labelLen.element.style.display = isEditing ? "block" : "none";
  //   }

  //   // 2. Расход (Q) — ✅ ИСПРАВЛЕНО: показываем всегда, используем Math.abs()
  //   if (this._labelFlow && this._labelFlow.element) {
  //     const absFlow = Math.abs(this.massflowrate);
  //     this._divFlowElement.innerText = `Q = ${absFlow.toFixed(3)} л/с`;
  //     this._labelFlow.visible = showFlow;
  //     this._labelFlow.element.style.display = showFlow ? "block" : "none";
  //   }

  //   // 3. Скорость (V) — ✅ ИСПРАВЛЕНО: показываем всегда, используем Math.abs()
  //   if (this._labelVel && this._labelVel.element) {
  //     const absVel = Math.abs(this.velocity);
  //     this._divVelElement.innerText = `V = ${absVel.toFixed(3)} м/с`;
  //     this._labelVel.visible = showVel;
  //     this._labelVel.element.style.display = showVel ? "block" : "none";
  //   }

  //   // 4. Обновляем видимость стрелки
  //   this.updateFlowArrowVisibility();
  // }


  updateDOMValues() {
    if (!this.uiGroup) return;

    const isEditing = typeof STATE !== "undefined" && STATE.isEditingLengths === true;
    const showFlow = typeof STATE !== "undefined" && STATE.showLabelsMassFlowRate === true;
    const showVel = typeof STATE !== "undefined" && STATE.showLabelsVelocity === true;

    // Вычисляем середину трубы (общая точка отсчета)
    const startPos = new THREE.Vector3();
    const endPos = new THREE.Vector3();
    this.start_node.getWorldPosition(startPos);
    this.end_node.getWorldPosition(endPos);
    const midWorldPos = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
    const midLocalPos = midWorldPos.clone();
    this.worldToLocal(midLocalPos);

    // ===================================================================
    // 1. Инпут длины (L) — показываем только в режиме редактирования
    // ===================================================================
    if (this._labelLen && this._labelLen.element) {
      if (this._inputLenElement) {
        this._inputLenElement.value = this.Length ? this.Length.toFixed(3) : "0.00";
      }
      this._labelLen.visible = isEditing;
      this._labelLen.element.style.display = isEditing ? "block" : "none";

      // Позиция инпута: всегда над трубой (самый верхний)
      this._labelLen.position.copy(midLocalPos);
      this._labelLen.position.y += 0.5;
    }

    // ===================================================================
    // 2. Расход (Q) — меняет позицию в зависимости от режима
    // ===================================================================
    if (this._labelFlow && this._labelFlow.element) {
      const hasFlow = this.massflowrate > 0;
      this._divFlowElement.innerText = hasFlow ? `Q = ${Math.abs(this.massflowrate).toFixed(3)} л/с` : "";
      this._labelFlow.visible = hasFlow && showFlow;
      this._labelFlow.element.style.display = (hasFlow && showFlow) ? "block" : "none";

      // ✅ Позиция Q зависит от режима редактирования
      this._labelFlow.position.copy(midLocalPos);
      if (isEditing) {
        // Режим редактирования: Q под трубой (освобождаем место сверху для L)
        this._labelFlow.position.y -= 0.1;
      } else {
        // Обычный режим: Q над трубой
        this._labelFlow.position.y += 0.2;
      }
    }

    // ===================================================================
    // 3. Скорость (V) — всегда под Q
    // ===================================================================
    if (this._labelVel && this._labelVel.element) {
      const hasVel = this.velocity > 0;
      this._divVelElement.innerText = hasVel ? `V = ${Math.abs(this.velocity).toFixed(3)} м/с` : "";
      this._labelVel.visible = hasVel && showVel;
      this._labelVel.element.style.display = (hasVel && showVel) ? "block" : "none";

      // ✅ Позиция V зависит от режима редактирования
      this._labelVel.position.copy(midLocalPos);
      if (isEditing) {
        // Режим редактирования: V под Q (оба под трубой)
        this._labelVel.position.y -= 0.3;
      } else {
        // Обычный режим: V под трубой
        this._labelVel.position.y -= 0.2;
      }
    }

    // 4. Обновляем видимость стрелки
    this.updateFlowArrowVisibility();
  }


  // Быстрое обновление результатов
  updateResults(massflowrate, velocity) {
    this.massflowrate = massflowrate;
    this.velocity = velocity;

    if (this.uiGroup) {
      this.updateDOMValues();
    } else {
      this.createUI();
    }
  }

  // Обновление позиций меток после изменения геометрии трубы
  updateLabelsPosition() {
    if (!this.uiGroup) return;

    const startPos = new THREE.Vector3();
    const endPos = new THREE.Vector3();
    this.start_node.getWorldPosition(startPos);
    this.end_node.getWorldPosition(endPos);

    const midWorldPos = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
    const midLocalPos = midWorldPos.clone();
    this.worldToLocal(midLocalPos);

    this.uiGroup.children.forEach((child) => {
      if (child.isCSS2DObject && child.element) {
        let offsetY = 0;
        
        // 🔥 ИСПРАВЛЕНО: используем classList вместо ненадежного поиска по тексту
        if (child.element.querySelector("input")) {
          offsetY = 0.2; // Инпут длины - выше
        } else if (child.element.classList.contains("flow-label")) {
          offsetY = -0.1; // Расход - ниже
        } else if (child.element.classList.contains("velocity-label")) {
          offsetY = -0.2; // Скорость - еще ниже
        }

        child.position.copy(midLocalPos);
        child.position.y += offsetY;
      }
    });

    this.updateMatrixWorld(true);
  }

  // Создает или обновляет 3D-стрелку направления потока
  createFlowArrow() {
    if (this._flowArrow) {
      this.remove(this._flowArrow);
    }

    const startPos = new THREE.Vector3();
    const endPos = new THREE.Vector3();
    this.start_node.getWorldPosition(startPos);
    this.end_node.getWorldPosition(endPos);

    const localStart = new THREE.Vector3();
    const localEnd = new THREE.Vector3();
    this.worldToLocal(localStart.copy(startPos));
    this.worldToLocal(localEnd.copy(endPos));

    // ✅ ИСПРАВЛЕНО: используем flowDirection, так как massflowrate теперь всегда по модулю (>= 0)
    const isReverse = this.flowDirection === -1;
    
    const direction = isReverse
      ? new THREE.Vector3().subVectors(localStart, localEnd).normalize()
      : new THREE.Vector3().subVectors(localEnd, localStart).normalize();

    const midLocal = new THREE.Vector3().lerpVectors(localStart, localEnd, 0.5);
    const geometry = new THREE.ConeGeometry(0.05, 0.2, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0x008000 });

    this._flowArrow = new THREE.Mesh(geometry, material);
    this._flowArrow.position.copy(midLocal);

    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, direction);
    this._flowArrow.quaternion.copy(quaternion);

    this.add(this._flowArrow);
    this.updateFlowArrowVisibility();
  }

  updateFlowArrowVisibility() {
    if (!this._flowArrow) return;
    
    const showFlow = typeof STATE !== "undefined" && STATE.showLabelsMassFlowRate === true;
    const showVel = typeof STATE !== "undefined" && STATE.showLabelsVelocity === true;
    
    // ✅ Стрелка показывается, если включен ХОТЯ БЫ ОДИН из флагов (Q или V)
    const showArrow = showFlow || showVel;
    const hasFlow = Math.abs(this.massflowrate) > 0;
    
    this._flowArrow.visible = hasFlow && showArrow;
  }
}

export const Factory = {
  createOrientedCylinder(s, e, r, m, n) {
    const l = s.distanceTo(e);
    if (l < 0.001) return null;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, l, CONFIG.QUALITY.PIPE_TESS),
      m,
    );
    mesh.name = n;
    mesh.position.copy(s).lerp(e, 0.5);
    const d = new THREE.Vector3().subVectors(e, s).normalize();
    const u = new THREE.Vector3(0, 1, 0);
    if (d.dot(u) > 0.999) mesh.quaternion.identity();
    else if (d.dot(u) < -0.999)
      mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    else mesh.quaternion.setFromUnitVectors(u, d);
    return mesh;
  },

  createCustomAxes(size) {
    const g = new THREE.Group();
    const o = new THREE.Vector3(0, 0, 0);
    const hl = size * AXES_SETTINGS.HEAD_LENGTH_RATIO;
    const hw = hl * AXES_SETTINGS.HEAD_WIDTH_RATIO;
    const cs = (t, c) => {
      const cv = document.createElement("canvas"),
        cx = cv.getContext("2d");
      cv.width = 128;
      cv.height = 128;
      cx.font = "48px Arial";
      cx.fillStyle = c;
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(t, 64, 64);
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(cv),
          depthTest: false,
          transparent: true,
        }),
      );
      sp.scale.setScalar(Math.max(1, size * AXES_SETTINGS.LABEL_SIZE_RATIO));
      return sp;
    };
    [
      ["x", new THREE.Vector3(1, 0, 0), AXES_SETTINGS.COLORS.X],
      ["y", new THREE.Vector3(0, 1, 0), AXES_SETTINGS.COLORS.Y],
      ["z", new THREE.Vector3(0, 0, 1), AXES_SETTINGS.COLORS.Z],
    ].forEach(([a, d, c]) => {
      g.add(new THREE.ArrowHelper(d, o, size, c.line, hl, hw));
      const l = cs(a.toUpperCase(), c.text);
      const off = size + hl;
      l.position.set(
        a === "x" ? off : 0,
        a === "y" ? off : 0,
        a === "z" ? off : 0,
      );
      g.add(l);
    });
    return g;
  },

  createPipeline_old(segments, id) {
    if (!segments || !segments.length) return null;
    const root = new THREE.Group();
    root.name = `pipeline_${id}`;
    root.userData = {
      id,
      type: "pipeline",
      segments: [],
      nodePositions: {},
      totalLength: 0,
      isClosedLoop: false,
      createdAt: new Date().toISOString(),
    };

    // Материал для труб
    const mat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.PIPE,
      metalness: 0.2,
      roughness: 0.8,
    });

    // ОПТИМИЗАЦИЯ: Вынесли материал для сфер из цикла наружу
    const connectionMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.CONNECTION_POINT,
      emissive: 0x004d00,
      emissiveIntensity: 0.5,
    });

    let totalLen = 0;

    segments.forEach((seg, i) => {
      if (!seg || !seg.start || !seg.end) return;
      const len = seg.start.distanceTo(seg.end);
      totalLen += len;
      const radius = seg.diameter / 2000;

      // 1. Создание цилиндра (трубы)
      const mesh = Factory.createOrientedCylinder(
        seg.start,
        seg.end,
        radius,
        mat,
        `pipe_${id}_s${i}`,
      );
      if (mesh) {
        mesh.userData = {
          type: "pipeSegment",
          pipelineId: id,
          index: i,
          isPipeline: true,
          start: seg.start.clone(),
          end: seg.end.clone(),
          length: len,
          diameter: seg.diameter,
          elemName: `Сегмент #${i + 1}`,
        };
        root.add(mesh);
      }

      // Вычисляем размер сферы на основе радиуса трубы
      const cs = Math.max(CONFIG.QUALITY.CONNECTION_POINT_SIZE, radius * 3);
      const sphereGeometry = new THREE.SphereGeometry(cs, 16, 16);

      // 2. УЗЕЛ В НАЧАЛЕ СЕГМЕНТА
      const startConn = new THREE.Mesh(sphereGeometry, connectionMat);
      startConn.position.copy(seg.start);
      startConn.userData = {
        type: "connectionPoint",
        pipelineId: id,
        index: i,
        nodeId: seg.startNodeId, // полезно сохранить ID конкретного узла
        diameter: seg.diameter,
        elemName: `Узел Начало #${i + 1}`,
      };
      root.add(startConn);

      // 3. УЗЕЛ В КОНЦЕ СЕГМЕНТА
      const endConn = new THREE.Mesh(sphereGeometry, connectionMat);
      endConn.position.copy(seg.end);
      endConn.userData = {
        type: "connectionPoint",
        pipelineId: id,
        index: i,
        nodeId: seg.endNodeId,
        diameter: seg.diameter,
        elemName: `Узел Конец #${i + 1}`,
      };
      root.add(endConn);

      // Сохранение данных в userData группы
      root.userData.segments.push({
        id: `seg_${id}_${i}`,
        startNodeId: seg.startNodeId,
        endNodeId: seg.endNodeId,
        startPos: { x: seg.start.x, y: seg.start.y, z: seg.start.z },
        endPos: { x: seg.end.x, y: seg.end.y, z: seg.end.z },
        length: len,
        diameter: seg.diameter,
      });

      root.userData.nodePositions[seg.startNodeId] = {
        x: seg.start.x,
        y: seg.start.y,
        z: seg.start.z,
      };
      root.userData.nodePositions[seg.endNodeId] = {
        x: seg.end.x,
        y: seg.end.y,
        z: seg.end.z,
      };
    });

    root.userData.totalLength = totalLen;
    return root;
  },

  // Ветка с оросителями
  createBranch(lengths, diameters, id) {
    const root = new THREE.Group();
    root.name = `branch_${id}`;
    const attachNodeId = genNodeId();
    root.userData = {
      id,
      type: "branch",
      segments: [],
      nodePositions: {},
      attachNodeId: attachNodeId,
      totalLength: lengths.reduce((a, b) => a + b, 0),
      connectedTo: null,
      createdAt: new Date().toISOString(),
    };
    const pm = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.BRANCH,
      metalness: 0.2,
      roughness: 0.8,
    });
    const sm = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.SPRINKLER,
      emissive: 0x1a1a4d,
      emissiveIntensity: 0.2,
    });
    const nodeMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.SPRINKLER_NODE,
      emissive: 0x004d00,
      emissiveIntensity: 0.6,
    });
    let curX = 0;
    const an = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({
        color: CONFIG.COLORS.CONNECTOR,
        emissive: 0x4d3300,
        emissiveIntensity: 0.4,
      }),
    );
    an.position.set(0, 0, 0);
    an.userData = {
      type: "attachNode",
      branchId: id,
      elemName: "Узел привязки",
    };
    root.add(an);
    root.userData.nodePositions[attachNodeId] = { x: 0, y: 0, z: 0 };
    let prevNodeId = attachNodeId;

    let mat3 = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.CONNECTOR,
      // emissive: 0x4d3300,
      // emissiveIntensity: 0.4,
    });
    let sphereGeometry3 = new THREE.SphereGeometry(0.12, 16, 16);
    let pipeGeometry3 = new THREE.CylinderGeometry(0.1, 0.1, 5, 32);
    var t = new Node_new(sphereGeometry3, mat3, (type = "ЖОпа"));
    t.position.set(0, 5, 0);
    root.add(t);
    var t2 = new Node_new(sphereGeometry3, mat3, (type = "ЖОпа"));
    t2.position.set(0, 6, 0);
    root.add(t2);
    var l3 = new Edge_new(pipeGeometry3, mat3, t, t2);
    root.add(l3);

    lengths.forEach((len, i) => {
      const dn = diameters[i] || CONFIG.DEFAULTS.DN;
      const r = dn / 2000;
      const ss = new THREE.Vector3(curX, 0, 0);
      const se = new THREE.Vector3(curX + len, 0, 0);
      const sg = Factory.createOrientedCylinder(
        ss,
        se,
        r,
        pm,
        `bSeg_${id}_${i}`,
      );

      const sprNodeId = genNodeId();
      if (sg) {
        sg.userData = {
          type: "branchSegment",
          branchId: id,
          index: i,
          start: ss.clone(),
          end: se.clone(),
          length: len,
          diameter: dn,
          elemName: `Сегмент #${i + 1}`,
        };
        root.add(sg);
      }
      const sprX = curX + len,
        sprR = CONFIG.DEFAULTS.SPRINKLER_DN / 2000;
      const sprPipe = Factory.createOrientedCylinder(
        new THREE.Vector3(sprX, 0, 0),
        new THREE.Vector3(sprX, -0.25, 0),
        sprR,
        pm,
        `spr_${id}_${i}`,
      );
      if (sprPipe) root.add(sprPipe);
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(sprR * 10, 0.15, CONFIG.QUALITY.SPR_TESS),
        sm,
      );
      arrow.position.set(sprX, -0.33, 0);
      arrow.rotation.x = Math.PI;
      arrow.userData = {
        type: "branchSprinkler",
        branchId: id,
        sprinklerIndex: i,
        elemName: `Ороситель #${i + 1}`,
      };
      root.add(arrow);
      const sprNode = new THREE.Mesh(
        new THREE.SphereGeometry(CONFIG.QUALITY.SPRINKLER_NODE_SIZE, 16, 16),
        nodeMat,
      );
      sprNode.position.set(sprX, 0, 0);
      sprNode.userData = {
        type: "connectionPoint",
        branchId: id,
        sprinklerIndex: i,
        diameter: CONFIG.DEFAULTS.SPRINKLER_DN,
        elemName: `Узел оросителя №${i + 1}`,
      };
      root.add(sprNode);
      root.userData.segments.push({
        id: `bseg_${id}_${i}`,
        startNodeId: prevNodeId,
        endNodeId: sprNodeId,
        startPos: { x: curX, y: 0, z: 0 },
        endPos: { x: curX + len, y: -0.5, z: 0 },
        length: len,
        diameter: dn,
      });
      root.userData.nodePositions[sprNodeId] = { x: curX + len, y: -0.5, z: 0 };
      prevNodeId = sprNodeId;
      curX += len;
    });
    return root;
  },

  // Рядок с оросителями
  createSprinklerRow(ll, ld, rl, rd, id) {
    const root = new THREE.Group();
    root.name = `row_${id}`;
    const attachNodeId = genNodeId();
    root.userData = {
      id,
      type: "sprinkler_row",
      segments: [],
      nodePositions: {},
      attachNodeId: attachNodeId,
      leftSegments: [],
      rightSegments: [],
      leftLengths: [...ll],
      leftDiameters: [...ld],
      rightLengths: [...rl],
      rightDiameters: [...rd],
      totalLength:
        ll.reduce((a, b) => a + b, 0) + rl.reduce((a, b) => a + b, 0),
      connectedTo: null,
      createdAt: new Date().toISOString(),
    };
    const plm = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.ROW_LEFT,
      metalness: 0.2,
      roughness: 0.8,
    });
    const prm = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.ROW_RIGHT,
      metalness: 0.2,
      roughness: 0.8,
    });
    const sm = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.SPRINKLER,
      emissive: 0x1a1a4d,
      emissiveIntensity: 0.2,
    });
    const nodeMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.SPRINKLER_NODE,
      emissive: 0x004d00,
      emissiveIntensity: 0.6,
    });
    const an = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 16, 16),
      new THREE.MeshStandardMaterial({
        color: CONFIG.COLORS.CONNECTOR,
        emissive: 0x4d3300,
        emissiveIntensity: 0.4,
      }),
    );
    an.position.set(0, 0, 0);
    an.userData = {
      type: "attachNode",
      rowId: id,
      elemName: "Узел привязки (центр)",
    };
    root.add(an);
    root.userData.nodePositions[attachNodeId] = { x: 0, y: 0, z: 0 };
    let prevL = attachNodeId;
    let curX = 0;
    ll.forEach((len, i) => {
      const dn = ld[i] || CONFIG.DEFAULTS.DN;
      const r = dn / 2000;
      const ss = new THREE.Vector3(curX, 0, 0);
      const se = new THREE.Vector3(curX - len, 0, 0);
      const sg = Factory.createOrientedCylinder(
        ss,
        se,
        r,
        plm,
        `rowL_${id}_${i}`,
      );
      const nid = genNodeId();
      if (sg) {
        sg.userData = {
          type: "rowSegment",
          rowId: id,
          side: "left",
          index: i,
          elemName: `◀ Сегмент #${i + 1}`,
        };
        root.add(sg);
      }
      const sprR = CONFIG.DEFAULTS.SPRINKLER_DN / 2000;
      const sp = Factory.createOrientedCylinder(
        new THREE.Vector3(curX - len, 0, 0),
        new THREE.Vector3(curX - len, -0.25, 0),
        sprR,
        plm,
        `rowLSpr_${id}_${i}`,
      );
      if (sp) root.add(sp);
      const ar = new THREE.Mesh(
        new THREE.ConeGeometry(sprR * 10, 0.15, CONFIG.QUALITY.SPR_TESS),
        sm,
      );
      ar.position.set(curX - len, -0.33, 0);
      ar.rotation.x = Math.PI;
      root.add(ar);
      const sprNode = new THREE.Mesh(
        new THREE.SphereGeometry(CONFIG.QUALITY.SPRINKLER_NODE_SIZE, 16, 16),
        nodeMat,
      );
      sprNode.position.set(curX - len, 0, 0);
      sprNode.userData = {
        type: "connectionPoint",
        rowId: id,
        side: "left",
        sprinklerIndex: i,
        diameter: CONFIG.DEFAULTS.SPRINKLER_DN,
        elemName: `Узел оросителя Л#${i + 1}`,
      };
      root.add(sprNode);
      root.userData.leftSegments.push({
        id: `lseg_${id}_${i}`,
        startNodeId: prevL,
        endNodeId: nid,
        length: len,
        diameter: dn,
      });
      root.userData.segments.push(
        root.userData.leftSegments[root.userData.leftSegments.length - 1],
      );
      root.userData.nodePositions[nid] = { x: curX - len, y: -0.5, z: 0 };
      prevL = nid;
      curX -= len;
    });
    let prevR = attachNodeId;
    curX = 0;
    rl.forEach((len, i) => {
      const dn = rd[i] || CONFIG.DEFAULTS.DN;
      const r = dn / 2000;
      const ss = new THREE.Vector3(curX, 0, 0);
      const se = new THREE.Vector3(curX + len, 0, 0);
      const sg = Factory.createOrientedCylinder(
        ss,
        se,
        r,
        prm,
        `rowR_${id}_${i}`,
      );
      const nid = genNodeId();
      if (sg) {
        sg.userData = {
          type: "rowSegment",
          rowId: id,
          side: "right",
          index: i,
          elemName: `Сегмент #${i + 1} ▶`,
        };
        root.add(sg);
      }
      const sprR = CONFIG.DEFAULTS.SPRINKLER_DN / 2000;
      const sp = Factory.createOrientedCylinder(
        new THREE.Vector3(curX + len, 0, 0),
        new THREE.Vector3(curX + len, -0.25, 0),
        sprR,
        prm,
        `rowRSpr_${id}_${i}`,
      );
      if (sp) root.add(sp);
      const ar = new THREE.Mesh(
        new THREE.ConeGeometry(sprR * 10, 0.15, CONFIG.QUALITY.SPR_TESS),
        sm,
      );
      ar.position.set(curX + len, -0.33, 0);
      ar.rotation.x = Math.PI;
      root.add(ar);
      const sprNode = new THREE.Mesh(
        new THREE.SphereGeometry(CONFIG.QUALITY.SPRINKLER_NODE_SIZE, 16, 16),
        nodeMat,
      );
      sprNode.position.set(curX + len, 0, 0);
      sprNode.userData = {
        type: "connectionPoint",
        rowId: id,
        side: "right",
        sprinklerIndex: i,
        diameter: CONFIG.DEFAULTS.SPRINKLER_DN,
        elemName: `Узел оросителя П#${i + 1}`,
      };
      root.add(sprNode);
      root.userData.rightSegments.push({
        id: `rseg_${id}_${i}`,
        startNodeId: prevR,
        endNodeId: nid,
        length: len,
        diameter: dn,
      });
      root.userData.segments.push(
        root.userData.rightSegments[root.userData.rightSegments.length - 1],
      );
      root.userData.nodePositions[nid] = { x: curX + len, y: 2, z: 0 };
      prevR = nid;
      curX += len;
    });
    return root;
  },
  // Узел управления
  createControlValve(length, diameter, id) {
    const root = new THREE.Group();
    root.name = `valve_${id}`;
    const inNodeId = genNodeId();
    const outNodeId = genNodeId();
    root.userData = {
      id,
      type: "control_valve",
      totalLength: length * 2,
      diameter: diameter,
      nodePositions: {},
      createdAt: new Date().toISOString(),
    };
    const pipeMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.VALVE,
      metalness: 0.3,
      roughness: 0.7,
    });
    const nodeMat = new THREE.MeshStandardMaterial({
      color: CONFIG.COLORS.CONNECTION_POINT,
      emissive: 0x004d00,
      emissiveIntensity: 0.3,
      metalness: 0.5,
      roughness: 0.5,
    });
    const radius = diameter / 2000;
    const verticalOffset = length;
    const diagonalLength = Math.sqrt(length * length + length * length);
    const topPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 16),
      pipeMat,
    );
    topPipe.rotation.z = Math.PI / 2;
    topPipe.position.set(0, verticalOffset, 0);
    topPipe.castShadow = true;
    topPipe.userData = {
      type: "valveSegment",
      valveId: id,
      segment: "top",
      diameter: diameter,
      elemName: "Верхний сегмент",
    };
    root.add(topPipe);
    const diagPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, diagonalLength, 16),
      pipeMat,
    );
    diagPipe.rotation.z = Math.atan2(-length, length);
    diagPipe.position.set(0, length / 2, 0);
    diagPipe.castShadow = true;
    diagPipe.userData = {
      type: "valveSegment",
      valveId: id,
      segment: "diagonal",
      diameter: diameter,
      elemName: "Диагональный сегмент",
    };
    root.add(diagPipe);
    const bottomPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, length, 16),
      pipeMat,
    );
    bottomPipe.rotation.z = Math.PI / 2;
    bottomPipe.position.set(0, 0, 0);
    bottomPipe.castShadow = true;
    bottomPipe.userData = {
      type: "valveSegment",
      valveId: id,
      segment: "bottom",
      diameter: diameter,
      elemName: "Нижний сегмент",
    };
    root.add(bottomPipe);
    const node1 = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 2.5, 16, 16),
      nodeMat,
    );
    node1.position.set(0, verticalOffset, 0);
    node1.castShadow = true;
    node1.userData = {
      type: "connectionPoint",
      valveId: id,
      nodeIndex: 0,
      diameter: diameter,
      elemName: "Узел входа",
    };
    root.add(node1);
    root.userData.nodePositions[inNodeId] = {
      x: -length,
      y: verticalOffset,
      z: 0,
    };
    const node2 = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 2.5, 16, 16),
      nodeMat,
    );
    node2.position.set(0, 0, 0);
    node2.castShadow = true;
    node2.userData = {
      type: "connectionPoint",
      valveId: id,
      nodeIndex: 1,
      diameter: diameter,
      elemName: "Узел выхода",
    };
    root.add(node2);
    root.userData.nodePositions[outNodeId] = { x: length * 2, y: 0, z: 0 };
    return root;
  },

  createConnectionPipeline(sp, ep, dn, id) {
    const sn = genNodeId();
    const en = genNodeId();
    return this.createPipeline_old(
      [
        {
          start: sp.clone(),
          end: ep.clone(),
          diameter: dn,
          startNodeId: sn,
          endNodeId: en,
        },
      ],
      id,
    );
  },
};
