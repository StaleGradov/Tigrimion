"use strict";

class ActionModulesLoader {
    constructor(actionSystem) {
        this.actionSystem = actionSystem;
        this.loadedModules = new Set();
    }
    
    async loadModule(moduleName) {
        try {
            // Пробуем разные пути
            const modulePaths = [
                `data/actions/${moduleName}-action.js`,
                `data/actions/${moduleName}.js`,
                `data/modules/actions/${moduleName}-action.js`,
                `data/modules/actions/${moduleName}.js`,
                `modules/actions/${moduleName}-action.js`,
                `modules/actions/${moduleName}.js`
            ];
            
            console.log(`📥 Загружаем модуль действия: ${moduleName}`);
            console.log(`🔍 Проверяем пути:`, modulePaths);
            
            let response = null;
            let successfulPath = '';
            
            for (const path of modulePaths) {
                try {
                    console.log(`   Пробуем: ${path}`);
                    response = await fetch(path);
                    if (response.ok) {
                        successfulPath = path;
                        console.log(`✅ Файл найден: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`   ❌ Не удалось: ${path} - ${e.message}`);
                    continue;
                }
            }
            
            if (!response || !response.ok) {
                throw new Error(`Не удалось загрузить модуль ${moduleName} ни с одного пути`);
            }
            
            const moduleCode = await response.text();
            console.log(`📄 Код модуля (первые 200 символов): ${moduleCode.substring(0, 200)}...`);
            
            const blob = new Blob([moduleCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    URL.revokeObjectURL(url);
                    console.log(`✅ Скрипт ${moduleName} загружен успешно`);
                    resolve();
                };
                script.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error(`Ошибка выполнения модуля ${moduleName}`));
                };
                document.head.appendChild(script);
            });
            
            this.loadedModules.add(moduleName);
            console.log(`✅ Модуль действия ${moduleName} загружен с пути: ${successfulPath}`);
            
            // Автоматически создаем экземпляр модуля
            if (window.HuntAction && moduleName === 'hunt') {
                setTimeout(() => {
                    if (this.actionSystem && !this.actionSystem.actionModules['hunt']) {
                        this.actionSystem.actionModules['hunt'] = new window.HuntAction(this.actionSystem);
                        console.log("✅ Экземпляр HuntAction создан автоматически");
                    }
                }, 100);
            }
            
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки модуля ${moduleName}:`, error);
            
            // Создаем заглушку если не удалось загрузить
            if (moduleName === 'hunt') {
                console.log("🔄 Создаем заглушку для модуля охоты");
                this.actionSystem.createHuntActionStub();
            }
            
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
