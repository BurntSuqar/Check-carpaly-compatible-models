// main.js
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});

const handleSearch = () => {
    const input = document.getElementById('searchInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';
    // 修改后的输入解析逻辑
    if (!input) {
        showMessage("请输入查询内容");
        return;
    }

    // 新的解析逻辑 - 更智能地处理纯数字车型
    const parts = input.split(/\s+/);
    let results = [];

    // 情况1: 三个部分 (可能是 品牌 车型 年份)
    if (parts.length >= 3) {
        // 尝试将最后部分解析为年份
        const lastPart = parts[parts.length - 1];
        const year = parseInt(lastPart);
        
        if (!isNaN(year) && year > 1900 && year < 2100) {
            // 将中间部分合并为车型
            const modelPart = parts.slice(1, parts.length - 1).join(' ');
            results = searchFullMatch(parts[0], modelPart, year);
            
            // 如果没找到结果，尝试不区分品牌和车型
            if (results.length === 0) {
                results = searchFullMatch(parts[0], modelPart, year);
            }
        }
    }
    
    // 情况2: 两个部分 (可能是 品牌 车型 或 品牌 年份 或 车型 年份)
    if (results.length === 0 && parts.length === 2) {
        const part1 = parts[0];
        const part2 = parts[1];
        const year = parseInt(part2);
        
        // 尝试 品牌 年份
        if (!isNaN(year) && year > 1900 && year < 2100) {
            results = searchBrandYear(part1, year);
        }
        
        // 尝试 品牌 车型 (包括纯数字车型)
        if (results.length === 0) {
            results = searchBrandModel(part1, part2);
        }
        
        // 尝试 车型 年份
        if (results.length === 0) {
            const modelResults = searchModel(part1);
            results = modelResults.filter(item => item.years.includes(year));
        }
    }
    
    // 情况3: 单个部分 (品牌或车型)
    if (results.length === 0 && parts.length === 1) {
        const brandResults = searchBrand(input);
        results = brandResults.length > 0 ? brandResults : searchModel(input);
    }
    
    // 情况4: 模糊搜索
    if (results.length === 0) {
        results = searchFuzzy(input);
    }

    displayResults(results, input);
};

// 修改 searchFullMatch 函数，使车型匹配更灵活
const searchFullMatch = (brandInput, modelInput, year) => {
    const brand = findBrand(brandInput);
    if (!brand) return [];
    
    return Object.entries(brand.models)
        .filter(([model, years]) => {
            // 标准化比较：忽略大小写、空格和特殊字符
            const normalizedModel = model.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedInput = modelInput.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            return normalizedModel === normalizedInput && years.includes(year);
        })
        .map(([model]) => ({
            brand: brand.name,
            model: model,
            years: [year]
        }));
};

const searchBrandYear = (brandInput, year) => {
    const brand = findBrand(brandInput);
    return brand ? Object.entries(brand.models)
        .filter(([_, years]) => years.includes(year))
        .map(([model]) => ({
            brand: brand.name,
            model: model,
            years: [year]
        })) : [];
};

// 修改 searchBrandModel 函数，使车型匹配更灵活
const searchBrandModel = (brandInput, modelInput) => {
    const brand = findBrand(brandInput);
    if (!brand) return [];
    
    return Object.entries(brand.models)
        .filter(([model]) => {
            // 标准化比较：忽略大小写、空格和特殊字符
            const normalizedModel = model.toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedInput = modelInput.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // 允许部分匹配
            return normalizedModel.includes(normalizedInput) || 
                   normalizedInput.includes(normalizedModel);
        })
        .map(([model, years]) => ({
            brand: brand.name,
            model: model,
            years: years
        }));
};

const searchBrand = (brandInput) => {
    const brand = findBrand(brandInput);
    return brand ? Object.entries(brand.models).map(([model, years]) => ({
        brand: brand.name,
        model: model,
        years: years
    })) : [];
};

// 修改 searchModel 函数，使车型匹配更灵活
const searchModel = (modelInput) => {
    const normalizedInput = modelInput.toLowerCase().replace(/[^a-z0-9]/g, '');
    return Object.entries(vehicleData).reduce((acc, [brandKey, models]) => {
        const matches = Object.entries(models)
            .filter(([model]) => {
                const normalizedModel = model.toLowerCase().replace(/[^a-z0-9]/g, '');
                return normalizedModel === normalizedInput;
            })
            .map(([model, years]) => ({
                brand: brandKey,
                model: model,
                years: years
            }));
        return acc.concat(matches);
    }, []);
};

const searchFuzzy = (input) => {
    const searchTerm = input.toLowerCase();
    const results = [];
    
    // 优先精准匹配
    const brandResults = searchBrand(input);
    if (brandResults.length > 0) return brandResults;
    
    const modelResults = searchModel(input);
    if (modelResults.length > 0) return modelResults;

    // 模糊匹配
    Object.entries(vehicleData).forEach(([brandKey, models]) => {
        const brandName = brandKey.replace(/-/g, ' ');
        // 品牌模糊匹配
        if (brandName.includes(searchTerm)) {
            Object.entries(models).forEach(([model, years]) => {
                results.push({ brand: brandKey, model, years });
            });
            return;
        }
        // 车型模糊匹配
        Object.entries(models).forEach(([model, years]) => {
            if (model.toLowerCase().includes(searchTerm)) {
                results.push({ brand: brandKey, model, years });
            }
        });
    });
    return results;
};

// 辅助函数（保持不变）
const findBrand = (input) => {
    const normalizedInput = input.toLowerCase().replace(/\s+/g, '-');
    if (vehicleData[normalizedInput]) {
        return { name: normalizedInput, models: vehicleData[normalizedInput] };
    }
    for (const [brandKey, models] of Object.entries(vehicleData)) {
        if (brandKey.replace(/-/g, ' ').includes(normalizedInput.replace(/-/g, ' '))) {
            return { name: brandKey, models: models };
        }
    }
    return null;
};

// 修改显示结果的函数
const displayResults = (results, query) => {
    const container = document.getElementById('resultContainer');
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="match-item">
                <p>没有找到与"${query}"匹配的车型</p>
                <p>请确认输入是否正确，或者尝试其他关键词</p>
                <p>需要帮助？请联系客服：400-123-4567</p>
            </div>
        `;
        return;
    }
    
    // 构建结果HTML - 移除了数量限制
    let html = `
        <div class="match-item">
            <p>您查询的"${query}"匹配到以下车型：</p>
        </div>
    `;
    
    // 直接遍历所有结果，不再限制数量
    results.forEach(item => {
        const brandName = item.brand.replace(/-/g, ' ').toUpperCase();
        const modelName = item.model.toUpperCase();
        html += `
            <div class="match-item">
                <strong>品牌：</strong>${brandName}<br>
                <strong>车型：</strong>${modelName}<br>
                <strong>年份：</strong>${item.years.join(', ')}
            </div>
        `;
    });
    
    // 添加提示信息（移除了数量限制的提示）
    html += `<div class="match-item">
        <p>共找到${results.length}个结果</p>
        <p>未找到您需要的车型？请尝试其他关键词或联系客服</p>
    </div>`;
    
    container.innerHTML = html;
};

const showMessage = (msg) => {
    document.getElementById('resultContainer').innerHTML = 
        `<div class="match-item">${msg}</div>`;
};

// 添加车型标准化函数
const normalizeModel = (model) => {
    return model.toString().toLowerCase().replace(/\s+/g, '');
};