// ============================================================
// factory.js — Фабрика и классы 3D-объектов с инкапсулированными метками
// ============================================================
import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { AXES_SETTINGS, CONFIG, STATE, VisualPipelins } from "./state.js";

// ============================================================================
// КЛАСС УЗЛА (Node / Source / Sprinkler)
// ============================================================================
export class Node_new extends THREE.Mesh {
  constructor(geometry, material, type) {
    super(geometry, material);
    this.type = type;
    this.name = "Node_new";
    this.X_gl = 0; this.Y_gl = 0; this.Z_gl = 0;
    this.K = Number(STATE.sprinkler_kv || 0);
    
    this.pressure_m = 0;
    this.flow_l_s = 0;

    // 3D Метки (Спрайты)
    this._pLabel = null;
    this._qLabel = null;
    
    this.updateSprinklerArrow();
    if (typeof STATE !== "undefined" && STATE.Three_D_objects) {
      STATE.Three_D_objects.push(this);
    }
  }

  update_Global() {
    const pos = new THREE.Vector3();
    this.getWorldPosition(pos);
    this.X_gl = pos.x; this.Y_gl = pos.y; this.Z_gl = pos.z;
    return [this.X_gl, this.Y_gl, this.Z_gl];
  }

  add_list() {
    return {
      id: this.uuid, type: this.type,
      X_gl: this.X_gl, Y_gl: this.Y_gl, Z_gl: this.Z_gl,
      K: this.K, pressure_m: this.pressure_m, flow_l_s: this.flow_l_s,
    };
  }

  // ✅ Единая точка входа для обновления данных узла
  applyResult(data) {
    this.pressure_m = data.pressure_m || 0;
    this.flow_l_s = (data.type && data.type.toLowerCase() === 'sprinkler') ? (data.sprinkler_flow_l_s || 0) : 0;
    this._ensureLabels();
    this._updateLabelTexts();
    this._updateLabelsVisibility();
  }

  _ensureLabels() {
    if (!this._pLabel) {
      this._pLabel = this._createSprite('P = 0 м', '#000000', 5);
      this._pLabel.name = 'PressureLabel';
      this.add(this._pLabel);
    }
    if (!this._qLabel) {
      this._qLabel = this._createSprite('Q = 0 л/с', '#000000', 5);
      this._qLabel.name = 'FlowLabel';
      this.add(this._qLabel);
    }
  }

  _createSprite(text, color, scaleSize) {
    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.font = 'Bold 40px Arial, sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, size / 2, size / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, sizeAttenuation: true });
    const sprite = new THREE.Sprite(material);
    sprite.userData.baseScale = scaleSize;
    return sprite;
  }

  _updateLabelTexts() {
    if (this._pLabel) {
      const newSprite = this._createSprite(`P = ${(this.pressure_m).toFixed(3).replace('.', ',')} м`, '#000000', 5);
      this._pLabel.material.map.dispose();
      this._pLabel.material.map = newSprite.material.map;
    }
    if (this._qLabel) {
      const newSprite = this._createSprite(`Q = ${(this.flow_l_s).toFixed(3).replace('.', ',')} л/с`, '#000000', 5);
      this._qLabel.material.map.dispose();
      this._qLabel.material.map = newSprite.material.map;
    }
  }

  _updateLabelsVisibility() {
    const showP = typeof STATE !== "undefined" && STATE.showLabelsPressure;
    const showQ = typeof STATE !== "undefined" && STATE.showLabelsMassFlowRate;
    if (this._pLabel) this._pLabel.visible = !!showP && this.pressure_m > 0;
    if (this._qLabel) this._qLabel.visible = !!showQ && this.flow_l_s > 0;
  }

  // ✅ Вызывается из глобального updateLabelsForZoom
  updateLabelTransform(sizeFactor, offsetFactor, camRight, camUp) {
    if (!this._pLabel || !this._qLabel) return;
    
    // P: справа-сверху относительно камеры
    const pRight = 0.2, pUp = 0.2;
    this._pLabel.position.set(
      camRight.x * pRight + camUp.x * pUp,
      camRight.y * pRight + camUp.y * pUp,
      camRight.z * pRight + camUp.z * pUp
    );
    const sP = 5 * sizeFactor;
    this._pLabel.scale.set(sP, sP, 1);

    // Q: слева-снизу относительно камеры
    const qRight = -0.2, qUp = -0.55;
    this._qLabel.position.set(
      camRight.x * qRight + camUp.x * qUp,
      camRight.y * qRight + camUp.y * qUp,
      camRight.z * qRight + camUp.z * qUp
    );
    const sQ = 5 * sizeFactor;
    this._qLabel.scale.set(sQ, sQ, 1);
  }

