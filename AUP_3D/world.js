// ============================================================
// world.js — управление сценой (основание, сетка, оси)
// Зависимости: Utils, STATE, Engine, CONFIG, AXES_SETTINGS
// ============================================================

import * as THREE from 'three';
import { Engine } from "./engine.js";
import { AXES_SETTINGS, CONFIG, STATE, Utils } from "./state.js";


export const World = {

    initAxesGizmo() {
        STATE.showAxesGizmo = true;
        STATE.gizmoScene = new THREE.Scene();       

        const axisLength = 0.5;       // длина каждой оси
        const headLength = 0.25;      // длина конуса-стрелки
        const headWidth  = 0.12;      // радиус конуса

        // Вспомогательная функция: создаёт ArrowHelper + спрайт-подпись
        const addAxis = (dir, color, label, labelOffset) => {
            // 1. Стрелка (линия + конус на конце)
            const arrow = new THREE.ArrowHelper(
                dir.clone().normalize(),
                new THREE.Vector3(0, 0, 0),
                axisLength,
                color,
                headLength,
                headWidth
            );
            STATE.gizmoScene.add(arrow);

            // 2. Подпись (X / Y / Z) — спрайт из canvas с ЦВЕТОМ оси
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.font = 'Bold 80px Arial';
            
            // Конвертируем число 0xff0000 в CSS-строку '#ff0000'
            const cssColor = typeof color === 'number' 
                ? `#${color.toString(16).padStart(6, '0')}` 
                : color;

            ctx.fillStyle = cssColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Белая обводка для читаемости на любом фоне
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6;
            ctx.strokeText(label, 64, 64);
            ctx.fillText(label, 64, 64);

            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            const spriteMat = new THREE.SpriteMaterial({
                map: texture,
                depthTest: false,
                transparent: true
            });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.copy(dir.clone().normalize().multiplyScalar(labelOffset));
            sprite.scale.set(0.45, 0.45, 1);
            STATE.gizmoScene.add(sprite);
        };

        // Ось X — красная, вправо
        addAxis(new THREE.Vector3(1, 0, 0), 0xff0000, 'X', axisLength + 0.15);
        // Ось Y — зелёная, вверх
        addAxis(new THREE.Vector3(0, 1, 0), 0x00aa00, 'Y', axisLength + 0.15);
        // Ось Z — синяя, вперёд
        addAxis(new THREE.Vector3(0, 0, 1), 0x0000ff, 'Z', axisLength + 0.15);

        // Ортографическая камера для гизмо (не зависит от зума основной сцены)
        const frustumSize = 2;
        STATE.gizmoCamera = new THREE.OrthographicCamera(
            -frustumSize / 2, frustumSize / 2,
            frustumSize / 2, -frustumSize / 2,
            0.1, 100
        );
        STATE.gizmoCamera.position.set(4, 4, 4);
        STATE.gizmoCamera.lookAt(0, 0, 0);
    },



    updateGroundSize(w, d) {
        w = Utils.clamp(parseFloat(w) || 10, 2, 200000);
        d = Utils.clamp(parseFloat(d) || 10, 2, 200000);
        document.getElementById('planeWidth').value = w;
        document.getElementById('planeDepth').value = d;
        
        ['ground', 'grid', 'axes'].forEach(k => {
            if (STATE.meshes[k]) {                
                Engine.scene.remove(STATE.meshes[k]);
                if (STATE.meshes[k].geometry) STATE.meshes[k].geometry.dispose();
            }
        });

        const mx = Math.max(w, d);
        STATE.meshes.grid = new THREE.GridHelper(mx, mx, CONFIG.COLORS.GRID, CONFIG.COLORS.GRID);
        STATE.meshes.grid.position.y = .01;
        STATE.meshes.grid.visible = STATE.showGrid;
        Engine.scene.add(STATE.meshes.grid);
        
        let as = AXES_SETTINGS.FIXED_SIZE;
        if (AXES_SETTINGS.AUTO_SIZE.ENABLED) {
            as = Utils.clamp(
                Math.min(w, d) * AXES_SETTINGS.AUTO_SIZE.RELATIVE_RATIO,
                AXES_SETTINGS.AUTO_SIZE.MIN_SIZE,
                AXES_SETTINGS.AUTO_SIZE.MAX_SIZE
            );
        }
        document.getElementById('axesSizeInput').value = as;
        
        // СОЗДАЁМ ПРОСТЫЕ ЛИНИИ БЕЗ СТРЕЛОК И ПОДПИСЕЙ
        const axesGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(as, 0, 0),  // X
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, as, 0),  // Y
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, as)   // Z
        ]);
        const axesMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
        const axesLines = new THREE.LineSegments(axesGeometry, axesMaterial);
        axesLines.geometry.setAttribute('color', new THREE.Float32BufferAttribute([
            1, 0, 0,  1, 0, 0,  // X - красный
            0, 1, 0,  0, 1, 0,  // Y - зелёный
            0, 0, 1,  0, 0, 1   // Z - синий
        ], 3));
        
        STATE.meshes.axes = axesLines;
        STATE.meshes.axes.position.set(0, AXES_SETTINGS.HEIGHT_OFFSET, 0);
        Engine.scene.add(STATE.meshes.axes);
    },

    updateAxesSize(s) {
        s = Utils.clamp(parseFloat(s) || 2, .1, 100);
        
        // Корректное удаление старых осей с очисткой памяти
        if (STATE.meshes.axes) {
            Engine.scene.remove(STATE.meshes.axes);
            if (STATE.meshes.axes.geometry) STATE.meshes.axes.geometry.dispose();
        }
        
        // Создаём новые простые линии
        const axesGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(s, 0, 0),
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, s, 0),
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, s)
        ]);
        const axesMaterial = new THREE.LineBasicMaterial({ vertexColors: true });
        const axesLines = new THREE.LineSegments(axesGeometry, axesMaterial);
        axesLines.geometry.setAttribute('color', new THREE.Float32BufferAttribute([
            1, 0, 0,  1, 0, 0,
            0, 1, 0,  0, 1, 0,
            0, 0, 1,  0, 0, 1
        ], 3));
        
        STATE.meshes.axes = axesLines;
        STATE.meshes.axes.position.set(0, AXES_SETTINGS.HEIGHT_OFFSET, 0);
        Engine.scene.add(STATE.meshes.axes);
        
        AXES_SETTINGS.AUTO_SIZE.ENABLED = false;
        AXES_SETTINGS.FIXED_SIZE = s;
        document.getElementById('axesSizeInput').value = s;
    }

    
};