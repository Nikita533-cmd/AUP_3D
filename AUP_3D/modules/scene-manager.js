import * as THREE from "three"; // ✅ ДОБАВЛЕНО: необходимо для new THREE.Vector3
import { Engine } from "../engine.js";
import { World } from "../world.js";
import { STATE } from "../state.js"; // ✅ ДОБАВЛЕНО: необходимо для toggleGrid

export class SceneManager {
    resetView() {
        Engine.camera.position.set(20, 25, 30);
        Engine.controls.target.set(0, 5, 0);
        Engine.controls.update();
    }

    // ============================================================================
    // УНИВЕРСАЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ВИДОВ
    // ============================================================================
    _applyView(dir, upVec) {
        if (!Engine || !Engine.camera || !Engine.controls) return;

        const camera = Engine.camera;
        const controls = Engine.controls;

        // Точка, на которую смотрим (центр вращения) — НЕ трогаем,
        // чтобы не сбрасывать панорамирование пользователя
        const target = controls.target.clone();

        // Сохраняем текущее расстояние = уровень приближения (зум)
        let dist = camera.position.distanceTo(target);
        if (!isFinite(dist) || dist < 0.01) dist = 100;

        // Нормализуем направление вида
        const dirN = dir.clone().normalize();

        // Ставим камеру в target + направление * расстояние
        camera.position.copy(target).addScaledVector(dirN, dist);

        // Корректный вектор "вверх" (иначе вид сверху даст gimbal-lock / переворот)
        camera.up.copy(upVec);

        // Пересчитываем контролы
        controls.update();
        camera.updateProjectionMatrix();
    }

    // Вид Сверху (план с "севером" вверх, т.е. -Z)
    topView() {
        this._applyView(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1));
    }

    // Вид Снизу
    bottomView() {
        this._applyView(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1));
    }

    // Вид Спереди (камера на +Z, смотрит на объект)
    frontView() {
        this._applyView(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
    }

    // Вид Сзади
    backView() {
        this._applyView(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
    }

    // Вид Справа (камера на +X)
    rightView() {
        this._applyView(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
    }

    // Вид Слева (камера на -X)
    leftView() {
        this._applyView(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0));
    }

    // Изометрия (камера в первом октанте)
    isoView() {
        const d = 1 / Math.sqrt(3);
        this._applyView(new THREE.Vector3(d, d, d), new THREE.Vector3(0, 1, 0));
    }

    toggleGrid() {
        STATE.showGrid = !STATE.showGrid;
        if (STATE.meshes && STATE.meshes.grid) {
            STATE.meshes.grid.visible = STATE.showGrid;
        }
        this._updateButtonLabels();
    }

    toggleCameraMode() {
        const isOrtho = Engine.camera.type === 'OrthographicCamera';
        const p = Engine.camera.position.clone();
        const t = Engine.controls.target.clone();
        const dom = Engine.renderer.domElement;
        
        Engine.controls.dispose();

        let nc;
        if (isOrtho) {
            nc = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 2000);
        } else {
            const f = 20000;
            const a = innerWidth / innerHeight;
            nc = new THREE.OrthographicCamera(-f*a/2, f*a/2, f/2, -f/2, 0.1, 20000);
        }
        
        nc.position.copy(p);
        nc.lookAt(t);
        nc.up.copy(Engine.camera.up); // ✅ Важно сохранить up вектор при смене камеры!
        nc.updateProjectionMatrix();
        
        Engine.camera = nc;
        Engine.controls = new THREE.OrbitControls(nc, dom);
        Engine.controls.target.copy(t);
        Engine.controls.enableDamping = true;
        Engine.controls.dampingFactor = 0.05;
    }

    openSceneSettings() {
        const pw = document.getElementById('scenePlaneWidth');
        const pd = document.getElementById('scenePlaneDepth');
        const as = document.getElementById('sceneAxesSize');
        if(pw) pw.value = document.getElementById('planeWidth')?.value || 50;
        if(pd) pd.value = document.getElementById('planeDepth')?.value || 50;
        if(as) as.value = document.getElementById('axesSizeInput')?.value || 2;
        
        const modal = document.getElementById('sceneSettingsModal');
        if(modal) modal.classList.add('active');
    }

    applySceneSettings() {
        const pw = document.getElementById('scenePlaneWidth')?.value || 50;
        const pd = document.getElementById('scenePlaneDepth')?.value || 50;
        const as = document.getElementById('sceneAxesSize')?.value || 2;

        World.updateGroundSize(pw, pd);
        World.updateAxesSize(as);
        
        const modal = document.getElementById('sceneSettingsModal');
        if(modal) modal.classList.remove('active');
    }

    _updateButtonLabels() {
        const text = `Сетка: ${STATE.showGrid ? 'Вкл' : 'Выкл'}`;
        const btn1 = document.getElementById('menuToggleGrid');
        const btn2 = document.getElementById('toggleGridBtn');
        if (btn1) btn1.textContent = text;
        if (btn2) btn2.textContent = text;
    }
}