  destroyLabels() {
    if (this._pLabel) { this.remove(this._pLabel); this._pLabel.material.map.dispose(); this._pLabel = null; }
    if (this._qLabel) { this.remove(this._qLabel); this._qLabel.material.map.dispose(); this._qLabel = null; }
  }

  updateSprinklerArrow() {
    const existingArrow = this.getObjectByName('SprinklerArrow');
    if (existingArrow) {
      this.remove(existingArrow);
      existingArrow.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
    if (this.type === 'Sprinkler') {
      const group = new THREE.Group();
      group.name = 'SprinklerArrow';
      const r = (typeof VisualPipelins !== 'undefined' ? VisualPipelins.d_node_base : 0.12) / 2;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.1, r * 2.5, 16), this.material);
      shaft.position.y = -(r * 1.25);
      const head = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.5, 16), this.material);
      head.rotation.x = Math.PI;
      head.position.y = -(r * 2.5 + r * 0.75);
      group.add(shaft, head);
      this.add(group);
    }
  }
}

// ============================================================================
// КЛАСС РЕБРА (Труба / Edge)
// ============================================================================
export class Edge_new extends THREE.Mesh {
  constructor(geometry, material, start_node, end_node, type, Length, DN, ghost, k_t, kvelocity) {
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

    this.massflowrate = 0;
    this.velocity = 0;
    this.flowDirection = 1;

    this.uiGroup = null;       // CSS2D для интерактивного ввода длины
    this._qLabel = null;       // 3D Mesh для Q
    this._vLabel = null;       // 3D Mesh для V
    this._flowArrow = null;
    this._xSign = 1;           // Гистерезис для поворота меток трубы

    if (typeof STATE !== "undefined" && STATE.Three_D_objects) {
      STATE.Three_D_objects.push(this);
    }
  }

  add_list() {
    return {
      id: this.uuid, type: this.type, DN: this.DN, Length: this.Length,
      start_node: this.start_node.uuid, end_node: this.end_node.uuid,
      ghost: this.ghost, k_t: this.k_t, kvelocity: this.kvelocity,
      massflowrate: this.massflowrate, velocity: this.velocity,
    };
  }

  // ✅ Единая точка входа для обновления данных трубы
  applyResult(data) {
    this.massflowrate = Math.abs(data.flow_l_s || data.massflowrate || 0);
    this.velocity = Math.abs(data.velocity_m_s || data.velocity || 0);
    this.flowDirection = data.direction === 'reverse' ? -1 : 1;
    
    this._ensureLabels();
    this._updateLabelTexts();
    this._updateLabelsVisibility();
    this.createFlowArrow();
  }

  _ensureLabels() {
    if (!this.uiGroup) this._createLengthUI();
    
    if (!this._qLabel) {
      this._qLabel = this._createPipeLabelMesh('Q = 0 л/с', '#000000', 15);
      this._qLabel.name = 'FlowLabel';
      this._qLabel.userData.isPipeLabel = true;
      this._qLabel.userData.anchorObj = this;
      this._qLabel.userData.pipeOffset = 0.18;
      this._qLabel.userData.baseScale = 15;
      this.add(this._qLabel);
    }
    if (!this._vLabel) {
      this._vLabel = this._createPipeLabelMesh('V = 0 м/с', '#000000', 15);
      this._vLabel.name = 'VelocityLabel';
      this._vLabel.userData.isPipeLabel = true;
      this._vLabel.userData.anchorObj = this;
      this._vLabel.userData.pipeOffset = -0.18;
      this._vLabel.userData.baseScale = 15;
      this.add(this._vLabel);
    }
  }

