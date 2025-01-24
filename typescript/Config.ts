import json5 from 'json5';
import fs from 'fs';

export class Config {
    public static FILENAME = './data/config.json5';
    private static _instance: Config;
    private static _fsWatcher: fs.FSWatcher;
    
    // Settings here...

    private constructor() {
        this.loadConfig();
    }

    private loadConfig(): void {
        // 读取并解析 json 文件
        if (fs.existsSync(Config.FILENAME)) {
            const data = fs.readFileSync(Config.FILENAME, 'utf-8');
            const configData = json5.parse(data);
    
            // 自动映射配置数据到实例字段
            Object.keys(configData).forEach((key) => {
                if (key in this) {
                    this.validateAndAssign(key as keyof Config, configData[key]);
                }
            });
        }
        //否则就是用默认的配置
    }

    private validateAndAssign(field: keyof Config, value: any): void {
        const fieldType = typeof this[field];  // 通过 keyof Config 确保访问的是 Config 类中的字段

        // 类型匹配检查
        if (fieldType === 'string' && typeof value !== 'string') {
            throw new Error(`Invalid type for field "${field}". Expected string but got ${typeof value}.`);
        }
        if (fieldType === 'number' && typeof value !== 'number') {
            throw new Error(`Invalid type for field "${field}". Expected number but got ${typeof value}.`);
        }
        if (fieldType === 'boolean' && typeof value !== 'boolean') {
            throw new Error(`Invalid type for field "${field}". Expected boolean but got ${typeof value}.`);
        }
        if (fieldType === 'object' && typeof value === 'object' && value !== null) {
            const expectedObjectType = this[field] as unknown as object;
            if (Array.isArray(value)) {
                throw new Error(`Invalid type for field "${field}". Expected object but got array.`);
            }
            Object.keys(expectedObjectType).forEach(subKey => {
                if (!(subKey in value)) {
                    // 补充缺少的字段
                    (value as any)[subKey] = (expectedObjectType as any)[subKey];
                }
            });
        }

        // 最终赋值
        (this as any)[field] = value;
    }

    public static getInstance(): Config {
        if (!Config._instance) {
            Config._instance = new Config();
            Config._fsWatcher = fs.watch(Config.FILENAME, () => {
                console.log('[Config] Config file changed. Reloading...');
                Config._instance.loadConfig();
            });  // 监听配置文件变化并重新加载
        }
        return Config._instance;
    }

    public static get instance(): Config {
        return Config.getInstance();
    }

    public static get fsWatcher(): fs.FSWatcher {
        return Config._fsWatcher;
    }
}
