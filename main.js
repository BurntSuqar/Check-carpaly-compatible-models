// main.js
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});

// 修改 handleSearch 函数
const handleSearch = () => {
    const input = document.getElementById('searchInput').value.trim();
    const resultContainer = document.getElementById('resultContainer');
    resultContainer.innerHTML = '';

    if (!input) {
        showMessage("Please enter the car you want to query！");
        return;
    }

    // 新的解析逻辑 - 更智能地处理包含空格的品牌和车型
    const parts = input.split(/\s+/);
    let results = [];

    // 尝试匹配带空格的品牌
    const possibleBrands = Object.keys(vehicleData);
    let matchedBrand = null;
    
    // 检查所有可能的品牌（包括带空格的）
    for (let i = parts.length; i >= 1; i--) {
        const brandCandidate = parts.slice(0, i).join(' ').toLowerCase();
        if (possibleBrands.includes(brandCandidate)) {
            matchedBrand = brandCandidate;
            parts.splice(0, i); // 移除已匹配的品牌部分
            break;
        }
    }

    // 剩余部分处理
    if (matchedBrand) {
        if (parts.length >= 2) {
            // 尝试匹配 品牌 车型 年份
            const year = parseInt(parts[parts.length - 1]);
            if (!isNaN(year) && year > 1900 && year < 2100) {
                const model = parts.slice(0, parts.length - 1).join(' ');
                results = searchFullMatch(matchedBrand, model, year);
            }
        }
        
        // 如果上面没找到，尝试 品牌 车型
        if (results.length === 0 && parts.length >= 1) {
            const model = parts.join(' ');
            results = searchBrandModel(matchedBrand, model);
        }
        
        // 如果还是没找到，尝试 品牌 年份
        if (results.length === 0 && parts.length === 1) {
            const year = parseInt(parts[0]);
            if (!isNaN(year) && year > 1900 && year < 2100) {
                results = searchBrandYear(matchedBrand, year);
            }
        }
    }

    // 如果没有匹配到品牌，尝试其他模式
    if (results.length === 0) {
        const patterns = [
            /^(.+?)\s(.+?)\s(\d{4})$/i,    // 品牌 车型 年份
            /^(.+?)\s(\d{4})$/i,          // 品牌 年份
            /^(.+?)\s(.+)$/i,             // 品牌 车型
            /^(.+)$/i                     // 单独品牌或车型
        ];

        let match;
        for (let pattern of patterns) {
            match = input.match(pattern);
            if (match) break;
        }

        if (match) {
            if (match[3]) {
                results = searchFullMatch(match[1], match[2], parseInt(match[3]));
            } else if (match[2] && !isNaN(match[2])) {
                results = searchBrandYear(match[1], parseInt(match[2]));
            } else if (match[2]) {
                results = searchBrandModel(match[1], match[2]);
            } else {
                const brandResults = searchBrand(match[1]);
                results = brandResults.length > 0 ? brandResults : searchModel(match[1]);
            }
        } else {
            results = searchFuzzy(input);
        }
    }

    // 如果还是没结果，尝试模糊搜索
    if (results.length === 0) {
        results = searchFuzzy(input);
    }

    displayResults(results, input);
};

// 修改 searchFullMatch 和 searchBrandModel 以处理带空格的车型
const searchFullMatch = (brandInput, modelInput, year) => {
    const brand = findBrand(brandInput);
    if (!brand) return [];
    
    return Object.entries(brand.models)
        .filter(([model, years]) => {
            // 标准化比较：忽略大小写和特殊字符
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
            // 标准化比较：忽略大小写和特殊字符
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

// 修改 findBrand 函数以处理带空格的品牌
const findBrand = (input) => {
    // 首先尝试直接匹配（包括带空格的品牌）
    const normalizedInput = input.toLowerCase();
    if (vehicleData[normalizedInput]) {
        return { name: normalizedInput, models: vehicleData[normalizedInput] };
    }
    
    // 尝试匹配包含空格的品牌变体
    for (const [brandKey, models] of Object.entries(vehicleData)) {
        const displayName = brandKey.replace(/-/g, ' ');
        if (normalizedInput === displayName.toLowerCase()) {
            return { name: brandKey, models: models };
        }
    }
    
    // 最后尝试模糊匹配
    for (const [brandKey, models] of Object.entries(vehicleData)) {
        if (brandKey.includes(normalizedInput.replace(/\s+/g, '-'))) {
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
                <p>The model you entered was not found "${query}"</p>
                <p>Please confirm that the input is correct and try again.</p>
                <p>Need help? Contact Customer Service:400-123-4567</p>
            </div>
        `;
        return;
    }
    
    // 构建结果HTML - 移除了数量限制
    let html = `
        <div class="match-item"><p>Your query matches the following models "${query}"</p></div>
    `;
    
    // 直接遍历所有结果，不再限制数量
    results.forEach(item => {
        const brandName = item.brand.replace(/-/g, ' ').toUpperCase();
        const modelName = item.model.toUpperCase();
        // 格式化年份显示
        const formattedYears = formatYears(item.years);

        html += `
            <div class="match-item">
                <strong>Brand:</strong>${brandName} <strong>Model:</strong>${modelName} <strong>Vehicle year:</strong>${formattedYears}
            </div>
        `;
    });
    
    // 添加提示信息（移除了数量限制的提示）
    html += `<div class="match-item">
        <p>A total of ${results.length} results were found</p>
        <p>Can't find your model? Please confirm and try again or contact customer service.</p>
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

// 优化年份格式化函数
const formatYears = (years) => {
    if (years.length === 0) return "All years compatible.";
    
    // 对年份排序
    const sortedYears = [...years].sort((a, b) => a - b);
    
    // 单个年份直接返回
    if (sortedYears.length === 1) {
        return sortedYears[0];
    }
    
    // 检查年份是否连续
    let isContinuous = true;
    for (let i = 1; i < sortedYears.length; i++) {
        if (sortedYears[i] !== sortedYears[i - 1] + 1) {
            isContinuous = false;
            break;
        }
    }
    
    // 根据连续性返回不同格式
    if (isContinuous) {
        return `${sortedYears[0]}-${sortedYears[sortedYears.length - 1]}`;
    } else {
        return sortedYears.join(", ");
    }
};
