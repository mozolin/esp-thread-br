
const GZIP_DEBUG = 0;

// gzip-loader.js
class GzipCSSLoader {
  constructor() {
    this.styles = new Map();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.loadAllStyles();
      });
    } else {
      this.loadAllStyles();
    }
    
    this.isInitialized = true;
  }

  loadAllStyles() {
    const gzipStyles = document.querySelectorAll(`
      style[type="text/gzip"],
      style[data-gzip],
      link[rel="gzip/css"]
    `);
    
    gzipStyles.forEach(style => {
      this.loadStyle(style);
    });
  }

  async loadStyle(styleElement) {
    const styleId = styleElement.id || `gzip-css-${Date.now()}`;
    
    try {
      let cssCode;
      
      if (styleElement.tagName === 'STYLE') {
        // Inline стили
        const base64Content = styleElement.textContent.trim();
        cssCode = await this.decompressAsync(base64Content);
      } else {
        // Внешние стили
        const href = styleElement.getAttribute('href');
        cssCode = await this.loadExternalCSS(href);
      }
      
      // Применяем стили
      this.applyStyle(cssCode, styleId);
      
      // Помечаем как загруженный
      styleElement.setAttribute('data-loaded', 'true');
      
    } catch (error) {
      if(GZIP_DEBUG) {
      	console.error(`Ошибка загрузки CSS ${styleId}:`, error);
      }
      this.handleError(error, styleElement);
    }
  }

  async decompressAsync(base64String) {
    return new Promise((resolve, reject) => {
      try {
        const binaryString = atob(base64String);
        const compressedData = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
          compressedData[i] = binaryString.charCodeAt(i);
        }
        
        const result = pako.inflate(compressedData, { to: 'string' });
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  async loadExternalCSS(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const compressedData = new Uint8Array(arrayBuffer);
    
    return pako.inflate(compressedData, { to: 'string' });
  }

  applyStyle(cssCode, styleId) {
    const style = document.createElement('style');
    style.textContent = `/* Decompressed: ${styleId} */\n${cssCode}`;
    style.setAttribute('data-gzip-original-id', styleId);
    
    document.head.appendChild(style);
    this.styles.set(styleId, style);
    
    if(GZIP_DEBUG) {
    	console.log(`CSS стили применены: ${styleId}`);
    }
  }

  handleError(error, styleElement) {
    // Fallback на обычную загрузку
    const href = styleElement.getAttribute('data-fallback');
    if (href) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  // Удаление стилей (для динамической загрузки)
  removeStyle(styleId) {
    const style = this.styles.get(styleId);
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
      this.styles.delete(styleId);
    }
  }
}

class GzipJSLoader {
  constructor() {
    this.scripts = new Map();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) {
      if(GZIP_DEBUG) {
      	console.warn('GzipJSLoader уже инициализирован');
      }
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.loadAllScripts();
      });
    } else {
      this.loadAllScripts();
    }

    this.isInitialized = true;
    if(GZIP_DEBUG) {
    	console.log('GzipJSLoader инициализирован');
    }
  }

  loadAllScripts() {
    const gzipScripts = document.querySelectorAll('script[type="text/gzip"]');
    
    if (gzipScripts.length === 0) {
      if(GZIP_DEBUG) {
      	console.log('Gzip скрипты не найдены');
      }
      return;
    }

    gzipScripts.forEach(scriptElement => {
      this.loadScript(scriptElement);
    });
  }

  loadScript(scriptElement) {
    const scriptId = scriptElement.id || `gzip-script-${Date.now()}`;
    
    try {
      const base64Content = scriptElement.textContent.trim();
      
      if (!base64Content) {
        if(GZIP_DEBUG) {
        	console.warn('Пустой gzip скрипт:', scriptId);
        }
        return;
      }

      const jsCode = this.decompressGzip(base64Content);
      this.executeJavaScript(jsCode, scriptId);
      
      // Помечаем оригинальный скрипт как обработанный
      scriptElement.setAttribute('data-processed', 'true');
      
    } catch (error) {
      if(GZIP_DEBUG) {
      	console.error('Ошибка загрузки gzip скрипта:', scriptId, error);
      }
    }
  }

  decompressGzip(base64String) {
    if (typeof pako === 'undefined') {
      throw new Error('Библиотека pako не подключена');
    }

    const binaryString = atob(base64String);
    const compressedData = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      compressedData[i] = binaryString.charCodeAt(i);
    }
    
    return pako.inflate(compressedData, { to: 'string' });
  }

  executeJavaScript(code, scriptId) {
    if(GZIP_DEBUG) {
    	console.log('Выполнение скрипта:', scriptId);
    }
    
    const script = document.createElement('script');
    script.textContent = `/* GzipJSLoader: ${scriptId} */\n${code}`;
    script.setAttribute('data-original-id', scriptId);
    script.setAttribute('data-decompressed', 'true');
    
    document.head.appendChild(script);
    this.scripts.set(scriptId, script);

    // Автоматическое удаление не рекомендуется, так как скрипт может содержать
    // функции и переменные, которые должны остаться в глобальной области видимости
  }

  // Дополнительные методы для управления скриптами

  // Перезагрузка конкретного скрипта
  reloadScript(scriptId) {
    const scriptElement = document.getElementById(scriptId);
    if (scriptElement && scriptElement.getAttribute('type') === 'text/gzip') {
      // Удаляем старую версию если существует
      const existingScript = this.scripts.get(scriptId);
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
      
      this.loadScript(scriptElement);
    }
  }

  // Удаление выполненного скрипта (осторожно!)
  removeScript(scriptId) {
    const script = this.scripts.get(scriptId);
    if (script && script.parentNode) {
      script.parentNode.removeChild(script);
      this.scripts.delete(scriptId);
      if(GZIP_DEBUG) {
      	console.log('Скрипт удален:', scriptId);
      }
    }
  }

  // Получить список всех загруженных скриптов
  getLoadedScripts() {
    return Array.from(this.scripts.keys());
  }

  // Проверить, загружен ли скрипт
  isScriptLoaded(scriptId) {
    return this.scripts.has(scriptId);
  }

  // Очистка всех скриптов
  cleanup() {
    this.scripts.forEach((script, scriptId) => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
    this.scripts.clear();
    this.isInitialized = false;
    if(GZIP_DEBUG) {
    	console.log('GzipJSLoader очищен');
    }
  }
}


// Автоматическая инициализация при подключении
const gzipCSSLoader = new GzipCSSLoader();
gzipCSSLoader.init();

const gzipJSLoader = new GzipJSLoader();
gzipJSLoader.init();


/*
// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    gzipJSLoader.init();
  });
} else {
  gzipJSLoader.init();
}
*/