  _createPipeLabelMesh(text, color, scaleSize) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 64;
    ctx.font = `Bold ${fontSize}px Arial, sans-serif`;
    const textWidth = ctx.measureText(text).width;
    const padding = 30;
    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = fontSize + padding * 2;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // ctx.shadowColor = 'rgba(255,255,255,0.9)';
    // ctx.shadowBlur = 6;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const scale = scaleSize / 10240;
    const geometry = new THREE.PlaneGeometry(canvas.width * scale, canvas.height * scale);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthTest: false });
    return new THREE.Mesh(geometry, material);
  }

  _updateLabelTexts() {
    if (this._qLabel) {
      const newMesh = this._createPipeLabelMesh(`Q = ${this.massflowrate.toFixed(3).replace('.', ',')} л/с`, '#000000', 15);
      this._qLabel.geometry.dispose(); this._qLabel.geometry = newMesh.geometry;
      this._qLabel.material.map.dispose(); this._qLabel.material.map = newMesh.material.map;
    }
    if (this._vLabel) {
      const newMesh = this._createPipeLabelMesh(`V = ${this.velocity.toFixed(3).replace('.', ',')} м/с`, '#000000', 15);
      this._vLabel.geometry.dispose(); this._vLabel.geometry = newMesh.geometry;
      this._vLabel.material.map.dispose(); this._vLabel.material.map = newMesh.material.map;
    }
  }

  _updateLabelsVisibility() {
    const showQ = typeof STATE !== "undefined" && STATE.showLabelsMassFlowRate;
    const showV = typeof STATE !== "undefined" && STATE.showLabelsVelocity;
    if (this._qLabel) this._qLabel.visible = !!showQ && this.massflowrate > 0;
    if (this._vLabel) this._vLabel.visible = !!showV && this.velocity > 0;
    this.updateFlowArrowVisibility();
  }

  // ✅ Вызывается из глобального updateLabelsForZoom
  updateLabelTransform(sizeFactor, offsetFactor, camRight, camUp, camPos) {
    if (!this._qLabel && !this._vLabel) return;
    
    const s = new THREE.Vector3(), e = new THREE.Vector3();
    this.start_node.getWorldPosition(s);
    this.end_node.getWorldPosition(e);
    const mid = new THREE.Vector3().lerpVectors(s, e, 0.5);
    const dir = new THREE.Vector3().subVectors(e, s).normalize();

    let xAxis = dir.clone();
    if (Math.abs(dir.y) > 0.9) { xAxis.set(0, 1, 0); this._xSign = 1; }
    else {
      const dot = xAxis.dot(camRight);
      let sgn = (this._xSign === undefined) ? 1 : this._xSign;
      if (dot > 0.15) sgn = 1;
      else if (dot < -0.15) sgn = -1;
      this._xSign = sgn;
      xAxis.multiplyScalar(sgn);
    }

    const toCam = new THREE.Vector3().subVectors(camPos, mid).normalize();
    let zAxis = toCam.clone().addScaledVector(xAxis, -toCam.dot(xAxis));
    if (zAxis.lengthSq() < 1e-6) {
      zAxis = camUp.clone().addScaledVector(xAxis, -camUp.dot(xAxis));
      if (zAxis.lengthSq() < 1e-6) zAxis = camRight.clone().addScaledVector(xAxis, -camRight.dot(xAxis));
    }
    zAxis.normalize();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);

    const apply = (label, off) => {
      if (!label) return;
      label.quaternion.setFromRotationMatrix(basis);
      label.position.copy(mid).addScaledVector(yAxis, off * offsetFactor);
      const sc = (label.userData.baseScale || 15) * sizeFactor;
      label.scale.set(sc, sc, 1);
    };

    apply(this._qLabel, 0.18);
    apply(this._vLabel, -0.18);
  }

  _createLengthUI() {
    this.uiGroup = new THREE.Group();
    this.uiGroup.name = "EdgeUI";
    const midLocal = new THREE.Vector3(); // Упрощенно, позиция обновится в updateDOMValues
    const div = document.createElement("div");
    div.className = "edge-ui-input";
    div.style.display = "none";
    const prefix = document.createElement("span");
    prefix.className = "edge-ui-label-prefix";
    prefix.innerText = "L = ";
    div.appendChild(prefix);
    this._inputLenElement = document.createElement("input");
    this._inputLenElement.type = "number";
    this._inputLenElement.step = "0.1";
    this._inputLenElement.min = "0.1";
    this._inputLenElement.addEventListener("change", (e) => {
      const val = parseFloat(e.target.value);
      if (val > 0.1 && typeof window.applyNewLengthToEdge === "function") window.applyNewLengthToEdge(this, val);
      e.target.value = this.Length.toFixed(2);
    });
    this._inputLenElement.addEventListener("focus", () => { if (window.Engine?.controls) window.Engine.controls.enabled = false; });
    this._inputLenElement.addEventListener("blur", () => { if (window.Engine?.controls) window.Engine.controls.enabled = true; });
    div.appendChild(this._inputLenElement);
    this._labelLen = new CSS2DObject(div);
    this._labelLen.visible = false; 
    this._labelLen.isCSS2DObject = true;
    this.uiGroup.add(this._labelLen);
    this.add(this.uiGroup);
  }

  updateDOMValues() {
    if (!this.uiGroup || !this._labelLen || !this._inputLenElement) return;
    const isEditing = typeof STATE !== "undefined" && STATE.isEditingLengths === true;
    this._inputLenElement.value = this.Length.toFixed(2);
    this._labelLen.visible = isEditing;
    this._labelLen.element.style.display = isEditing ? "block" : "none";
    
    const s = new THREE.Vector3(), e = new THREE.Vector3();
    this.start_node.getWorldPosition(s); this.end_node.getWorldPosition(e);
    const midLocal = new THREE.Vector3().lerpVectors(s, e, 0.5);
    this.worldToLocal(midLocal);
    this._labelLen.position.copy(midLocal);
    this._labelLen.position.y += 0.5;
  }

  updateLabelsPosition() { this.updateDOMValues(); }

  createFlowArrow() {
    if (this._flowArrow) { this.remove(this._flowArrow); this._flowArrow.geometry.dispose(); this._flowArrow.material.dispose(); }
    const s = new THREE.Vector3(), e = new THREE.Vector3();
    this.start_node.getWorldPosition(s); this.end_node.getWorldPosition(e);
    const localS = new THREE.Vector3(), localE = new THREE.Vector3();
    this.worldToLocal(localS.copy(s)); this.worldToLocal(localE.copy(e));
    const dir = (this.flowDirection === -1) ? new THREE.Vector3().subVectors(localS, localE).normalize() : new THREE.Vector3().subVectors(localE, localS).normalize();
    const mid = new THREE.Vector3().lerpVectors(localS, localE, 0.5);
    this._flowArrow = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x008000 }));
    this._flowArrow.position.copy(mid);
    this._flowArrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.add(this._flowArrow);
    this.updateFlowArrowVisibility();
  }

  updateFlowArrowVisibility() {
    if (!this._flowArrow) return;
    const showQ = typeof STATE !== "undefined" && STATE.showLabelsMassFlowRate;
    const showV = typeof STATE !== "undefined" && STATE.showLabelsVelocity;
    this._flowArrow.visible = (Math.abs(this.massflowrate) > 0) && (showQ || showV);
  }

  destroyLabels() {
    if (this.uiGroup) {
      this.uiGroup.traverse(c => { if (c.element && typeof c.element.remove === "function") c.element.remove(); });
      this.remove(this.uiGroup); this.uiGroup = null;
    }
    [this._qLabel, this._vLabel, this._flowArrow].forEach(l => {
      if (l) { this.remove(l); if (l.geometry) l.geometry.dispose(); if (l.material) { if (l.material.map) l.material.map.dispose(); l.material.dispose(); } }
    });
    this._qLabel = null; this._vLabel = null; this._flowArrow = null;
  }

    // ✅ Обратная совместимость: публичный createUI (вызывается из new.js)
    createUI() {
        if (!this.uiGroup) this._createLengthUI();
        this.updateDOMValues();
    }

    // ✅ Обратная совместимость: публичный updateResults
    updateResults(massflowrate, velocity) {
        this.massflowrate = massflowrate;
        this.velocity = velocity;
        if (this.uiGroup) this.updateDOMValues();
        else this._createLengthUI();
    }
}

