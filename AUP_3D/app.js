// import { Engine } from "./engine.js";
// import { UI } from "./modules/ui-app.js";
// import { Utils } from "./state.js";
import * as THREE from 'three';
import { UI } from './modules/ui-app.js';
import { Engine } from './engine.js';
import { Utils } from './state.js';
import { updateTreeUI } from './new.js';




// addEventListener('load', () => {
//   if (typeof THREE === 'undefined') return;
//   setTimeout(() => {
//     Engine.init();
//     UI.init();
//     Engine.animate();
//     document.getElementById('loading').classList.add('hidden');
//     Utils.showStatus('Готов')
//   }, 200)
// });



addEventListener('load', () => {
      if (typeof THREE === 'undefined') return;
      setTimeout(() => {
          if (typeof UI !== 'undefined' && UI.init) UI.init(); 
          if (typeof Engine !== 'undefined' && Engine.animate) Engine.animate();
          const loadingEl = document.getElementById('loading');
          if (loadingEl) loadingEl.classList.add('hidden');
          if (typeof Utils !== 'undefined') Utils.showStatus('Готов');
      }, 200);
    });

    // ===================================================================
    // ЛОГИКА НОВОГО ИНТЕРФЕЙСА (Вкладки + Оригинальное Дерево)
    // ===================================================================
    
    // 1. Переключение вкладок Ribbon
    const ribbonTabs = document.querySelectorAll('.ribbon-tab');
    const ribbonPanels = document.querySelectorAll('.ribbon-panel');

    ribbonTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        ribbonTabs.forEach(t => t.classList.remove('active'));
        ribbonPanels.forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        const targetPanel = document.getElementById(tab.dataset.tab);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });

    // 2. Логика ОРИГИНАЛЬНОЙ кнопки дерева
    const floatingTreeBtn = document.getElementById('floatingTreeBtn');
    const treePanel = document.getElementById('treePanel');
    const treeTitle = document.getElementById('treeTitle');
    let isTreeVisible = false;

    if (floatingTreeBtn) {
      floatingTreeBtn.addEventListener('click', () => {
        isTreeVisible = !isTreeVisible;
        if (isTreeVisible) {
          treePanel.classList.remove('hidden');
          floatingTreeBtn.classList.add('active');
          treeTitle.classList.add('visible');
          
          // Вызываем вашу СУЩЕСТВУЮЩУЮ функцию обновления дерева из tree.js / new.js
          if (typeof updateTreeUI === 'function') {
            updateTreeUI();
          } else if (typeof buildTree === 'function') {
            buildTree(true);
          }
        } else {
          treePanel.classList.add('hidden');
          floatingTreeBtn.classList.remove('active');
          treeTitle.classList.remove('visible');
        }
      });
    }