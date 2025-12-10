"use strict";

class ActionModulesLoader {
    constructor(actionSystem) {
        this.actionSystem = actionSystem;
        this.loadedModules = new Set();
    }
    
    async loadModule(moduleName) {
        try {
            const modulePath = `data/actions/${moduleName}-action.js`;
            console.log(`📥 Загружаем модуль действия: ${modulePath}`);
            
            const response = await fetch(modulePath);
            if (!response.ok) {
                throw new Error(`Не удалось загрузить модуль ${moduleName}`);
            }
            
            const moduleCode = await response.text();
            const blob = new Blob([moduleCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    URL.revokeObjectURL(url);
                    resolve();
                };
                script.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error(`Ошибка выполнения модуля ${moduleName}`));
                };
                document.head.appendChild(script);
            });
            
            this.loadedModules.add(moduleName);
            console.log(`✅ Модуль действия ${moduleName} загружен`);
            
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки модуля ${moduleName}:`, error);
            return false;
        }
    }
    
    async loadAllModules(modules = ['hunt']) {
        console.log("🔄 Загрузка всех модулей действий...");
        
        const promises = modules.map(module => this.loadModule(module));
        const results = await Promise.allSettled(promises);
        
        const loaded = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
        console.log(`✅ Загружено модулей действий: ${loaded}/${modules.length}`);
        
        return loaded > 0;
    }
}

window.ActionModulesLoader = ActionModulesLoader;