// ============================================================================
// ФАБРИКА (остальные методы без изменений)
// ============================================================================
export const Factory = {
  createOrientedCylinder(s, e, r, m, n) {
    const l = s.distanceTo(e);
    if (l < 0.001) return null;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, CONFIG.QUALITY.PIPE_TESS), m);
    mesh.name = n;
    mesh.position.copy(s).lerp(e, 0.5);
    const d = new THREE.Vector3().subVectors(e, s).normalize();
    const u = new THREE.Vector3(0, 1, 0);
    if (d.dot(u) > 0.999) mesh.quaternion.identity();
    else if (d.dot(u) < -0.999) mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    else mesh.quaternion.setFromUnitVectors(u, d);
    return mesh;
  },

  createCustomAxes(size) {
    const g = new THREE.Group();
    const o = new THREE.Vector3(0, 0, 0);
    const hl = size * AXES_SETTINGS.HEAD_LENGTH_RATIO;
    const hw = hl * AXES_SETTINGS.HEAD_WIDTH_RATIO;
    const cs = (t, c) => {
      const cv = document.createElement("canvas"), cx = cv.getContext("2d");
      cv.width = 128; cv.height = 128;
      cx.font = "48px Arial"; cx.fillStyle = c; cx.textAlign = "center"; cx.textBaseline = "middle";
      cx.fillText(t, 64, 64);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
      sp.scale.setScalar(Math.max(1, size * AXES_SETTINGS.LABEL_SIZE_RATIO));
      return sp;
    };
    [["x", new THREE.Vector3(1, 0, 0), AXES_SETTINGS.COLORS.X], ["y", new THREE.Vector3(0, 1, 0), AXES_SETTINGS.COLORS.Y], ["z", new THREE.Vector3(0, 0, 1), AXES_SETTINGS.COLORS.Z]].forEach(([a, d, c]) => {
      g.add(new THREE.ArrowHelper(d, o, size, c.line, hl, hw));
      const l = cs(a.toUpperCase(), c.text);
      const off = size + hl;
      l.position.set(a === "x" ? off : 0, a === "y" ? off : 0, a === "z" ? off : 0);
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
